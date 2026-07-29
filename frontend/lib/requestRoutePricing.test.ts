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

const requestModulePromise = import("../app/api/request/route.ts");
const quoteModulePromise = import("../app/api/request/quote/route.ts");

const secret = "12345678901234567890123456789012";

const boat = {
  id: 13,
  documentId: "ysn736g6n2e0pnhpcmsbo8sw",
  slug: "beneteau-oceanis-46-1785012435597",
  currency: "EUR",
  min_rental_hours: 8,
  price_per_day: 650,
  locale: "ru",
};

const routes = {
  petrovac: {
    id: 28,
    documentId: "xo1tjoenq8bumdhzasyn6w11",
    title: "Petrovac",
    duration_hours: 6,
    price: 500,
    currency: "EUR",
    locale: "ru",
    boat: { documentId: boat.documentId, slug: boat.slug },
  },
  svetiStefan: {
    id: 25,
    documentId: "so4kfbhj5jgzm15nx9lij5dr",
    title: "Sveti Stefan",
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
  draft: {
    id: 100,
    documentId: "draftpetrovac99",
    title: "Draft Petrovac",
    duration_hours: 6,
    price: 500,
    currency: "EUR",
    locale: "ru",
    boat: { documentId: boat.documentId, slug: boat.slug },
  },
};

type FetchCall = {
  method: string;
  url: URL;
  body: unknown;
};

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function installFetchMock() {
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.SHARMAR_E2E_TEST_SECRET;
  process.env.SHARMAR_E2E_TEST_SECRET = secret;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = String(init?.method || "GET").toUpperCase();
    const body = parseBody(init?.body);
    calls.push({ method, url, body });

    if (url.pathname === "/api/boats") {
      const slug = url.searchParams.get("filters[slug][$eq]");
      const documentId = url.searchParams.get("filters[documentId][$eq]");
      const matched = slug === boat.slug || documentId === boat.documentId ? [boat] : [];
      return response({ data: matched });
    }

    if (url.pathname === "/api/experiences") {
      const documentId = url.searchParams.get("filters[documentId][$eq]");
      const numericId = Number(url.searchParams.get("filters[id][$eq]"));
      const status = url.searchParams.get("status");
      const allPublished = [routes.petrovac, routes.svetiStefan, routes.otherBoat];
      const source = status === "draft" ? [routes.draft] : allPublished;
      const matched = source.filter((item) =>
        documentId
          ? item.documentId === documentId
          : Number.isSafeInteger(numericId) && item.id === numericId
      );
      return response({ data: matched });
    }

    if (url.pathname === "/api/request" && method === "POST") {
      return response({ data: { id: 321 } });
    }

    if (url.pathname === "/api/boats-owner-contact-by-slug") {
      return response({ ok: true, data: { notifications_allowed: false } });
    }

    return response({ data: [] });
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
      if (originalSecret === undefined) {
        delete process.env.SHARMAR_E2E_TEST_SECRET;
      } else {
        process.env.SHARMAR_E2E_TEST_SECRET = originalSecret;
      }
    },
  };
}

function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    boatSlug: boat.slug,
    boatTitle: "Beneteau Oceanis 46",
    name: "Test Client",
    phone: "+38200000000",
    email: "client@example.invalid",
    dateFrom: "2026-07-31",
    dateTo: "2026-07-31",
    timeFrom: "09:00",
    timeTo: "15:00",
    peopleCount: 7,
    needSkipper: false,
    client_ts: Date.now() - 5000,
    publicToken: "local-test-token",
    hp: "",
    ...overrides,
  };
}

async function postRequest(payload: Record<string, unknown>) {
  const route = await requestModulePromise;
  return route.POST(
    new Request("http://localhost/ru/api/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sharmar-e2e-suppress-notifications": "1",
        "x-sharmar-e2e-test-secret": secret,
      },
      body: JSON.stringify(payload),
    })
  );
}

function createCalls(calls: FetchCall[]): FetchCall[] {
  return calls.filter((call) => call.method === "POST" && call.url.pathname === "/api/request");
}

function notificationCalls(calls: FetchCall[]): FetchCall[] {
  return calls.filter((call) => call.url.pathname.includes("notification-deliveries"));
}

function createData(call: FetchCall | undefined): Record<string, unknown> {
  assert.ok(call);
  assert.ok(call.body && typeof call.body === "object");
  const data = (call.body as { data?: unknown }).data;
  assert.ok(data && typeof data === "object");
  return data as Record<string, unknown>;
}

test("Petrovac request uses authoritative six-hour route pricing and creates 500/50/550 request body", async () => {
  const fetchMock = installFetchMock();
  try {
    const res = await postRequest(bookingPayload({
      experienceDocumentId: routes.petrovac.documentId,
      experienceId: routes.petrovac.id,
      hours: 8,
    }));
    const json = await res.json();
    const [create] = createCalls(fetchMock.calls);
    const data = createData(create);

    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(data.boat, boat.id);
    assert.equal(data.experience, routes.petrovac.id);
    assert.equal(data.start_datetime, "2026-07-31T07:00:00.000Z");
    assert.equal(data.end_datetime, "2026-07-31T13:00:00.000Z");
    assert.equal(data.people_count, 7);
    assert.equal(data.need_skipper, false);
    assert.equal(data.owner_amount, 500);
    assert.equal(data.marketplace_fee_amount, 50);
    assert.equal(data.customer_total_amount, 550);
    assert.equal(data.currency, "EUR");
  } finally {
    fetchMock.restore();
  }
});

