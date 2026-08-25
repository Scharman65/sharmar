import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  extractCmsAdminSummaryPayload,
  extractCmsBoatOwnerLinks,
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
    owner_verification_status: "approved",
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

const oceanisDocumentId = "ysn736g6n2e0pnhpcmsbo8sw";
const swiftDocumentId = "pcwdqr3gohdv9u6iv4x6l9f7";

function productionBoat(documentId: string, locale: string, id: number, overrides: JsonRecord = {}): JsonRecord {
  return boat(locale, {
    id,
    documentId,
    title: documentId === oceanisDocumentId ? `Oceanis ${locale}` : `Swift ${locale}`,
    slug: documentId === oceanisDocumentId ? `oceanis-${locale}` : `swift-${locale}`,
    owner_user_id: null,
    owner_display_name: null,
    owner_email: null,
    owner_confirmed: null,
    owner_blocked: null,
    ...overrides,
  });
}

function productionOwnerLink(documentId: string, locale: string, boatId: number): JsonRecord {
  return {
    boat_id: boatId,
    boat_document_id: documentId,
    boat_locale: locale,
    owner_user_id: 2,
    owner_email: "owner@example.test",
    owner_display_name: "Captain Owner",
    owner_verification_status: "approved",
    owner_confirmed: true,
    owner_blocked: false,
  };
}

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
  assert.ok(dashboardApi.includes("extractCmsBoatOwnerLinks(cmsSummary)"));
});

