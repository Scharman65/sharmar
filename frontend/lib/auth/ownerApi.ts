import { NextRequest, NextResponse } from "next/server";

import { OWNER_SESSION_COOKIE_NAME } from "@/app/api/auth/owner-session/cookies";

type JsonObject = Record<string, unknown>;

export type OwnerAuth = {
  userJwt: string;
  owner: {
    id: number;
    email: string;
    username: string | null;
  };
  ownerProfile: JsonObject | null;
};

export const NO_STORE_HEADERS = { "cache-control": "no-store" };

export function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

export function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    const headerToken = m?.[1]?.trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value?.trim();
  return cookieToken || null;
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();
  if (firstForwarded) return firstForwarded;

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  ).trim();
}

export async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function strapiFetchJson(
  path: string,
  init?: RequestInit,
  authToken?: string
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const headers = new Headers(init?.headers || {});
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${getStrapiBase()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  return { ok: res.ok, status: res.status, json: await readJson(res) };
}

export function jsonError(code: string, status: number, init?: { retryAfter?: number }) {
  return NextResponse.json(
    { ok: false, code, error: code },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        ...(init?.retryAfter ? { "Retry-After": String(init.retryAfter) } : {}),
      },
    }
  );
}

function decodeJwtIssuedAt(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as JsonObject;
    const iat = asNumber(payload.iat);
    return iat === null ? null : iat * 1000;
  } catch {
    return null;
  }
}

function sessionIsFresh(userJwt: string, ownerProfile: JsonObject | null): boolean {
  const changedAtRaw = asString(ownerProfile?.password_changed_at);
  if (!changedAtRaw) return true;

  const changedAt = Date.parse(changedAtRaw);
  const issuedAt = decodeJwtIssuedAt(userJwt);
  if (!Number.isFinite(changedAt) || issuedAt === null) return false;

  return issuedAt >= changedAt;
}

export async function getAuthenticatedOwner(req: NextRequest): Promise<
  | { ok: true; auth: OwnerAuth }
  | { ok: false; status: number; code: string }
> {
  const userJwt = getBearerToken(req);
  if (!userJwt) return { ok: false, status: 401, code: "missing_owner_session" };

  const me = await strapiFetchJson("/api/users/me", { method: "GET" }, userJwt);
  if (!me.ok || !isRecord(me.json)) {
    return { ok: false, status: 401, code: "owner_session_invalid" };
  }

  const id = asNumber(me.json.id);
  const email = asString(me.json.email);
  if (!id || !email) {
    return { ok: false, status: 401, code: "owner_session_invalid" };
  }

  const serverToken = getServerToken();
  let ownerProfile: JsonObject | null = null;

  if (serverToken) {
    const profileRes = await strapiFetchJson(`/api/owner/profile-by-user?user_id=${id}`, { method: "GET" }, serverToken);
    const profile = isRecord(profileRes.json) && isRecord(profileRes.json.profile) ? profileRes.json.profile : null;
    ownerProfile = profile;
  }

  if (!sessionIsFresh(userJwt, ownerProfile)) {
    return { ok: false, status: 401, code: "owner_session_expired" };
  }

  return {
    ok: true,
    auth: {
      userJwt,
      owner: {
        id,
        email,
        username: asString(me.json.username),
      },
      ownerProfile,
    },
  };
}

export async function requireAuthenticatedOwner(req: NextRequest): Promise<
  | { ok: true; auth: OwnerAuth }
  | { ok: false; response: NextResponse }
> {
  const auth = await getAuthenticatedOwner(req);
  if (!auth.ok) {
    return { ok: false, response: jsonError(auth.code, auth.status) };
  }
  return auth;
}
