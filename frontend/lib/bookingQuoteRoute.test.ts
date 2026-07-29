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

    if (specifier.startsWith("@/")) {
      return nextResolve(resolveLocal(join(root, specifier.slice(2))), context);
    }

    return nextResolve(specifier, context);
  },
});

const routeModulePromise = import("../app/api/request/quote/route.ts");

const boat = {
  id: 13,
  documentId: "ysn736g6n2e0pnhpcmsbo8sw",
  slug: "beneteau-oceanis-46-1785012435597",
  currency: "EUR",
  min_rental_hours: 8,
  locale: "ru",
};

const routes = {
  petrovac: {
    id: 28,
    documentId: "xo1tjoenq8bumdhzasyn6w11",
    title: "Петровац",
    duration_hours: 6,
    price: 500,
    currency: "EUR",
    locale: "ru",
    boat: { documentId: boat.documentId, slug: boat.slug },
  },
  svetiStefan: {
    id: 25,
    documentId: "so4kfbhj5jgzm15nx9lij5dr",
    title: "Свети Стефан",
    duration_hours: 8,
    price: 650,
    currency: "EUR",
    locale: "ru",
    boat: { documentId: boat.documentId, slug: boat.slug },
  },
  otherBoat: {
    id: 99,
    documentId: "otherboatroute99",
    title: "Other boat route",
    duration_hours: 6,
    price: 900,
    currency: "EUR",
    locale: "ru",
    boat: { documentId: "otherboatdocument", slug: "other-boat" },
  },
};

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetchMock() {
  const calls: URL[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url);

    if (url.pathname === "/api/boats") {
      const slug = url.searchParams.get("filters[slug][$eq]");
      const documentId = url.searchParams.get("filters[documentId][$eq]");
      const matched =
        slug === boat.slug || documentId === boat.documentId
          ? [boat]
          : [];
      return response({ data: matched });
    }

    if (url.pathname === "/api/experiences") {
      const documentId = url.searchParams.get("filters[documentId][$eq]");
      const numericId = Number(url.searchParams.get("filters[id][$eq]"));
      const status = url.searchParams.get("status");
      const allRoutes = [routes.petrovac, routes.svetiStefan, routes.otherBoat];
      const matched =
        status === "published"
          ? allRoutes.filter((item) =>
              documentId
                ? item.documentId === documentId
                : Number.isSafeInteger(numericId) && item.id === numericId
            )
          : [];
      return response({ data: matched });
    }

    return response({ data: [] });
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function quoteUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams({
    boatSlug: boat.slug,
    boatDocumentId: boat.documentId,
    locale: "ru",
    slot_start_utc: "2026-07-31T07:00:00.000Z",
    slot_end_utc: "2026-07-31T13:00:00.000Z",
    ...params,
  });
  return `http://localhost/api/request/quote?${qs.toString()}`;
}

test("Petrovac quote uses canonical documentId and returns 500/50/550 for six hours", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(new Request(quoteUrl({ experienceDocumentId: routes.petrovac.documentId })));
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.routeDocumentId, routes.petrovac.documentId);
    assert.equal(json.routeId, routes.petrovac.id);
    assert.equal(json.durationHours, 6);
    assert.equal(json.ownerAmount, 500);
    assert.equal(json.marketplaceFeeAmount, 50);
    assert.equal(json.customerTotalAmount, 550);
    assert.ok(fetchMock.calls.some((url) => url.searchParams.get("filters[documentId][$eq]") === routes.petrovac.documentId));
  } finally {
    fetchMock.restore();
  }
});

test("Sveti Stefan quote returns 650/65/715 for eight hours", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(
      new Request(quoteUrl({
        experienceDocumentId: routes.svetiStefan.documentId,
        slot_end_utc: "2026-07-31T15:00:00.000Z",
      }))
    );
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.routeDocumentId, routes.svetiStefan.documentId);
    assert.equal(json.durationHours, 8);
    assert.equal(json.ownerAmount, 650);
    assert.equal(json.marketplaceFeeAmount, 65);
    assert.equal(json.customerTotalAmount, 715);
  } finally {
    fetchMock.restore();
  }
});

test("invalid experience identifier fails closed without calculating price", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(new Request(quoteUrl({ experienceDocumentId: "bad" })));
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.equal(json.error, "invalid_experience_identifier");
    assert.equal("customerTotalAmount" in json, false);
  } finally {
    fetchMock.restore();
  }
});

test("experience from another boat is rejected", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(new Request(quoteUrl({ experienceDocumentId: routes.otherBoat.documentId })));
    const json = await res.json();

    assert.equal(res.status, 409);
    assert.equal(json.error, "experience_boat_mismatch");
  } finally {
    fetchMock.restore();
  }
});

test("client price params do not influence server quote", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(
      new Request(quoteUrl({
        experienceDocumentId: routes.petrovac.documentId,
        experiencePrice: "1",
        experienceCurrency: "USD",
      }))
    );
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.currency, "EUR");
    assert.equal(json.ownerAmount, 500);
    assert.equal(json.customerTotalAmount, 550);
  } finally {
    fetchMock.restore();
  }
});

test("legacy numeric id fallback remains narrow and validates boat relation", async () => {
  const fetchMock = installFetchMock();
  try {
    const route = await routeModulePromise;
    const res = await route.GET(new Request(quoteUrl({ experienceId: String(routes.petrovac.id) })));
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.routeDocumentId, routes.petrovac.documentId);
    assert.ok(fetchMock.calls.some((url) => url.searchParams.get("filters[id][$eq]") === String(routes.petrovac.id)));
  } finally {
    fetchMock.restore();
  }
});
