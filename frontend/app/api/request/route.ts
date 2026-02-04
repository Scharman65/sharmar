import { NextResponse } from "next/server";
import { resend, BOOKING_FROM, BOOKING_TO } from "@/app/lib/email";
import { bookingAdminEmail } from "@/app/lib/emailTemplates";
import crypto from "node:crypto";

type JsonObj = Record<string, unknown>;

type Payload = {
  boatSlug: string;
  boatTitle: string;
  name: string;
  phone: string;
  email?: string;
  dateFrom: string;
  dateTo: string;
  timeFrom?: string;
  timeTo?: string;
  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;
  publicToken?: string;
  hp?: string;
  client_ts?: number;
};

function logBookingEvent(e: Record<string, unknown>): void {
  try {
    console.log(JSON.stringify({ tag: "booking_request", ...e }));
  } catch {
    console.log("booking_request", e);
  }
}

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

function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v.trim());
}

function toUtcIsoFromLocal(date: string, time: string, tz: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!dm) return null;
  if (!isValidTime(time)) return null;

  const y = Number(dm[1]);
  const m = Number(dm[2]);
  const d = Number(dm[3]);
  const hh = Number(time.slice(0, 2));
  const mm = Number(time.slice(3, 5));

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(guess);
  const pick = (t: string) => parts.find((x) => x.type === t)?.value;

  const ly = Number(pick("year"));
  const lmo = Number(pick("month"));
  const ld = Number(pick("day"));
  const lh = Number(pick("hour"));
  const lmin = Number(pick("minute"));
  const lsec = Number(pick("second"));

  if (![ly, lmo, ld, lh, lmin, lsec].every((x) => Number.isFinite(x))) return null;

  const shownAsUtc = Date.UTC(ly, lmo - 1, ld, lh, lmin, lsec, 0);
  const offsetMs = shownAsUtc - guess.getTime();

  const desiredLocalAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const corrected = new Date(desiredLocalAsUtc - offsetMs);

  return corrected.toISOString();
}

function parsePayload(body: unknown): { ok: true; data: Payload } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Invalid JSON body" };

  const boatSlug = getStr(body.boatSlug);
  const boatTitle = getStr(body.boatTitle);
  const name = getStr(body.name);
  const phone = getStr(body.phone);
  const dateFrom = getStr(body.dateFrom);
  const dateTo = getStr(body.dateTo);
  const timeFrom = getStr(body.timeFrom);
  const timeTo = getStr(body.timeTo);

  if (!boatSlug || !boatTitle || !name || !phone || !dateFrom || !dateTo) {
    return { ok: false, error: "Missing required fields" };
  }

  if (timeFrom != null && !isValidTime(timeFrom)) return { ok: false, error: "Invalid timeFrom. Use HH:MM." };
  if (timeTo != null && !isValidTime(timeTo)) return { ok: false, error: "Invalid timeTo. Use HH:MM." };

  const rawEmail = getStr(body.email);
  const rawMessage = getStr(body.message);

  const email = rawEmail && rawEmail.trim().length ? rawEmail.trim() : undefined;
  const message = rawMessage && rawMessage.trim().length ? rawMessage.trim() : undefined;

  const peopleCount = getNum(body.peopleCount) ?? undefined;
  const needSkipper = getBool(body.needSkipper) ?? undefined;

  const publicToken =
    typeof body.publicToken === "string" && body.publicToken.trim().length ? body.publicToken.trim() : undefined;

  const hp = typeof body.hp === "string" ? body.hp : undefined;
  const client_ts = getNum(body.client_ts) ?? undefined;

  return {
    ok: true,
    data: {
      boatSlug,
      boatTitle,
      name: name.trim(),
      phone: phone.trim(),
      email,
      dateFrom,
      dateTo,
      timeFrom: timeFrom ?? undefined,
      timeTo: timeTo ?? undefined,
      peopleCount,
      needSkipper,
      message,
      publicToken,
      hp,
      client_ts,
    },
  };
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

  const to = (process.env.BOOKING_FALLBACK_EMAIL ?? "booking@sharmar.me").trim();

  return "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
}

function firstIpFromXff(xff: string): string | null {
  const first = xff.split(",")[0]?.trim();
  if (!first) return null;
  const v = first.replace(/^\[|\]$/g, "").trim();
  return v.length ? v : null;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const ip = firstIpFromXff(xff);
    if (ip) return ip;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri && xri.trim().length) return xri.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.trim().length) return cf.trim();
  return null;
}

async function strapiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const base = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
  const apiToken = process.env.STRAPI_TOKEN ?? "";

  const url = new URL(path, base);
  const headers: Record<string, string> = {
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
    "content-type": "application/json",
  };

  if (apiToken) headers.authorization = `Bearer ${apiToken}`;

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

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractIdFromStrapiResponse(json: unknown): number {
  if (!isObjectRecord(json)) return 0;

  const id1 = Number(json["id"]);
  if (Number.isFinite(id1) && id1 > 0) return id1;

  const data = json["data"];
  if (isObjectRecord(data)) {
    const id2 = Number(data["id"]);
    if (Number.isFinite(id2) && id2 > 0) return id2;

    const inner = data["data"];
    if (isObjectRecord(inner)) {
      const id3 = Number(inner["id"]);
      if (Number.isFinite(id3) && id3 > 0) return id3;
    }
  }

  return 0;
}

