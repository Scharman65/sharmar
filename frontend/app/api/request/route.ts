import { NextResponse } from "next/server";
import { resend, BOOKING_FROM, BOOKING_TO } from "@/app/lib/email";
import { bookingAdminEmail } from "@/app/lib/emailTemplates";

type JsonObj = Record<string, unknown>;

type Payload = {
  boatSlug: string;
  boatTitle: string;
  name: string;
  phone: string;
  email?: string;
  dateFrom: string;
  dateTo: string;
  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;
};

function isRecord(x: unknown): x is JsonObj {
  return typeof x === "object" && x !== null;
}

function getStr(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

function getBool(x: unknown): boolean | null {
  return typeof x === "boolean" ? x : null;
}

function getNum(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function parsePayload(body: unknown): { ok: true; data: Payload } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Invalid JSON body" };

  const boatSlug = getStr(body.boatSlug);
  const boatTitle = getStr(body.boatTitle);
  const name = getStr(body.name);
  const phone = getStr(body.phone);
  const dateFrom = getStr(body.dateFrom);
  const dateTo = getStr(body.dateTo);

  if (!boatSlug || !boatTitle || !name || !phone || !dateFrom || !dateTo) {
    return { ok: false, error: "Missing required fields" };
  }

  const email = getStr(body.email) ?? undefined;
  const message = getStr(body.message) ?? undefined;

  const peopleCount = getNum(body.peopleCount) ?? undefined;
  const needSkipper = getBool(body.needSkipper) ?? undefined;

  return {
    ok: true,
    data: {
      boatSlug,
      boatTitle,
      name,
      phone,
      email,
      dateFrom,
      dateTo,
      peopleCount,
      needSkipper,
      message,
    },
  };
}

function toIsoFromDate(date: string, hour: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${String(hour).padStart(2, "0")}:00:00.000Z`;
  return iso;
}

function buildFallbackMailto(p: Payload): string {
  const subject = `Boat request: ${p.boatTitle}`;
  const bodyLines = [
    `Boat: ${p.boatTitle}`,
    `Slug: ${p.boatSlug}`,
    `Name: ${p.name}`,
    `Phone: ${p.phone}`,
    p.email ? `Email: ${p.email}` : null,
    `From: ${p.dateFrom}`,
    `To: ${p.dateTo}`,
    p.peopleCount != null ? `People: ${p.peopleCount}` : null,
    p.needSkipper != null ? `Need skipper: ${p.needSkipper ? "yes" : "no"}` : null,
    p.message ? `Message: ${p.message}` : null,
  ].filter((x): x is string => Boolean(x));

  const url =
    "mailto:booking@sharmar.local" +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyLines.join("\n"))}`;

  return url;
}

async function strapiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const base = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
  const token = process.env.STRAPI_TOKEN ?? "";

  const url = new URL(path, base);
  const headers: Record<string, string> = {
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    "content-type": "application/json",
  };

  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), { ...init, headers, cache: "no-store" });

  const txt = await res.text();
  let json: unknown = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = txt;
  }

  if (!res.ok) {
    const msg = typeof json === "string" ? json : JSON.stringify(json);
    throw new Error(`Strapi ${init?.method ?? "GET"} failed: ${res.status} ${res.statusText} ${msg}`);
  }

  return json;
}

async function getBoatIdBySlug(slug: string): Promise<number | null> {
  const qs = new URLSearchParams();
  qs.set("filters[slug][$eq]", slug);
  qs.append("fields[0]", "id");

  const json = await strapiFetch(`/api/boats?${qs.toString()}`);

  if (!isRecord(json)) return null;
  const data = json.data;

  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];

  if (!isRecord(first)) return null;
  const id = getNum(first.id);
  return id ?? null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const p = parsed.data;

  const start = toIsoFromDate(p.dateFrom, 10);
  const end = toIsoFromDate(p.dateTo, 10);

  if (!start || !end) {
    return NextResponse.json(
      { ok: false, error: "Invalid dates. Use YYYY-MM-DD.", fallbackMailto: buildFallbackMailto(p) },
      { status: 400 }
    );
  }

  try {
    const boatId = await getBoatIdBySlug(p.boatSlug);

    if (!boatId) {
      return NextResponse.json(
        { ok: false, error: `Boat not found by slug: ${p.boatSlug}`, fallbackMailto: buildFallbackMailto(p) },
        { status: 404 }
      );
    }

    const people = p.peopleCount && p.peopleCount >= 1 ? Math.floor(p.peopleCount) : 1;

    const createBody = {
      data: {
        full_name: p.name,
        phone: p.phone,
        email: p.email ?? null,
        start_datetime: start,
        end_datetime: end,
        people_count: people,
        need_skipper: Boolean(p.needSkipper),
        notes: p.message ?? null,
        boat: boatId,
      },
    };

    const json = await strapiFetch("/api/booking-requests", {
      method: "POST",
      body: JSON.stringify(createBody),
    });

    if (!isRecord(json) || !isRecord(json.data)) {
      return NextResponse.json({ ok: true, id: 0 }, { status: 200 });
    }

    const id = getNum(json.data.id) ?? 0;

    if (id > 0 && BOOKING_TO && resend) {
      try {
        const mail = bookingAdminEmail({
          id,
          boatTitle: p.boatTitle || p.boatSlug,
          boatSlug: p.boatSlug,
          name: p.name,
          phone: p.phone,
          email: p.email || undefined,
          start,
          end,
          people,
          skipper: Boolean(p.needSkipper),
          notes: p.message || undefined,
        });

        await resend.emails.send({
          from: BOOKING_FROM,
          to: BOOKING_TO,
          subject: mail.subject,
          text: mail.text,
        });
      } catch (e) {
        console.error("EMAIL_SEND_FAILED", e);
      }
    }
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e), fallbackMailto: buildFallbackMailto(p) },
      { status: 500 }
    );
  }
}
