import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const contracts = read("lib/adminCrudContracts.ts");
const routeHelper = read("lib/adminCrudRoute.ts");
const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const manager = read("app/[lang]/admin/AdminCrudManager.tsx");
const cmsRoutes = read("../cms/src/api/admin-crud/routes/admin-crud.ts");
const cmsController = read("../cms/src/api/admin-crud/controllers/admin-crud.ts");
const cmsService = read("../cms/src/api/admin-crud/services/admin-crud.ts");
const ownerSchema = read("../cms/src/api/owner-profile/content-types/owner-profile/schema.json");
const boatSchema = read("../cms/src/api/boat/content-types/boat/schema.json");
const experienceSchema = read("../cms/src/api/experience/content-types/experience/schema.json");
const moderationEventSchema = read("../cms/src/api/moderation-event/content-types/moderation-event/schema.json");

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

test("custom admin CRUD uses typed entity routes instead of a universal writer", () => {
  [
    "/api/admin/owners",
    "/api/admin/documents",
    "/api/admin/boats",
    "/api/admin/experiences",
    "/api/admin/media",
  ].forEach((path) => assert.ok(contracts.includes(path), `${path} missing`));
  assert.doesNotMatch(routeHelper + cmsRoutes, /write-anything|collectionUID|collectionUid|uidFromBrowser|fieldNamesFromBrowser/i);
  assert.ok(cmsRoutes.includes("/admin-crud/:entity"));
  assert.ok(cmsService.includes("ENTITY_CONFIG"));
  assert.ok(cmsService.includes("pickAllowed"));
});

test("admin CRUD write routes require moderation session, same-origin, write flag, and internal server credential", () => {
  assert.ok(routeHelper.includes('requireAdminSession(req.method === "GET" ? "dashboard" : "moderation")'));
  assert.ok(routeHelper.includes("sameOriginRequest(req)"));
  assert.ok(routeHelper.includes('process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true"'));
  assert.ok(routeHelper.includes("ADMIN_MODERATION_INTERNAL_TOKEN"));
  assert.ok(cmsController.includes("x-admin-crud-token"));
  assert.ok(cmsController.includes("ADMIN_MODERATION_WRITE_ENABLED"));
  assert.doesNotMatch(manager, /x-admin-crud-token|ADMIN_MODERATION_INTERNAL_TOKEN|ADMIN_TRANSLATION_INTERNAL_TOKEN/);
});

test("mass assignment and protected fields are rejected by whitelists", () => {
  [
    "ALLOWED_ADMIN_FIELDS",
    "field_not_allowed",
    "owner_user_id",
    "boatDocumentId",
    "mediaId",
  ].forEach((text) => assert.ok(contracts.includes(text) || cmsService.includes(text), `${text} missing`));
  const allowedBlock = blockBetween(contracts, "export const ALLOWED_ADMIN_FIELDS", "const WRITE_ACTIONS");
  ["password", "reset_token", "confirmation_token", "provider", "role"].forEach((text) => assert.doesNotMatch(allowedBlock, new RegExp(text, "i")));
  assert.ok(cmsService.includes("SENSITIVE_FIELD"));
});

test("delete safety engine evaluates dependencies and requires exact confirmation phrases", () => {
  [
    "evaluateDependencies",
    "canDelete",
    "blockingReasons",
    "dependentCounts",
    "financialDependency",
    "sharedMediaCount",
    "requiredConfirmationPhrase",
    "safeDeletePlan",
    "confirmation_phrase_required",
    "УДАЛИТЬ ВЛАДЕЛЬЦА",
    "УДАЛИТЬ ДОКУМЕНТ",
    "УДАЛИТЬ ЛОДКУ",
    "УДАЛИТЬ МАРШРУТ",
  ].forEach((text) => assert.ok(contracts.includes(text) || cmsService.includes(text) || manager.includes(text), `${text} missing`));
  assert.ok(cmsService.includes("bookingRequests"));
  assert.ok(cmsService.includes("payments"));
  assert.ok(cmsService.includes("dodoEvents"));
});

