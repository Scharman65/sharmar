import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    const headerToken = m?.[1]?.trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = req.cookies.get("sharmar_owner_session")?.value?.trim();
  return cookieToken || null;
}

async function strapiJson(path: string, authToken?: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { ok: res.ok, status: res.status, json };
}

export async function GET(req: NextRequest) {
  const userJwt = getBearerToken(req);

  if (!userJwt) {
    return NextResponse.json(
      { ok: false, error: "Missing Authorization Bearer token" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const me = await strapiJson("/api/users/me", userJwt);

  if (!me.ok || !isRecord(me.json) || typeof me.json.email !== "string") {
    return NextResponse.json(
      { ok: false, error: "User authentication failed" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const ownerId =
    typeof me.json.id === "number"
      ? me.json.id
      : Number(me.json.id || 0);

  const serverToken = getServerToken();

  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const boats = await strapiJson(
    `/api/boats?populate=cover&sort=createdAt:desc&pagination[pageSize]=100`,
    serverToken
  );

  if (!boats.ok) {
    console.error("OWNER_MY_BOATS_STRAPI_ERROR", {
      status: boats.status,
      details: boats.json,
    });

    return NextResponse.json(
      { ok: false, error: "Could not load owner boats", status: boats.status, details: boats.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const allBoats = isRecord(boats.json) && Array.isArray(boats.json.data) ? boats.json.data : [];

  const ownerBoats = allBoats.filter((boat) => {
    if (!isRecord(boat)) return false;

    const createdById =
      typeof boat.created_by_id === "number"
        ? boat.created_by_id
        : Number(boat.created_by_id || 0);

    return createdById === ownerId;
  });

  return NextResponse.json(
    {
      ok: true,
      owner: {
        id: typeof me.json.id === "number" ? me.json.id : null,
        username: typeof me.json.username === "string" ? me.json.username : null,
        email: typeof me.json.email === "string" ? me.json.email : null,
      },
      boats: ownerBoats,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
