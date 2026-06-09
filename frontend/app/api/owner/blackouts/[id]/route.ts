import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = {
  params: Promise<{
    id: string;
  }>;
};

function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_TOKEN || "").trim();
}

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Sharmar-Route": "owner_blackouts_proxy_v1",
    },
  });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const cleanId = String(id || "").trim();

  if (!cleanId) {
    return json(400, { ok: false, error: "valid_id_required" });
  }

  const url = new URL(req.url);
  const boatId = url.searchParams.get("boat_id") || "";
  const token = url.searchParams.get("token") || "";

  const qs = new URLSearchParams();
  if (boatId) qs.set("boat_id", boatId);
  if (token) qs.set("token", token);

  if (!boatId && !token) {
    return json(400, { ok: false, error: "boat_id_or_token_required" });
  }

  const serverToken = getServerToken();

  const res = await fetch(
    `${getStrapiBase()}/api/owner/blackouts/${encodeURIComponent(cleanId)}?${qs.toString()}`,
    {
      method: "DELETE",
      headers: {
        ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {}),
      },
      cache: "no-store",
    }
  );

  const text = await res.text();

  try {
    return json(res.status, text ? JSON.parse(text) : null);
  } catch {
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Sharmar-Route": "owner_blackouts_proxy_v1",
      },
    });
  }
}
