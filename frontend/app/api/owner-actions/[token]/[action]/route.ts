import { NextResponse } from "next/server";
import { resend, BOOKING_FROM, BOOKING_TO } from "@/app/lib/email";
import { bookingConfirmedCustomerEmail, bookingDeclinedCustomerEmail } from "@/app/lib/emailTemplates";

type RouteCtx = {
  params: Promise<{
    token: string;
    action: string;
  }>;
};

type CustomerDecisionEmailPayload = {
  customerEmail: string;
  customerName: string;
  boatTitle: string;
  publicToken: string;
  slotStartUtc: string | null;
  slotEndUtc: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function findString(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) return null;

  for (const key of keys) {
    const direct = getString(value[key]);
    if (direct) return direct;
  }

  for (const nested of Object.values(value)) {
    if (isRecord(nested)) {
      const found = findString(nested, keys);
      if (found) return found;
    }
  }

  return null;
}

function extractCustomerDecisionEmailPayload(
  result: unknown,
  publicToken: string
): CustomerDecisionEmailPayload | null {
  const customerEmail = findString(result, ["customer_email", "clientEmail", "email"]);
  const customerName = findString(result, ["customer_name", "clientName", "full_name", "name"]);
  const boatTitle = findString(result, ["boat_title", "boatTitle", "title"]);

  if (!customerEmail || !customerName || !boatTitle) return null;

  return {
    customerEmail,
    customerName,
    boatTitle,
    publicToken,
    slotStartUtc: findString(result, ["slot_start_utc", "start_datetime", "start"]),
    slotEndUtc: findString(result, ["slot_end_utc", "end_datetime", "end"]),
  };
}

async function loadCustomerDecisionPayload(
  base: string,
  publicToken: string,
  apiToken: string
): Promise<CustomerDecisionEmailPayload | null> {
  if (!apiToken) return null;

  const qs = new URLSearchParams();
  qs.set("filters[public_token][$eq]", publicToken);
  qs.set("pagination[pageSize]", "1");
  qs.append("fields[0]", "full_name");
  qs.append("fields[1]", "email");
  qs.append("fields[2]", "start_datetime");
  qs.append("fields[3]", "end_datetime");
  qs.append("fields[4]", "public_token");
  qs.append("populate[boat][fields][0]", "title");
  qs.append("populate[boat][fields][1]", "name");
  qs.append("populate[boat][fields][2]", "slug");

  const res = await fetch(`${String(base).replace(/\/+$/, "")}/api/booking-requests?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!res.ok) return null;

  const parsed: unknown = await res.json();
  if (!isRecord(parsed) || !Array.isArray(parsed.data) || parsed.data.length === 0) return null;

  const first = parsed.data[0];
  if (!isRecord(first)) return null;

  const customerEmail = findString(first, ["email"]);
  const customerName = findString(first, ["full_name", "customer_name", "name"]);
  const boatTitle =
    findString(first.boat, ["title", "name", "slug"]) ||
    findString(first, ["boat_title", "boatTitle", "title", "name", "slug"]);

  if (!customerEmail || !customerName || !boatTitle) return null;

  return {
    customerEmail,
    customerName,
    boatTitle,
    publicToken: findString(first, ["public_token"]) || publicToken,
    slotStartUtc: findString(first, ["start_datetime", "slot_start_utc", "start"]),
    slotEndUtc: findString(first, ["end_datetime", "slot_end_utc", "end"]),
  };
}

async function sendCustomerDecisionEmail(
  action: string,
  payload: CustomerDecisionEmailPayload
): Promise<void> {
  if (!resend) return;

  const normalizedAction = String(action || "").trim().toLowerCase();
  const template =
    normalizedAction === "confirm"
      ? bookingConfirmedCustomerEmail
      : normalizedAction === "decline"
        ? bookingDeclinedCustomerEmail
        : null;

  if (!template) return;

  const mail = template({
    locale: emailLocale,
    boatTitle: payload.boatTitle,
    customerName: payload.customerName,
    publicToken: payload.publicToken,
    start: payload.slotStartUtc,
    end: payload.slotEndUtc,
    supportEmail: BOOKING_TO,
    supportNote: "If you have questions, reply to this email or contact Sharmar support.",
  });

  await resend.emails.send({
    from: BOOKING_FROM,
    to: payload.customerEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

function getActionPath(action: string, token: string): string | null {
  const a = String(action || "").trim().toLowerCase();
  const cleanToken = encodeURIComponent(token);

  if (a === "confirm") return `/api/booking-requests/${cleanToken}/owner-confirm`;
  if (a === "decline") return `/api/booking-requests/${cleanToken}/owner-decline`;
  if (a === "refund") return "owner-refund";

  return null;
}

const emailLocale = "en";

export async function POST(_req: Request, ctx: RouteCtx) {
  const { token, action } = await ctx.params;

  const cleanToken = String(token || "").trim();
  const mapped = getActionPath(action, cleanToken);

  if (!cleanToken) {
    return json(400, { ok: false, error: "missing_token" });
  }

  if (!mapped) {
    return json(400, { ok: false, error: "invalid_action" });
  }

  const base =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me";

  const ownerSecret = String(process.env.SHARMAR_OWNER_ACTION_TOKEN || "").trim();
  const apiToken = String(process.env.STRAPI_TOKEN || "").trim();

  if (!ownerSecret) {
    return json(500, { ok: false, error: "missing_owner_action_token" });
  }

  const url = mapped === "owner-refund"
    ? `${String(base).replace(/\/+$/, "")}/api/booking-requests/${encodeURIComponent(cleanToken)}/${mapped}`
    : `${String(base).replace(/\/+$/, "")}${mapped}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Owner-Action-Token": ownerSecret,
      },
      body: JSON.stringify({}),
    });

    const text = await res.text();

    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      return json(res.status, {
        ok: false,
        error: "owner_action_failed",
        upstream_status: res.status,
        upstream: parsed,
      });
    }

    let customerNotificationPayload = extractCustomerDecisionEmailPayload(parsed, cleanToken);

    if (!customerNotificationPayload) {
      try {
        customerNotificationPayload = await loadCustomerDecisionPayload(base, cleanToken, apiToken);
      } catch (e) {
        console.warn("CUSTOMER_DECISION_PAYLOAD_LOAD_FAILED", e);
      }
    }

    const normalizedAction = String(action || "").trim().toLowerCase();

    if ((normalizedAction === "confirm" || normalizedAction === "decline") && customerNotificationPayload) {
      try {
        await sendCustomerDecisionEmail(normalizedAction, customerNotificationPayload);
      } catch (e) {
        console.warn("CUSTOMER_DECISION_EMAIL_SEND_FAILED", e);
      }
    }

    return json(200, {
      ok: true,
      action: mapped,
      token: cleanToken,
      customerNotificationPayload,
      result: parsed,
    });
  } catch (err) {
    return json(500, {
      ok: false,
      error: "owner_action_proxy_error",
      details: String(err),
    });
  }
}