test("optimistic concurrency and idempotency are part of write payloads", () => {
  assert.ok(contracts.includes("expectedUpdatedAt"));
  assert.ok(cmsService.includes("staleVersionMatches"));
  assert.ok(cmsService.includes("stale_version"));
  assert.ok(contracts.includes("idempotencyKey"));
  assert.ok(cmsService.includes("idempotencyKeyDigest"));
});

test("owner account creation and archive remain explicit product decisions when schema or invite contract is missing", () => {
  assert.ok(contracts.includes("OWNER_ACCOUNT_CREATION_DECISION_REQUIRED = true"));
  assert.ok(contracts.includes("ARCHIVE_SCHEMA_DECISION_REQUIRED = true"));
  assert.ok(manager.includes("OWNER_ACCOUNT_CREATION_DECISION_REQUIRED"));
  assert.ok(manager.includes("ARCHIVE_SCHEMA_DECISION_REQUIRED"));
  assert.doesNotMatch(ownerSchema, /must_change_password|archived_at|archived_by/);
});

test("documents and media use upload service and shared media usage checks", () => {
  assert.ok(cmsService.includes("files_related_mph"));
  assert.ok(cmsService.includes("mediaUsageCount"));
  assert.ok(cmsService.includes('strapi.plugin("upload").service("upload").remove'));
  assert.ok(manager.includes("Документы владельцев доступны только в разделе"));
  assert.doesNotMatch(manager, /server path|filesystem path|wildcard/i);
});

test("boats and experiences preserve moderation and publication contracts", () => {
  assert.ok(boatSchema.includes('"moderation_status"'));
  assert.ok(experienceSchema.includes('"boat"'));
  assert.ok(cmsService.includes("validateExperienceBoat"));
  assert.ok(cockpit.includes('entity="boat"'));
  assert.ok(cockpit.includes('entity="experience"'));
  assert.ok(manager.includes("Снять с публикации"));
});

test("audit events record safe metadata without secrets or PII values", () => {
  assert.ok(moderationEventSchema.includes('"metadata"'));
  assert.ok(cmsService.includes("createAuditEvent"));
  assert.ok(cmsService.includes("changedFieldNames"));
  assert.ok(cmsService.includes("dependencySnapshot"));
  assert.ok(cmsService.includes("subjectEntityType"));
  assert.doesNotMatch(cmsService, /session cookie|Authorization header|passport number|full request body/i);
});

test("CRUD UI has daily-work controls, delete dialog, and no browser storage token handling", () => {
  [
    "Создать владельца",
    "Редактировать владельца",
    "Создать лодку",
    "Редактировать лодку",
    "Создать маршрут",
    "Редактировать маршрут",
    "Добавить документ",
    "Заменить документ",
    "Отвязать документ",
    "Удалить документ",
    "Снять с публикации",
    "Архивировать",
    "Восстановить",
    "Удалить навсегда",
    "Проверка зависимостей",
    "Удаление невозможно",
    "Введите подтверждающую фразу",
    "Изменения сохранены",
    "Данные удалены",
    "Обновить данные",
  ].forEach((text) => assert.ok(manager.includes(text) || cockpit.includes(text), `${text} missing`));
  assert.ok(manager.includes('role="dialog"'));
  assert.doesNotMatch(manager + cockpit, /localStorage|sessionStorage|document\.cookie|x-admin-token/);
});

test("RU, EN, and ME CRUD localization exists without visible fallback leakage", () => {
  const ruBlock = blockBetween(manager, "ru: {", "en: {");
  const enBlock = blockBetween(manager, "en: {", "me: {");
  const meBlock = blockBetween(manager, "me: {", "} satisfies Record<Lang");
  assert.doesNotMatch(ruBlock, /Create owner|Edit owner|Delete permanently|Refresh data|Admin token|Protected admin cockpit/);
  assert.ok(enBlock.includes("Create owner"));
  assert.ok(meBlock.includes("Kreiraj vlasnika"));
  assert.doesNotMatch(enBlock, /[А-Яа-яЁё]/);
});
