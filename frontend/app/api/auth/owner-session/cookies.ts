import type { NextResponse } from "next/server";

export const OWNER_SESSION_COOKIE_NAME = "sharmar_owner_session";

function cookieDomain(): string | undefined {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return undefined;

  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    ? ".sharmar.me"
    : undefined;
}

export type ParsedOwnerSessionCookie = {
  token: string;
  sessionVersion: number | null;
};

export function encodeOwnerSessionCookie(token: string, sessionVersion: number | null = null): string {
  if (sessionVersion === null || !Number.isInteger(sessionVersion) || sessionVersion < 0) return token;
  return `v2:${sessionVersion}:${token}`;
}

export function parseOwnerSessionCookie(value: string | null | undefined): ParsedOwnerSessionCookie | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const match = /^v2:(\d+):([\s\S]+)$/.exec(raw);
  if (!match) return { token: raw, sessionVersion: null };

  const sessionVersion = Number(match[1]);
  const token = match[2]?.trim();
  if (!Number.isInteger(sessionVersion) || sessionVersion < 0 || !token) return null;
  return { token, sessionVersion };
}

export function setOwnerSessionCookie(response: NextResponse, token: string, sessionVersion: number | null = null) {
  response.cookies.set({
    name: OWNER_SESSION_COOKIE_NAME,
    value: encodeOwnerSessionCookie(token, sessionVersion),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearOwnerSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: OWNER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    expires: new Date(0),
  });
}
