import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const ownerId = 7;
const userJwt = "owner.jwt";
const boatDocumentId = "owner-boat-doc";
const experienceDocumentId = "owner-experience-doc";

type FetchCall = {
  method: string;
  path: string;
  authorization: string | null;
  ownerInternalToken: string | null;
  body: unknown;
};

type RunOptions = {
  ownerBoats?: unknown[];
  experience?: unknown;
  experienceCount?: number;
  mediaAllowed?: boolean;
  createStatus?: number;
  createJson?: unknown;
  updateStatus?: number;
  updateJson?: unknown;
  deleteStatus?: number;
  deleteJson?: unknown;
  bookingDependencies?: unknown[];
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

function ownerBoat(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    documentId: boatDocumentId,
    title: "Owner Boat",
    slug: "owner-boat",
    locale: "en",
    listing_type: "rent",
    owner_user_id: ownerId,
    capacity: 6,
    ...overrides,
  };
}

function ownerExperience(overrides: Record<string, unknown> = {}) {
  return {
    id: 555,
    documentId: experienceDocumentId,
    title: "Old route",
    boat: {
      id: 123,
      documentId: boatDocumentId,
    },
    ...overrides,
  };
}

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    boatId: 123,
    title: "Bay tour",
    durationHours: 4,
    price: 250,
    shortDescription: "Short route",
    fullDescription: "Full route",
    includedServices: "Skipper",
    meetingPoint: "Marina",
    maxGuests: 5,
    sortOrder: 10,
    coverId: 101,
    galleryIds: [102],
    locale: "en",
    ...overrides,
  };
}

function patchBody(overrides: Record<string, unknown> = {}) {
  return {
    documentId: experienceDocumentId,
    title: "Updated bay tour",
    durationHours: 5,
    price: 300,
    shortDescription: "Updated short route",
    maxGuests: 5,
    coverId: 101,
    ...overrides,
  };
}

async function makeJsonRequest(method: "POST" | "PATCH", body: unknown) {
  const { NextRequest } = await nextServerPromise;
  return new NextRequest("http://localhost/api/owner/experiences", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userJwt}`,
    },
    body: JSON.stringify(body),
  });
}

async function makeDeleteRequest(documentId: string | null = experienceDocumentId) {
  const { NextRequest } = await nextServerPromise;
  const url = new URL("http://localhost/api/owner/experiences");
  if (documentId !== null) url.searchParams.set("documentId", documentId);
  return new NextRequest(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userJwt}` },
  });
}