test("Sveti Stefan request uses authoritative eight-hour route pricing and creates 650/65/715 request body", async () => {
  const fetchMock = installFetchMock();
  try {
    const res = await postRequest(bookingPayload({
      experienceDocumentId: routes.svetiStefan.documentId,
      timeTo: "17:00",
    }));
    const [create] = createCalls(fetchMock.calls);
    const data = createData(create);

    assert.equal(res.status, 200);
    assert.equal(data.experience, routes.svetiStefan.id);
    assert.equal(data.end_datetime, "2026-07-31T15:00:00.000Z");
    assert.equal(data.owner_amount, 650);
    assert.equal(data.marketplace_fee_amount, 65);
    assert.equal(data.customer_total_amount, 715);
  } finally {
    fetchMock.restore();
  }
});

test("generic boat rental preserves the eight-hour minimum rule", async () => {
  const shortMock = installFetchMock();
  try {
    const shortRes = await postRequest(bookingPayload({ timeTo: "15:00" }));
    const shortJson = await shortRes.json();

    assert.equal(shortRes.status, 409);
    assert.equal(shortJson.error, "rental_duration_mismatch");
    assert.equal(createCalls(shortMock.calls).length, 0);
  } finally {
    shortMock.restore();
  }

  const validMock = installFetchMock();
  try {
    const validRes = await postRequest(bookingPayload({ timeTo: "17:00" }));
    const [create] = createCalls(validMock.calls);
    const data = createData(create);

    assert.equal(validRes.status, 200);
    assert.equal(data.experience, undefined);
    assert.equal(data.owner_amount, 650);
    assert.equal(data.marketplace_fee_amount, 65);
    assert.equal(data.customer_total_amount, 715);
  } finally {
    validMock.restore();
  }
});

test("route end-time tampering is rejected before create or notification side effects", async () => {
  const fetchMock = installFetchMock();
  try {
    const res = await postRequest(bookingPayload({
      experienceDocumentId: routes.petrovac.documentId,
      timeTo: "17:00",
    }));
    const json = await res.json();

    assert.equal(res.status, 409);
    assert.equal(json.error, "route_duration_mismatch");
    assert.equal(createCalls(fetchMock.calls).length, 0);
    assert.equal(notificationCalls(fetchMock.calls).length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("route from another boat is rejected before create", async () => {
  const fetchMock = installFetchMock();
  try {
    const res = await postRequest(bookingPayload({
      experienceDocumentId: routes.otherBoat.documentId,
    }));
    const json = await res.json();

    assert.equal(res.status, 409);
    assert.equal(json.error, "experience_boat_mismatch");
    assert.equal(createCalls(fetchMock.calls).length, 0);
  } finally {
    fetchMock.restore();
  }
});

test("invalid and unpublished routes fail closed", async () => {
  const invalidMock = installFetchMock();
  try {
    const invalidRes = await postRequest(bookingPayload({ experienceDocumentId: "bad" }));
    const invalidJson = await invalidRes.json();

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidJson.error, "Invalid experienceDocumentId.");
    assert.equal(createCalls(invalidMock.calls).length, 0);
  } finally {
    invalidMock.restore();
  }

  const draftMock = installFetchMock();
  try {
    const draftRes = await postRequest(bookingPayload({ experienceDocumentId: routes.draft.documentId }));
    const draftJson = await draftRes.json();

    assert.equal(draftRes.status, 404);
    assert.equal(draftJson.error, "experience_unpublished");
    assert.equal(createCalls(draftMock.calls).length, 0);
  } finally {
    draftMock.restore();
  }
});

test("quote and create share route duration and price semantics", async () => {
  const fetchMock = installFetchMock();
  try {
    const quoteRoute = await quoteModulePromise;
    const quoteRes = await quoteRoute.GET(
      new Request(
        `http://localhost/api/request/quote?boatSlug=${boat.slug}&boatDocumentId=${boat.documentId}&locale=ru&experienceDocumentId=${routes.petrovac.documentId}&slot_start_utc=2026-07-31T07%3A00%3A00.000Z&slot_end_utc=2026-07-31T13%3A00%3A00.000Z`
      )
    );
    const quote = await quoteRes.json();

    const requestRes = await postRequest(bookingPayload({
      experienceDocumentId: routes.petrovac.documentId,
    }));
    const [create] = createCalls(fetchMock.calls);
    const data = createData(create);

    assert.equal(quoteRes.status, 200);
    assert.equal(requestRes.status, 200);
    assert.equal(quote.durationHours, 6);
    assert.equal(quote.ownerAmount, data.owner_amount);
    assert.equal(quote.marketplaceFeeAmount, data.marketplace_fee_amount);
    assert.equal(quote.customerTotalAmount, data.customer_total_amount);
  } finally {
    fetchMock.restore();
  }
});
