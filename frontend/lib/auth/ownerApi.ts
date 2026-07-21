import { NextRequest, NextResponse } from "next/server";

import { OWNER_SESSION_COOKIE_NAME, parseOwnerSessionCookie } from "@/app/api/auth/owner-session/cookies";
import { getOwnerInternalToken } from "@/lib/auth/ownerInternalAuth";

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

  const cookieSession = parseOwnerSessionCookie(req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value);
  return cookieSession?.token || null;
}

function getCookieSessionVersion(req: NextRequest): number | null {
  const cookieSession = parseOwnerSessionCookie(req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value);
  return cookieSession?.sessionVersion ?? null;
}

export function getClientIp(req: NextRequest): string {
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for") || "";
  const firstVercelForwarded = vercelForwardedFor.split(",")[0]?.trim();
  if (firstVercelForwarded) return firstVercelForwarded;

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
    return iat === null ? null : iat;
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

  return issuedAt >= Math.floor(changedAt / 1000);
}

function sessionVersionIsFresh(req: NextRequest, ownerProfile: JsonObject): boolean {
  const currentVersion = asNumber(ownerProfile.session_version) ?? 0;
  const cookieVersion = getCookieSessionVersion(req);
  if (currentVersion <= 0 && cookieVersion === null) return true;
  return cookieVersion === currentVersion;
}

export function ownerMustChangePassword(ownerProfile: JsonObject | null): boolean {
  return ownerProfile?.must_change_password === true;
}

export function ownerProfileArchived(ownerProfile: JsonObject | null): boolean {
  return Boolean(asString(ownerProfile?.archived_at));
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

  const serverToken = getOwnerInternalToken();
  if (!serverToken) {
    return { ok: false, status: 503, code: "owner_profile_unavailable" };
  }

  const profileRes = await strapiFetchJson(`/api/owner/profile-by-user?user_id=${id}`, { method: "GET" }, serverToken);
  if (!profileRes.ok) {
    return { ok: false, status: 503, code: "owner_profile_unavailable" };
  }
  const ownerProfile = isRecord(profileRes.json) && isRecord(profileRes.json.profile) ? profileRes.json.profile : null;
  if (!ownerProfile) {
    return { ok: false, status: 401, code: "owner_profile_missing" };
  }

  if (!sessionIsFresh(userJwt, ownerProfile)) {
    return { ok: false, status: 401, code: "owner_session_expired" };
  }

  if (!sessionVersionIsFresh(req, ownerProfile)) {
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
