import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

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

    if (specifier === "next/headers") {
      return nextResolve(pathToFileURL(join(root, "node_modules/next/headers.js")).href, context);
    }

    if (specifier.startsWith("@/")) {
      return nextResolve(resolveLocal(join(root, specifier.slice(2))), context);
    }

    return nextResolve(specifier, context);
  },
});

const routeModulePromise = import("../app/api/owner/boats/route.ts");
const nextServerPromise = import("next/server");

const ownerId = 7;
const documentId = "pcwdqr3gohdv9u6iv4x6l9f7";
const userJwt = makeJwt({ iat: 2_000_000_000 });
const ownerSessionCookie = `v2:2:${userJwt}`;

function makeJwt(payload: Record<string, unknown>): string {
  return [
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "signature",
  ].join(".");
}

function editableBoat(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    documentId,
    slug: "owner-boat",
    title: "Owner Boat",
    moderation_status: "draft",
    cover_file_id: 101,
    image_file_ids: [101, 102],
    ...overrides,
  };
}

function patchBody(overrides: Record<string, unknown> = {}) {
  return {
    documentId,
    title: "Owner Boat",
    description: "Updated local description",
    listingType: "rent",
    vesselType: "motorboat",
    propulsion: "motor",
    capacity: 6,
    lengthM: 8.5,
    year: 2021,
    engineHp: 220,
    rentPriceHour: 90,
    rentPriceDay: 500,
    rentPriceWeek: 2500,
    minRentalHours: 8,
    salePrice: null,
    ownerPhone: "+382 67 000 000",
    homeMarinaId: 4,
    currency: "EUR",
    instantBooking: true,
    locale: "me",
    ...overrides,
  };
}

function createBody(overrides: Record<string, unknown> = {}) {
  const body = patchBody({
    title: "New Owner Boat",
    minRentalHours: 3,
    locale: "en",
    instantBooking: false,
    ...overrides,
  });
  delete body.documentId;
  return body;
}

function response(json: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(json), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function makeRequest(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const { NextRequest } = await nextServerPromise;
  return new NextRequest("http://localhost/api/owner/boats", {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: `sharmar_owner_session=${ownerSessionCookie}`,
    },
    body: JSON.stringify(body),
  });
}

type FetchCall = {
  method: string;
  path: string;
  authorization: string | null;
  body: unknown;
};

function jsonBody(init?: RequestInit): unknown {
  if (typeof init?.body !== "string") return null;
  return JSON.parse(init.body);
}

async function runWithMockedStrapi(
  handler: () => Promise<Response>,
  options: {
    ownedBoats?: unknown[];
    updateStatus?: number;
    updateJson?: unknown;
  } = {}
) {
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
    const headers = new Headers(init?.headers);
    const call: FetchCall = {
      method: init?.method ?? "GET",
      path: `${url.pathname}${url.search}`,
      authorization: headers.get("Authorization"),
      body: jsonBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/users/me") {
      return response({ id: ownerId, email: "owner@example.test", username: "owner" });
    }

    if (url.pathname === "/api/owner/profile-by-user") {
      assert.equal(url.searchParams.get("user_id"), String(ownerId));
      return response({ profile: { documentId: "owner-profile-doc", session_version: 2 } });
    }

    if (url.pathname === "/api/owner/boats-by-user") {
      assert.equal(url.searchParams.get("user_id"), String(ownerId));
      return response({ ok: true, boats: options.ownedBoats ?? [editableBoat()] });
    }

    if (url.pathname === `/api/boats/${documentId}`) {
      return response(
        options.updateJson ?? { data: { id: 123, documentId } },
        { status: options.updateStatus ?? 200 }
      );
    }

    if (url.pathname === "/api/boats" && call.method === "POST") {
      return response({ data: { id: 456, documentId: "new-owner-boat-doc" } }, { status: 201 });
    }

    return response({ error: `Unexpected ${call.method} ${call.path}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const res = await handler();
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

test("owner boats route exports PATCH", async () => {
  const route = await routeModulePromise;
  assert.equal(typeof route.PATCH, "function");
});

test("PATCH accepts minRentalHours=8, preserves ownership, and updates Strapi payload/media", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedStrapi(
    async () => route.PATCH(await makeRequest("PATCH", patchBody()))
  );

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);

  const meCall = calls.find((call) => call.path === "/api/users/me");
  assert.equal(meCall?.authorization, `Bearer ${userJwt}`);

  const ownershipCall = calls.find((call) => call.path === `/api/owner/boats-by-user?user_id=${ownerId}`);
  assert.equal(ownershipCall?.authorization, "Bearer write-token");

  const updateCall = calls.find((call) => call.path === `/api/boats/${documentId}?locale=sr-Latn-ME&status=draft`);
  assert.ok(updateCall, "Strapi update was not reached");
  assert.equal(updateCall.method, "PUT");
  assert.equal(updateCall.authorization, "Bearer write-token");
  assert.deepEqual(updateCall.body, {
    data: {
      title: "Owner Boat",
      slug: "owner-boat",
      description: "Updated local description",
      listing_type: "rent",
      vesselType: "motorboat",
      propulsion: "motor",
      boat_type: "Motorboat",
      capacity: 6,
      length_m: 8.5,
      year: 2021,
      engine_hp: 220,
      price_per_hour: 90,
      price_per_day: 500,
      price_per_week: 2500,
      min_rental_hours: 8,
      sale_price: null,
      owner_phone: "+382 67 000 000",
      home_marina: 4,
      currency: "EUR",
      instant_booking: true,
      moderation_status: "draft",
      publishedAt: null,
      cover: 101,
      images: [101, 102],
    },
  });
});

test("PATCH refuses a foreign boat before Strapi update", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedStrapi(
    async () => route.PATCH(await makeRequest("PATCH", patchBody())),
    { ownedBoats: [editableBoat({ documentId: "other-boat-doc" })] }
  );

  assert.equal(res.status, 404);
  assert.equal(json.error, "Boat not found for this owner");
  assert.equal(calls.some((call) => call.path.startsWith(`/api/boats/${documentId}`)), false);
});

test("PATCH surfaces Strapi update status with an actionable code", async () => {
  const route = await routeModulePromise;
  const upstreamError = { error: { message: "min_rental_hours must be less than or equal to 24" } };
  const { res, json } = await runWithMockedStrapi(
    async () => route.PATCH(await makeRequest("PATCH", patchBody())),
    { updateStatus: 400, updateJson: upstreamError }
  );

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.code, "strapi_update_failed");
  assert.equal(json.upstreamStatus, 400);
  assert.deepEqual(json.details, upstreamError);
});

test("POST create route still writes owner-owned draft boats", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedStrapi(
    async () => route.POST(await makeRequest("POST", createBody()))
  );

  assert.equal(res.status, 201);
  assert.equal(json.ok, true);

  const createCall = calls.find((call) => call.path === "/api/boats?status=draft");
  assert.ok(createCall, "Strapi create was not reached");
  assert.equal(createCall.method, "POST");
  assert.equal(createCall.authorization, "Bearer write-token");
  assert.equal(createCall.body?.data?.owner_user_id, ownerId);
  assert.equal(createCall.body?.data?.min_rental_hours, 3);
  assert.equal(createCall.body?.data?.moderation_status, "draft");
  assert.equal(createCall.body?.data?.publishedAt, null);
});
