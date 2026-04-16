import { NextResponse } from "next/server";

type RouteCtx = {
  params: Promise<{
    token: string;
    action: string;
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

function getActionPath(action: string): string | null {
  const a = String(action || "").trim().toLowerCase();

  if (a === "confirm") return "owner-confirm";
  if (a === "decline") return "owner-decline";
  if (a === "refund") return "owner-refund";

  return null;
}

export async function POST(_req: Request, ctx: RouteCtx) {
  const { token, action } = await ctx.params;

  const cleanToken = String(token || "").trim();
  const mapped = getActionPath(action);

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

  if (!ownerSecret) {
    return json(500, { ok: false, error: "missing_owner_action_token" });
  }

  const url = `${String(base).replace(/\/+$/, "")}/api/booking-requests/${encodeURIComponent(cleanToken)}/${mapped}`;

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

    return json(200, {
      ok: true,
      action: mapped,
      token: cleanToken,
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
