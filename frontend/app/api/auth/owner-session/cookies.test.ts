import assert from "node:assert/strict";
import test from "node:test";

import type { NextResponse } from "next/server";

import { OWNER_SESSION_COOKIE_NAME, setOwnerSessionCookie } from "./cookies.ts";

type CookieOptions = Parameters<NextResponse["cookies"]["set"]>[0];

function withEnv<T>(env: { NODE_ENV?: string; VERCEL_ENV?: string }, callback: () => T): T {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousVercelEnv = process.env.VERCEL_ENV;

  if (env.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = env.NODE_ENV;
  }

  if (env.VERCEL_ENV === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = env.VERCEL_ENV;
  }

  try {
    return callback();
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previousVercelEnv;
    }
  }
}

function sessionCookieOptions(env: { NODE_ENV?: string; VERCEL_ENV?: string }): CookieOptions {
  return withEnv(env, () => {
    let cookie: CookieOptions | null = null;
    const response = {
      cookies: {
        set(options: CookieOptions) {
          cookie = options;
        },
      },
    } as unknown as NextResponse;

    setOwnerSessionCookie(response, "owner.jwt", 2);

    assert.ok(cookie);
    assert.equal(cookie.name, OWNER_SESSION_COOKIE_NAME);
    return cookie;
  });
}

test("owner session cookie is host-only on Vercel Preview even when NODE_ENV is production", () => {
  const cookie = sessionCookieOptions({ NODE_ENV: "production", VERCEL_ENV: "preview" });

  assert.equal(cookie.domain, undefined);
});

test("owner session cookie uses .sharmar.me on production", () => {
  const cookie = sessionCookieOptions({ NODE_ENV: "production", VERCEL_ENV: "production" });

  assert.equal(cookie.domain, ".sharmar.me");
});
