import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOwner as getFreshOwnerAuth, isRecord, strapiFetchJson as ownerStrapiFetchJson } from "@/lib/auth/ownerApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function proxyJson(path: string, init?: RequestInit) {
  const token = getServerToken();

  const res = await fetch(`${getStrapiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

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

async function ownerOwnsBoat(req: NextRequest, boatId: string): Promise<boolean> {
  const auth = await getFreshOwnerAuth(req);
  if (!auth.ok) return false;
  const token = getServerToken();
  if (!token) return false;
  const res = await ownerStrapiFetchJson(`/api/owner/boats-by-user?user_id=${auth.auth.owner.id}`, { method: "GET" }, token);
  const boats = isRecord(res.json) && Array.isArray(res.json.boats) ? res.json.boats : [];
  return boats.some((boat) => isRecord(boat) && String(boat.id) === String(boatId));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const boatId = url.searchParams.get("boat_id") || "";
  const token = url.searchParams.get("token") || "";

  const qs = new URLSearchParams();
  if (boatId) qs.set("boat_id", boatId);
  if (token) qs.set("token", token);

  if (!boatId && !token) {
    return json(400, { ok: false, error: "boat_id_or_token_required" });
  }

  if (boatId && !(await ownerOwnsBoat(req, boatId))) {
    return json(403, { ok: false, error: "boat_not_found_for_owner" });
  }

  return proxyJson(`/api/owner/blackouts?${qs.toString()}`);
}

export async function POST(req: NextRequest) {
  let body: unknown = null;

  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const boatId = isRecord(body) ? String(body.boat_id || "").trim() : "";
  const token = isRecord(body) ? String(body.token || "").trim() : "";
  if (boatId && !(await ownerOwnsBoat(req, boatId))) {
    return json(403, { ok: false, error: "boat_not_found_for_owner" });
  }
  if (!boatId && !token) {
    return json(400, { ok: false, error: "boat_id_or_token_required" });
  }

  return proxyJson("/api/owner/blackouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
