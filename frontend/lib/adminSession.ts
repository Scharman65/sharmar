import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "sharmar_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type AdminPermission = "dashboard" | "translation" | "moderation";

export type AdminSession = {
  permissions: AdminPermission[];
  expiresAt: number;
};

type AdminCredential = {
  token: string;
  permissions: AdminPermission[];
};

type SessionPayload = {
  v: 1;
  exp: number;
  permissions: AdminPermission[];
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64url(input: string): string {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function uniquePermissions(permissions: AdminPermission[]): AdminPermission[] {
  return Array.from(new Set(permissions));
}

function configuredCredentials(): AdminCredential[] {
  const translationToken = String(process.env.ADMIN_TRANSLATION_TOKEN || "").trim();
  const moderationToken = String(process.env.ADMIN_MODERATION_TOKEN || "").trim();
  const credentials: AdminCredential[] = [];

  if (translationToken) {
    credentials.push({
      token: translationToken,
      permissions: ["dashboard", "translation"],
    });
  }

  if (moderationToken) {
    credentials.push({
      token: moderationToken,
      permissions: ["dashboard", "translation", "moderation"],
    });
  }

  return credentials;
}

function signingSecret(): string | null {
  const explicitSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();
  if (explicitSecret) return explicitSecret;

  const material = [
    process.env.ADMIN_TRANSLATION_TOKEN,
    process.env.ADMIN_MODERATION_TOKEN,
    process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN,
    process.env.ADMIN_MODERATION_INTERNAL_TOKEN,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("|");

  return material || null;
}

function tokensMatch(input: string, configured: string): boolean {
  const left = Buffer.from(input);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signPayload(encodedPayload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(encodedPayload).digest());
}

function buildSessionCookie(permissions: AdminPermission[]): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const payload: SessionPayload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    permissions: uniquePermissions(permissions),
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function authenticateAdminPassword(password: string): AdminSession | null {
  const trimmed = password.trim();
  if (!trimmed) return null;

  const permissions: AdminPermission[] = [];
  for (const credential of configuredCredentials()) {
    if (tokensMatch(trimmed, credential.token)) {
      permissions.push(...credential.permissions);
    }
  }

  if (!permissions.length) return null;

  return {
    permissions: uniquePermissions(permissions),
    expiresAt: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export function createAdminSessionCookie(permissions: AdminPermission[]): string | null {
  return buildSessionCookie(permissions);
}

export function verifyAdminSessionCookie(value: string | undefined | null): AdminSession | null {
  const secret = signingSecret();
  const raw = value?.trim();
  if (!secret || !raw) return null;

  const [encodedPayload, signature, ...rest] = raw.split(".");
  if (!encodedPayload || !signature || rest.length) return null;

  const expected = signPayload(encodedPayload, secret);
  if (!tokensMatch(signature, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }

  if (payload.v !== 1 || !Array.isArray(payload.permissions)) return null;
  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;

  const permissions = payload.permissions.filter(
    (permission): permission is AdminPermission =>
      permission === "dashboard" || permission === "translation" || permission === "moderation"
  );
  if (!permissions.length) return null;

  return {
    permissions: uniquePermissions(permissions),
    expiresAt: payload.exp,
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifyAdminSessionCookie(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminSession(permission: AdminPermission): Promise<AdminSession | null> {
  const session = await getAdminSession();
  if (!session?.permissions.includes(permission)) return null;
  return session;
}

export function setAdminSessionCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function sameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}
