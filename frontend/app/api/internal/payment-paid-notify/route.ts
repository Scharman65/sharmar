import { resend, BOOKING_FROM, BOOKING_TO } from "@/app/lib/email";
import { bookingCustomerRequestEmail } from "@/app/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sharmar-Route": "internal_payment_paid_notify_v1",
    },
  });
}

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function getNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function unwrapData(jsonValue: unknown): unknown[] {
  if (!isRecord(jsonValue)) return [];
  const data = jsonValue.data;
  return Array.isArray(data) ? data : [];
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
  const text = await res.text();

  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const msg = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`Strapi ${init?.method ?? "GET"} failed: ${res.status} ${res.statusText} ${msg}`);
  }

  return parsed;
}

async function loadBookingRequest(bookingRequestId: number): Promise<JsonRecord | null> {
  const qs = new URLSearchParams();
  qs.set("filters[id][$eq]", String(bookingRequestId));
  qs.set("populate[boat][fields][0]", "title");
  qs.set("populate[boat][fields][1]", "slug");
  qs.set("pagination[pageSize]", "1");

  const result = await strapiFetch(`/api/booking-requests?${qs.toString()}`);
  const rows = unwrapData(result);
  const first = rows[0];

  return isRecord(first) ? first : null;
}

function getBoatFromBookingRequest(br: JsonRecord): JsonRecord | null {
  const direct = br.boat;
  if (isRecord(direct)) return direct;

  const attrs = br.attributes;
  if (isRecord(attrs) && isRecord(attrs.boat)) return attrs.boat;

  return null;
}

function getField(row: JsonRecord, key: string): unknown {
  if (key in row) return row[key];

  const attrs = row.attributes;
  if (isRecord(attrs) && key in attrs) return attrs[key];

  return undefined;
}

export async function POST(req: Request) {
  const expectedSecret = (process.env.SHARMAR_INTERNAL_NOTIFY_SECRET || "").trim();
  const gotSecret = (req.headers.get("x-sharmar-internal-secret") || "").trim();

  if (!expectedSecret || !gotSecret || gotSecret !== expectedSecret) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  if (!isRecord(body)) {
    return json(400, { ok: false, error: "invalid_body" });
  }

  const bookingRequestId = getNum(body.booking_request_id);
  const locale = getStr(body.locale) || "en";

  if (!bookingRequestId) {
    return json(400, { ok: false, error: "invalid_booking_request_id" });
  }

  const result = {
    ok: true,
    booking_request_id: bookingRequestId,
    customer_email_sent: false,
    warnings: [] as string[],
  };

  if (!resend) {
    result.warnings.push("resend_not_configured");
    return json(200, result);
  }

  const br = await loadBookingRequest(bookingRequestId);

  if (!br) {
    return json(404, { ok: false, error: "booking_request_not_found", booking_request_id: bookingRequestId });
  }

  const boat = getBoatFromBookingRequest(br);

  const publicToken = getStr(getField(br, "public_token"));
  const customerName = getStr(getField(br, "full_name")) || "Customer";
  const customerPhone = getStr(getField(br, "phone"));
  const customerEmail = getStr(getField(br, "email"));
  const start = getStr(getField(br, "start_datetime"));
  const end = getStr(getField(br, "end_datetime"));
  const people = getNum(getField(br, "people_count"));
  const skipper = Boolean(getField(br, "need_skipper"));
  const notes = getStr(getField(br, "notes"));

  const boatTitle =
    getStr(boat?.title) ||
    (isRecord(boat?.attributes) ? getStr(boat.attributes.title) : "") ||
    "Sharmar boat";

  if (customerEmail) {
    try {
      const mail = bookingCustomerRequestEmail({
        locale,
        boatTitle,
        customerName,
        start,
        end,
        publicToken,
        supportEmail: BOOKING_TO,
        supportNote: "Your payment has been received. The owner will review your reservation request.",
      });

      await resend.emails.send({
        from: BOOKING_FROM,
        to: customerEmail,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });

      result.customer_email_sent = true;
    } catch (e) {
      result.warnings.push(`customer_email_failed:${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    result.warnings.push("customer_email_missing");
  }

  return json(200, result);
}
