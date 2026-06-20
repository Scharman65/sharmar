import { NextResponse } from "next/server";

type RouteCtx = {
  params: Promise<{
    token: string;
  }>;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    return json(400, { ok: false, error: "missing_token" });
  }

  const base =
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me";

  const url = `${String(base).replace(/\/+$/, "")}/api/booking-requests/${encodeURIComponent(cleanToken)}/status`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
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
        error: "booking_status_failed",
        upstream_status: res.status,
        upstream: parsed,
      });
    }

    return json(200, parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : { ok: false, upstream: parsed });
  } catch (err) {
    return json(500, {
      ok: false,
      error: "booking_status_proxy_error",
      details: String(err),
    });
  }
}