async function runWithMockedCms(handler: () => Promise<Response>, options: RunOptions = {}) {
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
      ownerInternalToken: headers.get("x-owner-api-token"),
      body: jsonBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/users/me") {
      return response({
        id: ownerId,
        email: "owner@example.test",
        username: "owner@example.test",
      });
    }

    if (url.pathname === "/api/owner/profile-by-user") {
      assert.equal(url.searchParams.get("user_id"), String(ownerId));
      return response({
        profile: {
          documentId: "owner-profile-doc",
          session_version: 0,
          email_verified: true,
          whatsapp_verified: true,
        },
      });
    }

    if (url.pathname === "/api/owner/media-ownership/verify") {
      return response({ ok: options.mediaAllowed !== false }, {
        status: options.mediaAllowed === false ? 403 : 200,
      });
    }

    if (url.pathname === "/api/owner/boats-by-user") {
      assert.equal(url.searchParams.get("user_id"), String(ownerId));
      return response({ ok: true, boats: options.ownerBoats ?? [ownerBoat()] });
    }

    if (url.pathname === "/api/experiences" && call.method === "GET") {
      const count = options.experienceCount ?? 0;
      return response({
        data: Array.from({ length: count }, (_, index) => ({
          id: index + 1,
          documentId: `experience-${index + 1}`,
        })),
      });
    }

    if (url.pathname === "/api/experiences" && call.method === "POST") {
      return response(
        options.createJson ?? {
          data: {
            id: 556,
            documentId: "new-route-doc",
          },
        },
        { status: options.createStatus ?? 201 }
      );
    }

    if (url.pathname === `/api/experiences/${experienceDocumentId}` && call.method === "GET") {
      return response({
        data: options.experience ?? ownerExperience(),
      });
    }

    if (url.pathname === `/api/experiences/${experienceDocumentId}` && call.method === "PUT") {
      return response(
        options.updateJson ?? {
          data: {
            id: 555,
            documentId: experienceDocumentId,
          },
        },
        { status: options.updateStatus ?? 200 }
      );
    }

    if (url.pathname === "/api/booking-requests") {
      return response({ data: options.bookingDependencies ?? [] });
    }

    if (url.pathname === `/api/experiences/${experienceDocumentId}` && call.method === "DELETE") {
      return response(options.deleteJson ?? { data: { documentId: experienceDocumentId } }, {
        status: options.deleteStatus ?? 200,
      });
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

test("POST creates a route only for a boat owned by the authenticated owner", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody()))
  );

  assert.equal(res.status, 201);
  assert.equal(json.ok, true);
  assert.equal(json.relation.confirmed, true);
  assert.equal(json.boat.id, 123);

  const boatsCall = calls.find((call) => call.path === `/api/owner/boats-by-user?user_id=${ownerId}`);
  assert.equal(boatsCall?.authorization, "Bearer write-token");

  const createCall = calls.find((call) => call.path === "/api/experiences" && call.method === "POST");
  assert.ok(createCall, "Strapi experience creation was not reached");
  assert.equal(createCall.authorization, "Bearer write-token");
  assert.equal(createCall.body?.data?.boat, 123);
});

test("POST rejects a route for a boat that is not returned as owned by the owner", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody())),
    { ownerBoats: [ownerBoat({ id: 999, documentId: "other-boat-doc" })] }
  );

  assert.equal(res.status, 403);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Boat does not belong to owner");
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("POST rejects route creation for a boat listed for sale", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody())),
    { ownerBoats: [ownerBoat({ listing_type: "sale" })] }
  );

  assert.equal(res.status, 409);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Experiences are allowed only for rental boats");
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("POST enforces no more than three routes for one boat", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody())),
    { experienceCount: 3 }
  );

  assert.equal(res.status, 409);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Maximum 3 experiences per boat");
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("POST rejects maxGuests above the boat capacity", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody({ maxGuests: 7 }))),
    { ownerBoats: [ownerBoat({ capacity: 6 })] }
  );

  assert.equal(res.status, 409);
  assert.equal(json.ok, false);
  assert.equal(json.error, "maxGuests cannot exceed boat capacity (6)");
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("POST rejects missing required route fields before ownership and CMS writes", async () => {
  const route = await routeModulePromise;
  const body = createBody({ title: "" });
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", body))
  );

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.equal(json.error, "title is required");
  assert.equal(calls.some((call) => call.path === "/api/owner/boats-by-user"), false);
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("POST verifies cover and gallery media ownership before route creation", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody({ coverId: 101, galleryIds: [102, 103] })))
  );

  assert.equal(res.status, 201);
  assert.equal(json.ok, true);
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/media-ownership/verify")?.body, {
    user_id: ownerId,
    file_ids: [101, 102, 103],
  });
});

test("POST rejects cover media that does not belong to the owner", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody({ coverId: 101, galleryIds: [] }))),
    { mediaAllowed: false }
  );

  assert.equal(res.status, 403);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Media files are not available for this owner");
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/media-ownership/verify")?.body, {
    user_id: ownerId,
    file_ids: [101],
  });
  assert.equal(calls.some((call) => call.path === "/api/experiences" && call.method === "POST"), false);
});

