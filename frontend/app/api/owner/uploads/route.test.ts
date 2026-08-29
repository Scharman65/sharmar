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

type FormFileSummary = {
  name: string;
  type: string;
  size: number;
};

type FetchCall = {
  method: string;
  path: string;
  authorization: string | null;
  ownerInternalToken: string | null;
  body: unknown;
};

type RunOptions = {
  files?: File[];
  uploadStatus?: number;
  uploadJson?: unknown;
  ownershipStatus?: number;
  ownershipJson?: unknown;
};

function imageFile(name: string, type: string, size = 12): File {
  return new File([new Uint8Array(size)], name, { type });
}

function response(json: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(json), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

function readBody(init?: RequestInit): unknown {
  if (typeof init?.body === "string") return JSON.parse(init.body);
  if (init?.body instanceof FormData) {
    return {
      files: init.body.getAll("files").map((value): FormFileSummary | null => {
        if (!(value instanceof File)) return null;
        return {
          name: value.name,
          type: value.type,
          size: value.size,
        };
      }).filter((value): value is FormFileSummary => value !== null),
    };
  }
  return null;
}

async function makeRequest(files: File[] = []) {
  const { NextRequest } = await nextServerPromise;
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.name);
  }

  return new NextRequest("http://localhost/api/owner/uploads", {
    method: "POST",
    headers: { Authorization: "Bearer owner.jwt" },
    body: formData,
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
      body: readBody(init),
    };
    calls.push(call);

    if (url.pathname === "/api/users/me") {
      return response({
        id: 7,
        email: "owner@example.test",
        username: "owner@example.test",
      });
    }

    if (url.pathname === "/api/owner/profile-by-user") {
      assert.equal(url.searchParams.get("user_id"), "7");
      return response({
        profile: {
          documentId: "owner-profile-doc",
          email_verified: true,
          whatsapp_verified: true,
          session_version: 0,
        },
      });
    }

    if (url.pathname === "/api/upload") {
      return response(
        options.uploadJson ?? [
          {
            id: 101,
            url: "/uploads/one.jpg",
            name: "one.jpg",
            mime: "image/jpeg",
            size: 12,
          },
          {
            id: 102,
            url: "/uploads/two.png",
            name: "two.png",
            mime: "image/png",
            size: 13,
          },
          {
            id: 103,
            url: "/uploads/three.webp",
            name: "three.webp",
            mime: "image/webp",
            size: 14,
          },
        ],
        { status: options.uploadStatus ?? 200 }
      );
    }

    if (url.pathname === "/api/owner/media-ownership/register") {
      return response(options.ownershipJson ?? { ok: true }, {
        status: options.ownershipStatus ?? 200,
      });
    }

    return response({ error: `Unexpected ${call.method} ${call.path}` }, { status: 500 });
  }) as typeof fetch;

  try {
    const res = await route.POST(await makeRequest(options.files));
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

test("owner uploads accepts JPEG, PNG, and WebP images", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [
      imageFile("one.jpg", "image/jpeg", 12),
      imageFile("two.png", "image/png", 13),
      imageFile("three.webp", "image/webp", 14),
    ],
  });

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.deepEqual(
    json.files.map((file: { id: number }) => file.id),
    [101, 102, 103]
  );
  assert.deepEqual(calls.find((call) => call.path === "/api/upload")?.body, {
    files: [
      { name: "one.jpg", type: "image/jpeg", size: 12 },
      { name: "two.png", type: "image/png", size: 13 },
      { name: "three.webp", type: "image/webp", size: 14 },
    ],
  });
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/media-ownership/register")?.body, {
    user_id: 7,
    file_ids: [101, 102, 103],
    purpose: "owner_image",
  });
});

test("owner uploads rejects unsupported file types before CMS upload", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("notes.txt", "text/plain")],
  });

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.match(json.error, /must be a JPEG, PNG, or WebP image/);
  assert.equal(calls.some((call) => call.path === "/api/upload"), false);
  assert.equal(calls.some((call) => call.path === "/api/owner/media-ownership/register"), false);
});

test("owner uploads rejects files larger than the configured limit before CMS upload", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("large.jpg", "image/jpeg", 8 * 1024 * 1024 + 1)],
  });

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.match(json.error, /exceeds the 8 MB limit/);
  assert.equal(calls.some((call) => call.path === "/api/upload"), false);
});

test("owner uploads rejects more than eight files before CMS upload", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: Array.from({ length: 9 }, (_, i) => imageFile(`image-${i}.jpg`, "image/jpeg")),
  });

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.match(json.error, /maximum of 8 images/);
  assert.equal(calls.some((call) => call.path === "/api/upload"), false);
});

test("owner uploads rejects requests without a file before CMS upload", async () => {
  const { res, json, calls } = await runWithMockedCms({ files: [] });

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.match(json.error, /At least one image file is required/);
  assert.equal(calls.some((call) => call.path === "/api/upload"), false);
});

test("owner uploads returns 502 when CMS file upload fails", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("one.jpg", "image/jpeg")],
    uploadStatus: 500,
    uploadJson: { error: { message: "upload failed" } },
  });

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Strapi upload failed");
  assert.equal(json.status, 500);
  assert.equal(calls.some((call) => call.path === "/api/owner/media-ownership/register"), false);
});

test("owner uploads rejects CMS upload results without a file id", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("one.jpg", "image/jpeg")],
    uploadJson: [
      {
        url: "/uploads/no-id.jpg",
        name: "no-id.jpg",
        mime: "image/jpeg",
        size: 12,
      },
    ],
  });

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Could not register uploaded files for owner");
  assert.equal(calls.some((call) => call.path === "/api/owner/media-ownership/register"), false);
});

test("owner uploads rejects a file that the owner service identifies as another owner's file", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("one.jpg", "image/jpeg")],
    uploadJson: [
      {
        id: 201,
        url: "/uploads/one.jpg",
        name: "one.jpg",
        mime: "image/jpeg",
        size: 12,
      },
    ],
    ownershipStatus: 403,
    ownershipJson: { ok: false, code: "owner_media_forbidden" },
  });

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Could not register uploaded files for owner");
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/media-ownership/register")?.body, {
    user_id: 7,
    file_ids: [201],
    purpose: "owner_image",
  });
});

test("owner uploads returns 502 when owner media registration fails", async () => {
  const { res, json, calls } = await runWithMockedCms({
    files: [imageFile("one.jpg", "image/jpeg")],
    uploadJson: [
      {
        id: 301,
        url: "/uploads/one.jpg",
        name: "one.jpg",
        mime: "image/jpeg",
        size: 12,
      },
    ],
    ownershipStatus: 500,
    ownershipJson: { ok: false, error: "register failed" },
  });

  assert.equal(res.status, 502);
  assert.equal(json.ok, false);
  assert.equal(json.error, "Could not register uploaded files for owner");
  assert.deepEqual(calls.find((call) => call.path === "/api/owner/media-ownership/register")?.body, {
    user_id: 7,
    file_ids: [301],
    purpose: "owner_image",
  });
});