async function getBoatIdBySlug(slug: string): Promise<number | null> {
  const qs = new URLSearchParams();
  qs.set("filters[slug][$eq]", slug);
  qs.append("fields[0]", "id");

  const json = await strapiFetch(`/api/boats?${qs.toString()}`);

  if (!isRecord(json)) return null;
  const data = (json as any).data;

  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];

  if (!isRecord(first)) return null;
  const id = getNum((first as any).id);
  return id ?? null;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logBookingEvent({ request_id: requestId, result: "bad_request", http_status: 400, latency_ms: Date.now() - t0, error_class: "InvalidJSON" });
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const parsed = parsePayload(body);
  if (!parsed.ok) {
    logBookingEvent({ request_id: requestId, result: "bad_request", http_status: 400, latency_ms: Date.now() - t0, error_class: "ValidationError" });
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const p = parsed.data;

  const publicToken = p.publicToken && p.publicToken.length ? p.publicToken : crypto.randomUUID();

  // Anti-spam: honeypot + minimum fill time. Silent drop with 200 OK to avoid signaling.
  const hp = typeof p.hp === "string" ? p.hp.trim() : "";
  if (hp.length) {
    logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "spam_drop", http_status: 200, latency_ms: Date.now() - t0, reason: "honeypot" });
    return NextResponse.json({ ok: true, id: 0, token: publicToken }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const clientTs = typeof p.client_ts === "number" && Number.isFinite(p.client_ts) ? p.client_ts : null;
  if (clientTs != null) {
    const delta = Date.now() - clientTs;
    if (Number.isFinite(delta) && delta >= 0 && delta < 1200) {
      logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "spam_drop", http_status: 200, latency_ms: Date.now() - t0, reason: "too_fast", delta_ms: delta });
      return NextResponse.json({ ok: true, id: 0, token: publicToken }, { status: 200, headers: { "cache-control": "no-store" } });
    }
  }

  const bookingTz = process.env.BOOKING_TZ ?? "Europe/Podgorica";
  const tf = p.timeFrom && isValidTime(p.timeFrom) ? p.timeFrom : "10:00";
  const tt = p.timeTo && isValidTime(p.timeTo) ? p.timeTo : "14:00";

  const start = toUtcIsoFromLocal(p.dateFrom, tf, bookingTz);
  const end = toUtcIsoFromLocal(p.dateTo, tt, bookingTz);

  if (!start || !end) {
    logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "bad_request", http_status: 400, latency_ms: Date.now() - t0, error_class: "InvalidDatesTimes" });
    return NextResponse.json(
      { ok: false, error: "Invalid dates/times. Use YYYY-MM-DD and HH:MM.", fallbackMailto: buildFallbackMailto(p) },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  if (new Date(end).getTime() <= new Date(start).getTime()) {
    logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "bad_request", http_status: 400, latency_ms: Date.now() - t0, error_class: "InvalidTimeRange" });
    return NextResponse.json(
      { ok: false, error: "Invalid time range (end must be after start).", fallbackMailto: buildFallbackMailto(p) },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const boatId = await getBoatIdBySlug(p.boatSlug);

    if (!boatId) {
      logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "not_found", http_status: 404, latency_ms: Date.now() - t0, error_class: "BoatNotFound" });
      return NextResponse.json(
        { ok: false, error: `Boat not found by slug: ${p.boatSlug}`, fallbackMailto: buildFallbackMailto(p) },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    const people = p.peopleCount && p.peopleCount >= 1 ? Math.floor(p.peopleCount) : 1;

    const createBody = {
      data: {
        full_name: p.name,
        phone: p.phone,
        email: p.email && p.email.trim().length ? p.email.trim() : null,
        start_datetime: start,
        end_datetime: end,
        people_count: people,
        need_skipper: Boolean(p.needSkipper),
        notes: p.message && p.message.trim().length ? p.message.trim() : null,
        boat: boatId,

        status: "new",
        public_token: publicToken,

        contact_method: "phone",

        fingerprint: null,
        source_ip: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      },
    };

    const json = await strapiFetch("/api/request", {
      method: "POST",
      body: JSON.stringify(createBody),
    });

    const id = extractIdFromStrapiResponse(json);

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

    logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "ok", http_status: 200, latency_ms: Date.now() - t0, id });
    return NextResponse.json({ ok: true, id, token: publicToken }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e) {
    const errorClass =
      typeof e === "object" && e !== null && "name" in e && typeof (e as any).name === "string" ? String((e as any).name) : "Error";
    logBookingEvent({ request_id: requestId, public_token: publicToken, boat_slug: p.boatSlug, result: "error", http_status: 500, latency_ms: Date.now() - t0, error_class: errorClass });
    return NextResponse.json(
      { ok: false, error: String(e), fallbackMailto: buildFallbackMailto(p) },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