test("PATCH updates only a route whose boat belongs to the authenticated owner", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.PATCH(await makeJsonRequest("PATCH", patchBody()))
  );

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  const updateCall = calls.find((call) => call.path === `/api/experiences/${experienceDocumentId}?status=draft`);
  assert.ok(updateCall, "Strapi experience update was not reached");
  assert.equal(updateCall.method, "PUT");
  assert.equal(updateCall.authorization, "Bearer write-token");
  assert.match(updateCall.body?.data?.slug, /^updated-bay-tour-\d+$/);
  assert.deepEqual(updateCall.body, {
    data: {
      title: "Updated bay tour",
      slug: updateCall.body?.data?.slug,
      duration_hours: 5,
      price: 300,
      short_description: "Updated short route",
      max_guests: 5,
      is_active: false,
      publishedAt: null,
      cover: 101,
    },
  });
});

test("PATCH rejects updates for a route connected to a non-owned boat", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.PATCH(await makeJsonRequest("PATCH", patchBody())),
    {
      ownerBoats: [ownerBoat({ id: 999, documentId: "other-boat-doc" })],
      experience: ownerExperience({ boat: { id: 123, documentId: boatDocumentId } }),
    }
  );

  assert.equal(res.status, 403);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Boat does not belong to owner");
  assert.equal(calls.some((call) => call.path === `/api/experiences/${experienceDocumentId}?status=draft` && call.method === "PUT"), false);
});

test("DELETE removes only a route whose boat belongs to the authenticated owner", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.DELETE(await makeDeleteRequest())
  );

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.deleted, experienceDocumentId);
  const deleteCall = calls.find((call) => call.path === `/api/experiences/${experienceDocumentId}?status=draft`);
  assert.ok(deleteCall, "Strapi experience delete was not reached");
  assert.equal(deleteCall.method, "DELETE");
  assert.equal(deleteCall.authorization, "Bearer write-token");
});

test("DELETE rejects routes connected to a non-owned boat before CMS deletion", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.DELETE(await makeDeleteRequest()),
    {
      ownerBoats: [ownerBoat({ id: 999, documentId: "other-boat-doc" })],
      experience: ownerExperience({ boat: { id: 123, documentId: boatDocumentId } }),
    }
  );

  assert.equal(res.status, 403);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Boat does not belong to owner");
  assert.equal(calls.some((call) => call.path === `/api/experiences/${experienceDocumentId}?status=draft` && call.method === "DELETE"), false);
});

test("POST surfaces CMS errors during route creation", async () => {
  const route = await routeModulePromise;
  const upstreamError = { error: { message: "create failed" } };
  const { res, json } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody())),
    { createStatus: 500, createJson: upstreamError }
  );

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Strapi create experience failed");
  assert.equal(json.status, 500);
  assert.deepEqual(json.details, upstreamError);
});

test("PATCH surfaces CMS errors during route update", async () => {
  const route = await routeModulePromise;
  const upstreamError = { error: { message: "update failed" } };
  const { res, json } = await runWithMockedCms(
    async () => route.PATCH(await makeJsonRequest("PATCH", patchBody())),
    { updateStatus: 500, updateJson: upstreamError }
  );

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Strapi update experience failed");
  assert.equal(json.status, 500);
  assert.deepEqual(json.details, upstreamError);
});

test("DELETE surfaces CMS errors during route deletion", async () => {
  const route = await routeModulePromise;
  const upstreamError = { error: { message: "delete failed" } };
  const { res, json } = await runWithMockedCms(
    async () => route.DELETE(await makeDeleteRequest()),
    { deleteStatus: 500, deleteJson: upstreamError }
  );

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Strapi delete experience failed");
  assert.equal(json.status, 500);
  assert.deepEqual(json.details, upstreamError);
});

test("POST creates new routes inactive and unpublished", async () => {
  const route = await routeModulePromise;
  const { res, json, calls } = await runWithMockedCms(
    async () => route.POST(await makeJsonRequest("POST", createBody()))
  );

  assert.equal(res.status, 201);
  assert.equal(json.publicationState, "draft");
  assert.equal(json.is_active, false);
  const createCall = calls.find((call) => call.path === "/api/experiences" && call.method === "POST");
  assert.equal(createCall?.body?.data?.is_active, false);
  assert.equal(createCall?.body?.data?.publishedAt, null);
});
