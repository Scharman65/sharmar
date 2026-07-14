import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedOwner } from "@/lib/auth/ownerApi";

type JsonObject = Record<string, unknown>;

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error(
      "STRAPI_URL is not configured"
    );
  }

  return configured.replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
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
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  const me = auth.auth.owner;
  const ownerId = me.id;

  const serverToken = getServerToken();

  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const boats = await strapiJson(
    `/api/owner/boats-by-user?user_id=${ownerId}`,
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

  const ownerBoats = isRecord(boats.json) && Array.isArray(boats.json.boats) ? boats.json.boats : [];

  return NextResponse.json(
    {
      ok: true,
      owner: {
        id: me.id,
        username: me.username,
        email: me.email,
      },
      boats: ownerBoats,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
