import type { NextResponse } from "next/server";

export const OWNER_SESSION_COOKIE_NAME = "sharmar_owner_session";

function cookieDomain(): string | undefined {
  return process.env.NODE_ENV === "production" ? ".sharmar.me" : undefined;
}

export function setOwnerSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: OWNER_SESSION_COOKIE_NAME,
    value: token,
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
