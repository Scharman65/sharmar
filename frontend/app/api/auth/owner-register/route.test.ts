import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.RESEND_API_KEY = "";

const root = dirname(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))));

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

type FetchCall = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
};

const validBody = {
  first_name: "Ada",
  last_name: "Owner",
  email: "Owner@Example.COM",
  whatsapp_number: "+38267000111",
  password: "CorrectPassword1",
  confirm_password: "CorrectPassword1",
  preferred_language: "en",
  accept_terms: true,
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
  return new NextRequest("http://localhost/api/auth/owner-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runWithMockedStrapi(
  body: Record<string, unknown>,
  options: {
    registerStatus?: number;
    registerJson?: unknown;
    profileStatus?: number;
    profileJson?: unknown;
    emailReady?: boolean;
  } = {}
) {
  const route = await routeModulePromise;
  const previousFetch = globalThis.fetch;
  const tmp = mkdtempSync(join(tmpdir(), "owner-register-route-test-"));
  const mockEmailFile = join(tmp, "verification-emails.ndjson");
  const previousEnv = {
    STRAPI_URL: process.env.STRAPI_URL,
    NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL,
    STRAPI_WRITE_TOKEN: process.env.STRAPI_WRITE_TOKEN,
    STRAPI_TOKEN: process.env.STRAPI_TOKEN,
    OWNER_API_TOKEN: process.env.OWNER_API_TOKEN,
    OWNER_CONTACT_VERIFICATION_SECRET: process.env.OWNER_CONTACT_VERIFICATION_SECRET,
    OWNER_VERIFICATION_EMAIL_MOCK_FILE: process.env.OWNER_VERIFICATION_EMAIL_MOCK_FILE,
    SITE_URL: process.env.SITE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  const calls: FetchCall[] = [];

  process.env.STRAPI_URL = "http://strapi.local";
  process.env.NEXT_PUBLIC_STRAPI_URL = "";
  process.env.STRAPI_WRITE_TOKEN = "write-token";
  process.env.STRAPI_TOKEN = "";
  process.env.OWNER_API_TOKEN = "owner-api-token";
  process.env.OWNER_CONTACT_VERIFICATION_SECRET = "owner-verification-secret-for-route-tests";
  process.env.OWNER_VERIFICATION_EMAIL_MOCK_FILE = options.emailReady === false ? "" : mockEmailFile;
  process.env.SITE_URL = "https://preview.example.test";
  process.env.NEXT_PUBLIC_SITE_URL = "";
  process.env.NODE_ENV = "test";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const call: FetchCall = {
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      headers: Object.fromEntries(headers.entries()),
      body: jsonBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/owner/rate-limit/check") {
      return response({ ok: true, allowed: true, retryAfter: 0 });
    }

    if (url.pathname === "/api/auth/local/register") {
      return response(
        options.registerJson ?? {
          jwt: "owner.jwt",
          user: { id: 7, email: "owner@example.test", username: "owner@example.test" },
        },
        { status: options.registerStatus ?? 200 }
      );
    }

    if (url.pathname === "/api/owner/profile-create-for-user") {
      return response(
        options.profileJson ?? {
          ok: true,
          created: true,
          profile: { documentId: "owner-profile-doc", session_version: 0 },
        },
        { status: options.profileStatus ?? 200 }
      );
    }

    return response({ error: `Unexpected ${call.method} ${call.path}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const res = await route.POST(await makeRequest(body));
    const json = await res.json();
    const emailMock = existsSync(mockEmailFile) ? readFileSync(mockEmailFile, "utf8") : "";
    return { res, json, calls, emailMock };
  } finally {
    globalThis.fetch = previousFetch;
    rmSync(tmp, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("owner register creates a Strapi user, owner profile, verification email, and session cookie", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi(validBody);

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.user_id, 7);
  assert.equal(json.owner_profile_created, true);
  assert.equal(json.verification_email_sent, true);
  assert.equal(json.verification_email_code, "verification_email_sent");
  assert.match(res.headers.get("set-cookie") || "", /sharmar_owner_session=/);
  assert.match(emailMock, /owner@example.com/);
  assert.deepEqual(calls.find((call) => call.path === "/api/auth/local/register")?.body, {
    username: "owner@example.com",
    email: "owner@example.com",
    password: "CorrectPassword1",
  });
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/profile-create-for-user")?.body, {
    user_id: 7,
    first_name: "Ada",
    last_name: "Owner",
    whatsapp_number: "+38267000111",
    preferred_language: "en",
  });
});

test("owner register maps duplicate email from Strapi", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi(validBody, {
    registerStatus: 400,
    registerJson: { error: { message: "Email is already taken" } },
  });

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.equal(json.code, "email_already_registered");
  assert.equal(calls.some((call) => call.path === "/api/owner/profile-create-for-user"), false);
  assert.equal(emailMock, "");
});

test("owner register returns 502 when owner profile creation fails", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi(validBody, {
    profileStatus: 500,
    profileJson: { ok: false, error: "profile_create_failed" },
  });

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.code, "owner_profile_create_failed");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), true);
  assert.equal(emailMock, "");
});

test("owner register keeps registration successful when verification email cannot be sent", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi(validBody, {
    emailReady: false,
  });

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.verification_email_sent, false);
  assert.equal(json.verification_email_code, "email_unavailable");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), true);
  assert.equal(calls.some((call) => call.path === "/api/owner/profile-create-for-user"), true);
  assert.equal(emailMock, "");
});

test("owner register rejects missing required fields before Strapi registration", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi({
    ...validBody,
    first_name: "",
  });

  assert.equal(res.status, 400);
  assert.equal(json.code, "missing_required_fields");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), false);
  assert.equal(emailMock, "");
});

test("owner register rejects invalid email before Strapi registration", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi({
    ...validBody,
    email: "invalid-email",
  });

  assert.equal(res.status, 400);
  assert.equal(json.code, "invalid_email");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), false);
  assert.equal(emailMock, "");
});

test("owner register rejects weak password before Strapi registration", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi({
    ...validBody,
    password: "short",
    confirm_password: "short",
  });

  assert.equal(res.status, 400);
  assert.equal(json.code, "password_too_short");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), false);
  assert.equal(emailMock, "");
});

test("owner register rejects missing terms agreement before Strapi registration", async () => {
  const { res, json, calls, emailMock } = await runWithMockedStrapi({
    ...validBody,
    accept_terms: false,
  });

  assert.equal(res.status, 400);
  assert.equal(json.code, "terms_required");
  assert.equal(calls.some((call) => call.path === "/api/auth/local/register"), false);
  assert.equal(emailMock, "");
});
