import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  groupLogicalBoats,
  logicalDocumentCount,
  mergeBoatOwnerLinks,
  routePriceInvariantRows,
  type JsonRecord,
} from "./adminUnifiedBoatWorkflow.ts";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(frontendRoot, path), "utf8");
}

function sourceBlock(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} not found`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const dashboardApi = read("app/api/admin/dashboard/route.ts");
const moderationApi = read("app/api/admin/moderation/route.ts");
const saveDraftApi = read("app/api/admin/translations/save-draft/route.ts");
const previewApi = read("app/api/admin/translations/preview/route.ts");
const cmsModeration = read("../cms/src/api/admin-moderation/services/admin-moderation.ts");

function boat(locale: string, overrides: JsonRecord = {}): JsonRecord {
  return {
    id: locale === "ru" ? 1 : locale === "en" ? 2 : 3,
    documentId: "oceanis-doc",
    locale,
    title: `Oceanis ${locale}`,
    slug: `oceanis-${locale}`,
    moderation_status: "approved",
    owner_display_name: "Captain Owner",
    owner_email: "owner@example.test",
    owner_confirmed: true,
    owner_documents_count: 1,
    cover_count: 1,
    images_count: 2,
    marina_name: "Porto Montenegro",
    price_per_day: 650,
    currency: "EUR",
    capacity: 8,
    year: 2022,
    ...overrides,
  };
}

function route(documentId: string, locale: string, overrides: JsonRecord = {}): JsonRecord {
  const defaults = documentId === "petrovac-doc"
    ? { title: "Petrovac", duration_hours: 6, price: 500 }
    : { title: "Sveti Stefan", duration_hours: 8, price: 650 };
  return {
    id: `${documentId}-${locale}`,
    documentId,
    locale,
    slug: `${documentId}-${locale}`,
    boatDocumentId: "oceanis-doc",
    short_description: `${defaults.title} route`,
    full_description: `${defaults.title} route description`,
    included_services: "Fuel",
    meeting_point: "Marina",
    currency: "EUR",
    cover_count: 1,
    gallery_count: 1,
    moderation_status: "approved",
    ...defaults,
    ...overrides,
  };
}

const completeRoutes = [
  ...["ru", "en", "sr-Latn-ME"].map((locale) => route("petrovac-doc", locale)),
  ...["ru", "en", "sr-Latn-ME"].map((locale) => route("sveti-stefan-doc", locale)),
];

test("one logical boat card is produced despite EN/RU/ME rows", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru"),
    boat("en", { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    boat("sr-Latn-ME"),
  ], completeRoutes, "ru");

  assert.equal(logicalBoats.length, 1);
  assert.equal(logicalBoats[0].documentId, "oceanis-doc");
  assert.equal(logicalBoats[0].locales.ru?.title, "Oceanis ru");
  assert.equal(logicalBoats[0].locales.en?.title, "Oceanis en");
  assert.equal(logicalBoats[0].locales["sr-Latn-ME"]?.title, "Oceanis sr-Latn-ME");
});

test("duplicate boat cards are not created and duplicate locale rows become blockers", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru"),
    boat("ru", { id: 99, title: "Oceanis duplicate" }),
    boat("en"),
    boat("sr-Latn-ME"),
  ], completeRoutes, "en");

  assert.equal(logicalBoats.length, 1);
  assert.equal(logicalBoats[0].blockers.some((blocker) => /Duplicate RU|дубли|duplikati/i.test(blocker)), true);
});

test("routes are grouped under the correct logical boat", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru"),
    boat("en"),
    boat("sr-Latn-ME"),
  ], [
    ...completeRoutes,
    route("wrong-boat-route", "ru", { boatDocumentId: "other-boat" }),
  ], "en");

  assert.equal(logicalBoats.length, 1);
  assert.deepEqual(logicalBoats[0].routes.map((item) => item.documentId).sort(), ["petrovac-doc", "sveti-stefan-doc"]);
});

test("missing boat or route locales block batch publication readiness", () => {
  let logicalBoats = groupLogicalBoats([boat("ru"), boat("en")], completeRoutes, "en");
  assert.equal(logicalBoats[0].ready, false);
  assert.equal(logicalBoats[0].blockers.some((blocker) => /ME|me/i.test(blocker)), true);

  logicalBoats = groupLogicalBoats([
    boat("ru"),
    boat("en"),
    boat("sr-Latn-ME"),
  ], completeRoutes.filter((row) => !(row.documentId === "petrovac-doc" && row.locale === "en")), "en");
  assert.equal(logicalBoats[0].ready, false);
  assert.equal(logicalBoats[0].blockers.some((blocker) => /Petrovac/.test(blocker)), true);
});

test("owner and marina are aggregated from any localization row", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru", {
      owner_display_name: null,
      owner_email: null,
      owner_user_id: null,
      marina_name: "",
    }),
    boat("en", {
      state: "published",
      publishedAt: "2026-07-01T00:00:00.000Z",
      owner_display_name: null,
      owner_email: null,
      owner_user_id: 2,
      marina_name: "Bar",
    }),
    boat("sr-Latn-ME", {
      owner_display_name: null,
      owner_email: null,
      owner_user_id: null,
      marina_name: "",
    }),
  ], completeRoutes, "ru");

  assert.equal(logicalBoats.length, 1);
  assert.equal(logicalBoats[0].primary.owner_user_id, 2);
  assert.equal(logicalBoats[0].primary.marina_name, "Bar");
  assert.equal(
    logicalBoats[0].blockers.some((blocker) => /owner|владелец|vlasnik/i.test(blocker)),
    false
  );
  assert.equal(
    logicalBoats[0].blockers.some((blocker) => /marina|марина/i.test(blocker)),
    false
  );
});

test("dashboard boat query does not request private owner_user_id from public Strapi Content API", () => {
  const queryBlock = sourceBlock(dashboardApi, "function boatQuery", "function experienceQuery");
  assert.doesNotMatch(queryBlock, /owner_user_id/);
  assert.ok(dashboardApi.includes("mergeBoatOwnerLinks("));
  assert.ok(dashboardApi.includes("cmsSummary?.boatOwnerLinks"));
});

test("CMS boatOwnerLinks supply owner when public Strapi boat rows omit owner_user_id", () => {
  const publicRows = [
    boat("ru", { owner_user_id: undefined, owner_display_name: null, owner_email: null, owner_confirmed: null }),
    boat("en", { owner_user_id: undefined, owner_display_name: null, owner_email: null, owner_confirmed: null }),
    boat("sr-Latn-ME", { owner_user_id: undefined, owner_display_name: null, owner_email: null, owner_confirmed: null }),
  ];
  const mergedRows = mergeBoatOwnerLinks(publicRows, [
    {
      boat_id: 1,
      boat_document_id: "oceanis-doc",
      boat_locale: "ru",
      owner_user_id: 42,
      owner_email: "owner@example.test",
      owner_display_name: "Captain Owner",
      owner_confirmed: true,
      owner_blocked: false,
    },
  ]);
  const logicalBoats = groupLogicalBoats(mergedRows, completeRoutes, "ru");

  assert.equal(logicalBoats[0].primary.owner_user_id, 42);
  assert.equal(logicalBoats[0].primary.owner_display_name, "Captain Owner");
  assert.equal(
    logicalBoats[0].blockers.some((blocker) => /owner|владелец|vlasnik/i.test(blocker)),
    false
  );
});

test("owner link for one physical row is applied to every row of the same logical boat", () => {
  const publicRows = [
    boat("ru", { owner_user_id: null, owner_display_name: null, owner_email: null }),
    boat("en", { id: 22, owner_user_id: null, owner_display_name: null, owner_email: null }),
    boat("sr-Latn-ME", { owner_user_id: null, owner_display_name: null, owner_email: null }),
  ];
  const mergedRows = mergeBoatOwnerLinks(publicRows, [
    {
      boat_id: 22,
      boat_document_id: "oceanis-doc",
      boat_locale: "en",
      owner_user_id: 84,
      owner_email: "owner@example.test",
      owner_display_name: "Captain Owner",
      owner_confirmed: true,
      owner_blocked: false,
    },
  ]);

  assert.deepEqual(mergedRows.map((row) => row.owner_user_id), [84, 84, 84]);
  assert.deepEqual(mergedRows.map((row) => row.owner_display_name), ["Captain Owner", "Captain Owner", "Captain Owner"]);
});

test("owner link null values do not erase owner data already present on a boat row", () => {
  const mergedRows = mergeBoatOwnerLinks([
    boat("ru", {
      owner_user_id: 17,
      owner_email: "existing@example.test",
      owner_display_name: "Existing Owner",
      owner_confirmed: true,
    }),
  ], [
    {
      boat_id: 1,
      boat_document_id: "oceanis-doc",
      boat_locale: "ru",
      owner_user_id: null,
      owner_email: null,
      owner_display_name: null,
      owner_confirmed: null,
      owner_blocked: null,
    },
  ]);

  assert.equal(mergedRows[0].owner_user_id, 17);
  assert.equal(mergedRows[0].owner_email, "existing@example.test");
  assert.equal(mergedRows[0].owner_display_name, "Existing Owner");
  assert.equal(mergedRows[0].owner_confirmed, true);
});

test("RU primary without marina uses EN published marina for the logical boat", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru", { marina_name: "", state: "draft", publishedAt: null }),
    boat("en", { marina_name: "Bar", state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    boat("sr-Latn-ME", { marina_name: "" }),
  ], completeRoutes, "ru");

  assert.equal(logicalBoats[0].primary.marina_name, "Bar");
  assert.equal(
    logicalBoats[0].blockers.some((blocker) => /marina|марина/i.test(blocker)),
    false
  );
});

test("boat API query failures produce a dashboard error instead of a silent zero-boats success", () => {
  assert.ok(dashboardApi.includes("strapi_boat_query_failed"));
  assert.ok(dashboardApi.includes("boatResult.failed > 0 && boatResult.rows.length === 0"));
  assert.ok(dashboardApi.includes("status: 502"));
});

test("owner, documents, media, and marina failures block readiness before publish", () => {
  const logicalBoats = groupLogicalBoats([
    boat("ru", { owner_confirmed: false, owner_documents_count: 0, cover_count: 0, images_count: 0, marina_name: "" }),
    boat("en", { owner_confirmed: false, owner_documents_count: 0, cover_count: 0, images_count: 0, marina_name: "" }),
    boat("sr-Latn-ME", { owner_confirmed: false, owner_documents_count: 0, cover_count: 0, images_count: 0, marina_name: "" }),
  ], completeRoutes, "en");

  assert.equal(logicalBoats[0].ready, false);
  assert.ok(logicalBoats[0].blockers.length >= 4);
});

test("Petrovac, Sveti Stefan, and Oceanis commercial values stay unchanged", () => {
  const invariants = routePriceInvariantRows(completeRoutes);
  const petrovac = invariants.find((row) => row.title === "Petrovac");
  const svetiStefan = invariants.find((row) => row.title === "Sveti Stefan");

  assert.equal(petrovac?.duration_hours, 6);
  assert.equal(petrovac?.price, 500);
  assert.equal(svetiStefan?.duration_hours, 8);
  assert.equal(svetiStefan?.price, 650);
  assert.equal(boat("en").price_per_day, 650);
});

test("dashboard counters and cockpit use logical documents rather than localization rows", () => {
  assert.equal(logicalDocumentCount([boat("ru"), boat("en"), boat("sr-Latn-ME")]), 1);
  assert.ok(dashboardApi.includes("localizationRowBoats"));
  assert.ok(dashboardApi.includes("totalBoats: uniqueModerationBoats.length"));
  assert.ok(cockpit.includes("groupLogicalBoats(boats, routes, lang)"));
});

test("Translate and review saves drafts and never publishes", () => {
  assert.ok(cockpit.includes('generateAi: true'));
  assert.ok(cockpit.includes('confirmSaveDraft: true'));
  assert.ok(saveDraftApi.includes("doesPublish: false"));
  assert.doesNotMatch(saveDraftApi, /\.publish\(/);
  assert.ok(previewApi.includes("Do not change prices, currency, duration"));
});

test("batch publish requires moderation permission, same-origin, and one server-side command", () => {
  assert.ok(moderationApi.includes('sessionStatus.session.permissions.includes("moderation")'));
  assert.ok(moderationApi.includes("sameOriginRequest(req)"));
  assert.ok(cockpit.includes('action: "publish_logical_boat"'));
  assert.ok(cmsModeration.includes("publishUnifiedBoat"));
  assert.ok(cmsModeration.includes("planUnifiedBoatPublication"));
});

test("duplicate submit protection and safe responses avoid token or cookie data", () => {
  assert.ok(cockpit.includes("pendingBoatAction"));
  assert.doesNotMatch(cockpit, /Authorization|Bearer|x-admin-token|document\.cookie|localStorage|sessionStorage/);
  assert.doesNotMatch(cmsModeration, /cookie|Authorization|Bearer|token|session/i);
});

test("RU, EN, and ME user-visible copy contains the required button text without fallback leakage", () => {
  assert.ok(cockpit.includes("Перевести и проверить"));
  assert.ok(cockpit.includes("Translate and review"));
  assert.ok(cockpit.includes("Prevedi i provjeri"));
  assert.ok(cockpit.includes("Опубликовать"));
  assert.ok(cockpit.includes("Publish"));
  assert.ok(cockpit.includes("Objavi"));
});
