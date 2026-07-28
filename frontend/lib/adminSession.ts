import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  type AdminPermission,
  type AdminSession,
  type AdminSessionStatus,
  authenticateAdminPassword,
  createAdminSessionCookie,
  verifyAdminSessionCookie,
  verifyAdminSessionCookieDetailed,
} from "./adminSessionCore";

export {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  authenticateAdminPassword,
  createAdminSessionCookie,
  verifyAdminSessionCookie,
  verifyAdminSessionCookieDetailed,
};

export type { AdminPermission, AdminSession, AdminSessionStatus };

export async function getAdminSessionStatus(): Promise<AdminSessionStatus> {
  const store = await cookies();
  return verifyAdminSessionCookieDetailed(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const status = await getAdminSessionStatus();
  return status.authenticated ? status.session : null;
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
