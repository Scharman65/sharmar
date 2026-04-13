import crypto from "crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, obj: unknown, extra?: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sharmar-Route": "app_api_payments_intent_proxy_v1",
    },
  });
}

function passthrough(status: number, body: string, contentType: string | null, extra?: Record<string, string>) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sharmar-Route": "app_api_payments_intent_proxy_v1",
    },
  });
}


export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Allow": "POST, OPTIONS",
      "X-Sharmar-Route": "app_api_payments_intent_proxy_v1",
    },
  });
}

export async function POST(req: Request) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const public_token = body?.public_token;
  if (typeof public_token !== "string" || public_token.trim().length < 8) {
    return json(400, { error: "invalid_public_token" });
  }

  const rawBase =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "http://localhost:1337";

  const STRAPI_BASE = String(rawBase).replace(/\/+$/, "");

  const incomingIdk =
    req.headers.get("idempotency-key") ||
    req.headers.get("x-idempotency-key") ||
    "";

  const idk = String(incomingIdk).trim() || `local_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

  try {
    const upstream = await fetch(`${STRAPI_BASE}/api/payments/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idk,
      },
      cache: "no-store",
      body: JSON.stringify({ public_token: public_token.trim() }),
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type");

    return passthrough(upstream.status, text, ct, {
      "X-Sharmar-Strapi-Base": STRAPI_BASE,
      "X-Sharmar-Idempotency-Key": idk,
    });
  } catch (e: any) {
    const detail =
      e && (e.stack || e.message) ? String(e.stack || e.message) : String(e);

    return json(
      502,
      { error: "payments_intent_proxy_failed", STRAPI_BASE, detail },
      { "X-Sharmar-Strapi-Base": STRAPI_BASE, "X-Sharmar-Idempotency-Key": idk }
    );
  }
}
