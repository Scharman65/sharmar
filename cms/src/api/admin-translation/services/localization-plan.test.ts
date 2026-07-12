import assert from "node:assert/strict";
import test from "node:test";
import {
  frontendLocaleToStrapiLocale,
  planLocalization,
  type ExistingLocalization,
  type JsonObject,
  type Locale,
} from "./localization-plan.ts";

const documentId = "doc_safe_translation_test";

function row(overrides: Partial<ExistingLocalization> = {}): ExistingLocalization {
  return {
    id: 1,
    documentId,
    locale: "ru",
    publishedAt: null,
    title: "Old title",
    description: "Old description",
    ...overrides,
  };
}

function boatPlan(params: {
  targetLocale?: Locale | null;
  sourceLocale?: Locale | null;
  translation?: JsonObject;
  sourceExists?: boolean;
  draftRows?: ExistingLocalization[];
  publishedRows?: ExistingLocalization[];
}) {
  return planLocalization({
    contentType: "boat",
    documentId,
    sourceLocale: params.sourceLocale ?? "en",
    targetLocale: params.targetLocale ?? "ru",
    translation: params.translation ?? { title: "Новый заголовок", description: "Новое описание" },
    sourceExists: params.sourceExists ?? true,
    draftRows: params.draftRows ?? [],
    publishedRows: params.publishedRows ?? [],
  });
}

function experiencePlan(params: {
  targetLocale?: Locale | null;
  sourceLocale?: Locale | null;
  translation?: JsonObject;
  sourceExists?: boolean;
  draftRows?: ExistingLocalization[];
  publishedRows?: ExistingLocalization[];
}) {
  return planLocalization({
    contentType: "experience",
    documentId,
    sourceLocale: params.sourceLocale ?? "en",
    targetLocale: params.targetLocale ?? "ru",
    translation: params.translation ?? {
      title: "Ruta",
      short_description: "Kratak opis",
      full_description: "Pun opis",
      included_services: "Gorivo",
      meeting_point: "Marina",
    },
    sourceExists: params.sourceExists ?? true,
    draftRows: params.draftRows ?? [],
    publishedRows: params.publishedRows ?? [],
  });
}

test("boat missing RU locale plans CREATE_MISSING_LOCALIZATION as draft", () => {
  const plan = boatPlan({});
  assert.equal(plan.operation, "CREATE_MISSING_LOCALIZATION");
  assert.equal(plan.documentId, documentId);
  assert.equal(plan.locale, "ru");
  assert.equal(plan.doesPublish, false);
  assert.deepEqual(plan.fieldsToWrite, ["title", "description"]);
});

test("frontend ME maps to Strapi sr-Latn-ME", () => {
  assert.equal(frontendLocaleToStrapiLocale("me"), "sr-Latn-ME");
  const plan = boatPlan({ targetLocale: frontendLocaleToStrapiLocale("me") });
  assert.equal(plan.operation, "CREATE_MISSING_LOCALIZATION");
  assert.equal(plan.locale, "sr-Latn-ME");
});

test("existing RU draft updates the existing draft instead of creating a new row", () => {
  const plan = boatPlan({ draftRows: [row({ title: "Старый заголовок", description: "Старое описание" })] });
  assert.equal(plan.operation, "UPDATE_EXISTING_DRAFT");
  assert.equal(plan.draftExists, true);
  assert.equal(plan.draftId, 1);
});

test("existing RU published blocks save-draft", () => {
  const plan = boatPlan({ publishedRows: [row({ id: 2, publishedAt: "2026-01-01T00:00:00.000Z" })] });
  assert.equal(plan.operation, "BLOCKED_ALREADY_PUBLISHED");
  assert.equal(plan.blocked, true);
});

test("duplicate concurrent target rows are blocked", () => {
  const plan = boatPlan({ draftRows: [row({ id: 1 }), row({ id: 2 })] });
  assert.equal(plan.operation, "BLOCKED_DUPLICATE_RISK");
  assert.equal(plan.blocked, true);
});

test("same source and target locale is rejected", () => {
  const plan = boatPlan({ sourceLocale: "ru", targetLocale: "ru" });
  assert.equal(plan.operation, "BLOCKED_UNSUPPORTED_LOCALE");
  assert.equal(plan.blocked, true);
});

test("unsupported locale is rejected", () => {
  const plan = planLocalization({
    contentType: "boat",
    documentId,
    sourceLocale: "en",
    targetLocale: null,
    translation: { title: "Title" },
    sourceExists: true,
    draftRows: [],
    publishedRows: [],
  });
  assert.equal(plan.operation, "BLOCKED_UNSUPPORTED_LOCALE");
});

test("unknown documentId/source localization is rejected", () => {
  const plan = boatPlan({ sourceExists: false });
  assert.equal(plan.operation, "BLOCKED_INVALID_DOCUMENT");
});

test("forbidden slug field is rejected", () => {
  const plan = boatPlan({ translation: { title: "Title", slug: "forbidden" } });
  assert.equal(plan.operation, "BLOCKED_FORBIDDEN_FIELDS");
  assert.equal(plan.fieldsToWrite.length, 0);
});

test("publishedAt injection is rejected", () => {
  const plan = boatPlan({ translation: { title: "Title", publishedAt: "2026-01-01T00:00:00.000Z" } });
  assert.equal(plan.operation, "BLOCKED_FORBIDDEN_FIELDS");
});

test("media and relations from request are rejected", () => {
  const plan = boatPlan({ translation: { title: "Title", cover: 1, images: [1], home_marina: 2 } });
  assert.equal(plan.operation, "BLOCKED_FORBIDDEN_FIELDS");
});

test("dry-run plan contains sanitized data but performs no write itself", () => {
  const plan = boatPlan({ translation: { title: "Title", description: "Description" } });
  assert.equal(plan.doesWrite, true);
  assert.equal(plan.doesPublish, false);
  assert.deepEqual(plan.sanitizedData, { title: "Title", description: "Description" });
});

test("experience missing localization uses the same create/update safeguards", () => {
  const createPlan = experiencePlan({ targetLocale: "sr-Latn-ME" });
  assert.equal(createPlan.operation, "CREATE_MISSING_LOCALIZATION");
  assert.deepEqual(createPlan.fieldsToWrite, ["title", "short_description", "full_description", "included_services", "meeting_point"]);

  const updatePlan = experiencePlan({
    draftRows: [row({ short_description: "Old", full_description: "Old", included_services: "Old", meeting_point: "Old" })],
  });
  assert.equal(updatePlan.operation, "UPDATE_EXISTING_DRAFT");
});
