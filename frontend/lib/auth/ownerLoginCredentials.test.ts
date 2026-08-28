import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseOwnerLoginCredentials } from "./ownerLoginCredentials.ts";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

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
      if (parentPath.includes("/node_modules/")) {
        return nextResolve(specifier, context);
      }

      return nextResolve(
        resolveLocal(join(dirname(parentPath), specifier)),
        context
      );
    }

    return nextResolve(specifier, context);
  },
});

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const ownerLoginRoute = read("app/api/auth/owner-login/route.ts");
const ownerLoginForm = read("app/[lang]/owner-login/OwnerLoginForm.tsx");
const routeModulePromise = import("../../app/api/auth/owner-login/route.ts");
const nextServerPromise = import("next/server");

type FetchCall = {
  method: string;
  path: string;
  body: unknown;
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
  return new NextRequest("http://localhost/api/auth/owner-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runWithMockedStrapi(
  body: Record<string, unknown>,
  options: { authStatus?: number } = {}
) {
  const route = await routeModulePromise;
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    STRAPI_URL: process.env.STRAPI_URL,
    NEXT_PUBLIC_STRAPI_URL: process.env.NEXT_PUBLIC_STRAPI_URL,
    STRAPI_WRITE_TOKEN: process.env.STRAPI_WRITE_TOKEN,
    STRAPI_TOKEN: process.env.STRAPI_TOKEN,
    OWNER_API_TOKEN: process.env.OWNER_API_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  };
  const calls: FetchCall[] = [];

  process.env.STRAPI_URL = "http://strapi.local";
  process.env.NEXT_PUBLIC_STRAPI_URL = "";
  process.env.STRAPI_WRITE_TOKEN = "write-token";
  process.env.STRAPI_TOKEN = "";
  process.env.OWNER_API_TOKEN = "owner-api-token";
  process.env.NODE_ENV = "test";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: FetchCall = {
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      body: jsonBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/owner/rate-limit/check") {
      return response({ ok: true, allowed: true, retryAfter: 0 });
    }

    if (url.pathname === "/api/auth/local") {
      if (options.authStatus && options.authStatus >= 400) {
        return response({ error: { message: "Invalid identifier or password" } }, { status: options.authStatus });
      }

      return response({
        jwt: "owner.jwt",
        user: { id: 7, email: "owner@example.test", username: "owner" },
      });
    }

    if (url.pathname === "/api/owner/profile-by-user") {
      assert.equal(url.searchParams.get("user_id"), "7");
      return response({ profile: { documentId: "owner-profile-doc", session_version: 2 } });
    }

    return response({ error: `Unexpected ${call.method} ${call.path}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const res = await route.POST(await makeRequest(body));
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

test("owner login accepts identifier and password as the primary request contract", async () => {
  const result = parseOwnerLoginCredentials({
    identifier: " Owner@Example.COM ",
    password: "CorrectPassword1",
  });
  const { res, json, calls } = await runWithMockedStrapi({
    identifier: " Owner@Example.COM ",
    password: "CorrectPassword1",
  });

  assert.deepEqual(result, {
    ok: true,
    identifier: "owner@example.com",
    password: "CorrectPassword1",
  });
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(calls.find((call) => call.path === "/api/auth/local")?.body, {
    identifier: "owner@example.com",
    password: "CorrectPassword1",
  });
  assert.ok(ownerLoginForm.includes("identifier: identifier.trim()"));
  assert.ok(ownerLoginRoute.includes("body: JSON.stringify({ identifier, password })"));
});

test("owner login accepts email and password as a backward-compatible alias", async () => {
  const result = parseOwnerLoginCredentials({
    email: " Owner@Example.COM ",
    password: "CorrectPassword1",
  });
  const { res, json, calls } = await runWithMockedStrapi({
    email: " Owner@Example.COM ",
    password: "CorrectPassword1",
  });

  assert.deepEqual(result, {
    ok: true,
    identifier: "owner@example.com",
    password: "CorrectPassword1",
  });
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(calls.find((call) => call.path === "/api/auth/local")?.body, {
    identifier: "owner@example.com",
    password: "CorrectPassword1",
  });
});

test("owner login rejects requests without identifier or email with 400 invalid credentials", async () => {
  const result = parseOwnerLoginCredentials({
    password: "CorrectPassword1",
  });
  const { res, json, calls } = await runWithMockedStrapi({
    password: "CorrectPassword1",
  });

  assert.deepEqual(result, {
    ok: false,
    identifier: "",
    code: "invalid_credentials",
    status: 400,
  });
  assert.equal(res.status, 400);
  assert.equal(json.code, "invalid_credentials");
  assert.equal(calls.some((call) => call.path === "/api/auth/local"), false);
});

test("owner login keeps failed Strapi authentication mapped to 401 invalid credentials", async () => {
  const { res, json } = await runWithMockedStrapi(
    {
      identifier: "owner@example.test",
      password: "WrongPassword1",
    },
    { authStatus: 400 }
  );

  assert.equal(res.status, 401);
  assert.equal(json.code, "invalid_credentials");
  assert.ok(ownerLoginRoute.includes("const loginRes = await fetch(`${getStrapiBase()}/api/auth/local`"));
  assert.ok(ownerLoginRoute.includes("body: JSON.stringify({ identifier, password })"));
  assert.ok(ownerLoginRoute.includes('return jsonError("invalid_credentials", 401);'));
});
