import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))));

function resolveLocal(path: string): string {
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}.js`]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return pathToFileURL(path).href;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve(pathToFileURL(join(root, "node_modules/next/server.js")).href, context);
    }

    if (specifier.startsWith("@/")) {
      return nextResolve(resolveLocal(join(root, specifier.slice(2))), context);
    }

    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const parentPath = fileURLToPath(context.parentURL);
      if (parentPath.includes("/node_modules/")) return nextResolve(specifier, context);
      return nextResolve(resolveLocal(join(dirname(parentPath), specifier)), context);
    }

    return nextResolve(specifier, context);
  },
});

const routeModulePromise = import("./route.ts");
const nextServerPromise = import("next/server");
const verificationPromise = import("@/lib/security/ownerContactVerification");

const ownerId = 7;
const ownerEmail = "owner@example.test";
const secret = "owner-email-verification-confirm-route-tests";

type FetchCall = {
  method: string;
  path: string;
  authorization: string | null;
  ownerInternalToken: string | null;
  body: unknown;
};

type RunOptions = {
  token?: string;
  body?: Record<string, unknown>;
  tokenEmail?: string;
  userEmail?: string;
  tokenNowMs?: number;
  tokenTtlMs?: number;
  profile?: Record<string, unknown> | null;
  updateStatus?: number;
};

function response(json: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(json), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonBody(init?: RequestInit): unknown {
  if (typeof init?.body !== "string") return null;
  return JSON.parse(init.body);
}

async function makeRequest(body: Record<string, unknown>) {
  const { NextRequest } = await nextServerPromise;
  return new NextRequest("http://localhost/api/auth/owner-email-verification/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

async function makeToken(options: RunOptions = {}) {
  const { createOwnerEmailVerificationToken } = await verificationPromise;
  return createOwnerEmailVerificationToken({
    userId: ownerId,
    email: options.tokenEmail ?? ownerEmail,
    lang: "en",
    secret,
    nowMs: options.tokenNowMs,
    ttlMs: options.tokenTtlMs,
    nonce: "owner-email-confirm-test-nonce",
  });
}

async function runWithMockedCms(options: RunOptions = {}) {
  const route = await routeModulePromise;
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    STRAPI_URL: process.env.STRAPI_URL,
    NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL,
    STRAPI_WRITE_TOKEN: process.env.STRAPI_WRITE_TOKEN,
    STRAPI_TOKEN: process.env.STRAPI_TOKEN,
    OWNER_API_TOKEN: process.env.OWNER_API_TOKEN,
    OWNER_CONTACT_VERIFICATION_SECRET: process.env.OWNER_CONTACT_VERIFICATION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };
  const calls: FetchCall[] = [];

  process.env.STRAPI_URL = "http://strapi.local";
  process.env.NEXT_PUBLIC_STRAPI_URL = "";
  process.env.STRAPI_WRITE_TOKEN = "write-token";
  process.env.STRAPI_TOKEN = "";
  process.env.OWNER_API_TOKEN = "owner-api-token";
  process.env.OWNER_CONTACT_VERIFICATION_SECRET = secret;
  process.env.NODE_ENV = "test";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const call: FetchCall = {
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      authorization: headers.get("Authorization"),
      ownerInternalToken: headers.get("x-owner-api-token"),
      body: jsonBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/owner/rate-limit/check") {
      return response({ ok: true, allowed: true, retryAfter: 0 });
    }

    if (url.pathname === "/api/users") {
      assert.equal(url.searchParams.get("filters[id][$eq]"), String(ownerId));
      return response([
        {
          id: ownerId,
          email: options.userEmail ?? ownerEmail,
        },
      ]);
    }

    if (url.pathname === "/api/owner/profile-by-user") {
      assert.equal(url.searchParams.get("user_id"), String(ownerId));
      if (options.profile === null) return response({ profile: null }, { status: 404 });
      return response({
        profile: options.profile ?? {
          documentId: "owner-profile-doc",
          email_verified: false,
          whatsapp_verified: false,
          verification_status: "new",
        },
      });
    }

    if (url.pathname === "/api/owner-profiles/owner-profile-doc") {
      return response(
        { data: { documentId: "owner-profile-doc" } },
        { status: options.updateStatus ?? 200 }
      );
    }

    return response({ error: `Unexpected ${call.method} ${call.path}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const token = options.token ?? (
      options.body && !("token" in options.body)
        ? ""
        : await makeToken(options)
    );
    const res = await route.POST(await makeRequest(options.body ?? { token }));
    const json = await res.json();
    return { res, json, calls };
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("owner email confirmation accepts a valid active token and updates the profile", async () => {
  const { res, json, calls } = await runWithMockedCms();

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.code, "email_verified");
  assert.deepEqual(calls.find((call) => call.path === "/api/owner-profiles/owner-profile-doc")?.body, {
    data: {
      email_verified: true,
      verification_status: "email_verified",
    },
  });
});

test("owner email confirmation rejects an invalid token before user lookup", async () => {
  const { res, json, calls } = await runWithMockedCms({ token: "not.a.valid.token" });

  assert.equal(res.status, 400);
  assert.equal(json.code, "email_verification_token_invalid");
  assert.equal(calls.some((call) => call.path.startsWith("/api/users?")), false);
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), false);
});

test("owner email confirmation rejects an expired token before user lookup", async () => {
  const expiredToken = await makeToken({
    tokenNowMs: Date.now() - 48 * 60 * 60 * 1000,
    tokenTtlMs: 60 * 60 * 1000,
  });
  const { res, json, calls } = await runWithMockedCms({ token: expiredToken });

  assert.equal(res.status, 400);
  assert.equal(json.code, "email_verification_token_invalid");
  assert.equal(calls.some((call) => call.path.startsWith("/api/users?")), false);
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), false);
});

test("owner email confirmation rejects a token issued for a different email address", async () => {
  const { res, json, calls } = await runWithMockedCms({
    tokenEmail: "other@example.test",
    userEmail: ownerEmail,
  });

  assert.equal(res.status, 400);
  assert.equal(json.code, "email_verification_token_invalid");
  assert.equal(calls.some((call) => call.path === "/api/owner/profile-by-user?user_id=7"), false);
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), false);
});

test("owner email confirmation returns already verified without updating the profile", async () => {
  const { res, json, calls } = await runWithMockedCms({
    profile: {
      documentId: "owner-profile-doc",
      email_verified: true,
      whatsapp_verified: true,
      verification_status: "whatsapp_verified",
    },
  });

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.code, "email_already_verified");
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), false);
});

test("owner email confirmation returns 502 when profile update fails", async () => {
  const { res, json, calls } = await runWithMockedCms({ updateStatus: 500 });

  assert.equal(res.status, 502);
  assert.equal(json.code, "email_verification_update_failed");
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), true);
});

test("owner email confirmation rejects a request without a token before user lookup", async () => {
  const { res, json, calls } = await runWithMockedCms({ body: {} });

  assert.equal(res.status, 400);
  assert.equal(json.code, "email_verification_token_invalid");
  assert.equal(calls.some((call) => call.path.startsWith("/api/users?")), false);
  assert.equal(calls.some((call) => call.path === "/api/owner-profiles/owner-profile-doc"), false);
});