test("CMS admin summary root and nested payload shapes expose boatOwnerLinks", () => {
  const rootPayload = {
    ok: true,
    boatOwnerLinks: [productionOwnerLink(oceanisDocumentId, "ru", 10)],
    summary: { totalOwners: 1 },
  };
  const nestedPayload = {
    data: {
      ok: true,
      boatOwnerLinks: [productionOwnerLink(swiftDocumentId, "en", 5)],
      summary: { totalOwners: 1 },
    },
  };

  assert.equal(extractCmsAdminSummaryPayload(rootPayload)?.summary, rootPayload.summary);
  assert.deepEqual(extractCmsBoatOwnerLinks(rootPayload), rootPayload.boatOwnerLinks);
  assert.deepEqual(extractCmsBoatOwnerLinks(nestedPayload), nestedPayload.data.boatOwnerLinks);
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

test("production Oceanis and Swift rows receive owners from protected summary links", () => {
  const rows = [
    productionBoat(oceanisDocumentId, "ru", 8),
    productionBoat(oceanisDocumentId, "ru", 10, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    productionBoat(oceanisDocumentId, "en", 7),
    productionBoat(oceanisDocumentId, "en", 11, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    productionBoat(oceanisDocumentId, "sr-Latn-ME", 9),
    productionBoat(oceanisDocumentId, "sr-Latn-ME", 12, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    productionBoat(swiftDocumentId, "ru", 2),
    productionBoat(swiftDocumentId, "ru", 4, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    productionBoat(swiftDocumentId, "en", 1),
    productionBoat(swiftDocumentId, "en", 5, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
    productionBoat(swiftDocumentId, "sr-Latn-ME", 3),
    productionBoat(swiftDocumentId, "sr-Latn-ME", 6, { state: "published", publishedAt: "2026-07-01T00:00:00.000Z" }),
  ];
  const summary = {
    boatOwnerLinks: [
      productionOwnerLink(oceanisDocumentId, "en", 11),
      productionOwnerLink(oceanisDocumentId, "ru", 10),
      productionOwnerLink(oceanisDocumentId, "sr-Latn-ME", 12),
      productionOwnerLink(swiftDocumentId, "en", 5),
      productionOwnerLink(swiftDocumentId, "ru", 4),
      productionOwnerLink(swiftDocumentId, "sr-Latn-ME", 6),
    ],
  };
  const mergedRows = mergeBoatOwnerLinks(rows, extractCmsBoatOwnerLinks(summary));
  const logicalBoats = groupLogicalBoats(mergedRows, [], "ru");

  assert.equal(mergedRows.length, 12);
  assert.equal(mergedRows.filter((row) => row.owner_user_id === 2).length, 12);
  assert.deepEqual(logicalBoats.map((item) => item.documentId).sort(), [swiftDocumentId, oceanisDocumentId].sort());
  assert.equal(
    logicalBoats.some((logicalBoat) =>
      logicalBoat.blockers.some((blocker) => /owner|владелец|vlasnik/i.test(blocker))
    ),
    false
  );
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

test("CMS summary failures produce a dashboard error instead of false owner blockers", () => {
  assert.ok(dashboardApi.includes("cms_admin_summary_unauthorized"));
  assert.ok(dashboardApi.includes("cms_admin_summary_unavailable"));
  assert.ok(dashboardApi.includes("cms_admin_summary_token_missing"));
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

test("protected summary marina is merged into boat rows", () => {
  const rows = [
    boat("en", { id: 2, documentId: "oceanis-doc", marina_name: "", home_marina_name: "" }),
    boat("ru", { id: 1, documentId: "oceanis-doc", marina_name: "", home_marina_name: "" }),
    boat("sr-Latn-ME", { id: 3, documentId: "oceanis-doc", marina_name: "", home_marina_name: "" }),
  ];

  const merged = mergeBoatOwnerLinks(rows, [
    {
      boat_id: 2,
      boat_document_id: "oceanis-doc",
      boat_locale: "en",
      owner_user_id: 1,
      created_by_id: null,
      owner_profile_id: 1,
      owner_email: "owner@example.com",
      owner_username: "owner",
      owner_display_name: "Owner",
      owner_phone: null,
      owner_confirmed: true,
      owner_blocked: false,
      home_marina_id: 23,
      home_marina_document_id: "wcbpi4jzwqqje4l0yvbwote2",
      home_marina_name: "Herceg Novi",
      home_marina_slug: "herceg-novi",
      home_marina_locale: "en",
    },
  ]);

  const logicalBoats = groupLogicalBoats(merged, completeRoutes, "en");
  assert.equal(logicalBoats[0].primary.marina_name, "Herceg Novi");
  assert.equal(logicalBoats[0].blockers.includes("Marina is missing."), false);
});


test("routes admin groups locale rows into logical route cards", () => {
  assert.ok(cockpit.includes("const logicalRoutes = useMemo"));
  assert.ok(cockpit.includes("logicalRoutes.map((route)"));
  assert.ok(cockpit.includes("Technical route records"));
  assert.equal(cockpit.includes("{routes.map((route, index) =>"), false);
});

test("linked logical route hides stale technical boat blocker", () => {
  assert.ok(
    cockpit.includes(
      '.filter((field) => !(hasBoat && field.trim().toLowerCase() === "boat"))'
    )
  );
});

test("direct boat publish is fail closed and unified publication remains the only boat publish path", () => {
  assert.ok(
    cmsModeration.includes(
      'if (input.action === "publish_logical_boat")'
    )
  );

  assert.ok(
    cmsModeration.includes(
      'code: "unified_publication_required"'
    )
  );

  const boatDispatchStart =
    cmsModeration.indexOf(
      'if (input.entityType === "boat")'
    );

  const experienceDispatchStart =
    cmsModeration.indexOf(
      'if (input.entityType === "experience")',
      boatDispatchStart
    );

  assert.notEqual(boatDispatchStart, -1);
  assert.notEqual(experienceDispatchStart, -1);

  const boatDispatch =
    cmsModeration.slice(
      boatDispatchStart,
      experienceDispatchStart
    );

  assert.ok(
    boatDispatch.includes(
      'if (input.action === "publish")'
    )
  );

  assert.ok(
    boatDispatch.includes(
      'status: 409'
    )
  );

  assert.ok(
    boatDispatch.includes(
      'return publishUnifiedBoat(cms, input);'
    )
  );

  assert.ok(
    boatDispatch.includes(
      'return moderateBoat(cms, input);'
    )
  );
});

test("documents_uploaded owner verification blocks logical boat readiness", () => {
  const publicRows = [
    boat("ru", {
      owner_user_id: null,
      owner_display_name: null,
      owner_email: null,
      owner_verification_status: null,
    }),
    boat("en", {
      owner_user_id: null,
      owner_display_name: null,
      owner_email: null,
      owner_verification_status: null,
    }),
    boat("sr-Latn-ME", {
      owner_user_id: null,
      owner_display_name: null,
      owner_email: null,
      owner_verification_status: null,
    }),
  ];

  const mergedRows = mergeBoatOwnerLinks(publicRows, [
    {
      boat_id: 1,
      boat_document_id: "oceanis-doc",
      boat_locale: "ru",
      owner_user_id: 42,
      created_by_id: null,
      owner_profile_id: 7,
      owner_email: "pending-owner@example.test",
      owner_username: "pending-owner",
      owner_display_name: "Pending Owner",
      owner_phone: null,
      owner_verification_status: "documents_uploaded",
      owner_confirmed: true,
      owner_blocked: false,
      home_marina_id: null,
      home_marina_document_id: null,
      home_marina_name: null,
      home_marina_slug: null,
      home_marina_locale: null,
    },
  ]);

  assert.deepEqual(
    mergedRows.map((row) => row.owner_verification_status),
    ["documents_uploaded", "documents_uploaded", "documents_uploaded"]
  );

  const logicalBoats = groupLogicalBoats(
    mergedRows,
    completeRoutes,
    "ru"
  );

  assert.equal(logicalBoats.length, 1);
  assert.equal(
    logicalBoats[0].primary.owner_verification_status,
    "documents_uploaded"
  );
  assert.equal(logicalBoats[0].ready, false);
  assert.ok(
    logicalBoats[0].blockers.includes(
      "Владелец не подтвержден."
    )
  );
});


test("legacy CMS owner link without verification status keeps legacy readiness fallback", () => {
  const legacyRows = ["ru", "en", "sr-Latn-ME"].map((locale) => {
    const row = boat(locale);
    delete row.owner_verification_status;
    return row;
  });

  const mergedRows = mergeBoatOwnerLinks(legacyRows, [
    {
      boat_id: 1,
      boat_document_id: "oceanis-doc",
      boat_locale: "ru",
      owner_user_id: 42,
      created_by_id: null,
      owner_profile_id: 7,
      owner_email: "legacy-owner@example.test",
      owner_username: "legacy-owner",
      owner_display_name: "Legacy Owner",
      owner_phone: null,
      owner_confirmed: true,
      owner_blocked: false,
      home_marina_id: null,
      home_marina_document_id: null,
      home_marina_name: null,
      home_marina_slug: null,
      home_marina_locale: null,
    },
  ]);

  assert.equal(
    mergedRows.some((row) =>
      Object.prototype.hasOwnProperty.call(
        row,
        "owner_verification_status"
      )
    ),
    false
  );

  const logicalBoats = groupLogicalBoats(
    mergedRows,
    completeRoutes,
    "ru"
  );

  assert.equal(logicalBoats.length, 1);
  assert.equal(
    logicalBoats[0].blockers.includes(
      "Владелец не подтвержден."
    ),
    false
  );
  assert.equal(logicalBoats[0].ready, true);
});
