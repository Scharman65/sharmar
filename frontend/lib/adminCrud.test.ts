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
const boatControl = read("app/[lang]/admin/AdminBoatControlCenter.tsx");
const manager = read("app/[lang]/admin/AdminCrudManager.tsx");
const cmsRoutes = read("../cms/src/api/admin-crud/routes/admin-crud.ts");
const cmsController = read("../cms/src/api/admin-crud/controllers/admin-crud.ts");
const cmsService = read("../cms/src/api/admin-crud/services/admin-crud.ts");
const ownerSchema = read("../cms/src/api/owner-profile/content-types/owner-profile/schema.json");
const boatSchema = read("../cms/src/api/boat/content-types/boat/schema.json");
const experienceSchema = read("../cms/src/api/experience/content-types/experience/schema.json");
const userExtension = read("../cms/src/extensions/users-permissions/strapi-server.ts");
const archiveMigration = read("../cms/database/migrations/20260721054428-admin-crud-archive-owner-password.js");
const moderationEventSchema = read("../cms/src/api/moderation-event/content-types/moderation-event/schema.json");
const ownerApi = read("lib/auth/ownerApi.ts");
const ownerDashboard = read("app/api/owner/dashboard/route.ts");
const ownerChangePassword = read("app/api/auth/owner-change-password/route.ts");
const strapiClient = read("lib/strapi.ts");

function compactWhitespace(source: string): string {
  return source.replace(/\s+/g, " ").trim();
}

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

test("schema and migration add true archive and forced-password fields additively", () => {
  assert.ok(ownerSchema.includes('"archived_at"'));
  assert.ok(boatSchema.includes('"archived_at"'));
  assert.ok(experienceSchema.includes('"archived_at"'));
  assert.ok(userExtension.includes("must_change_password"));
  assert.ok(archiveMigration.includes("add column if not exists archived_at"));
  assert.ok(compactWhitespace(archiveMigration).includes("add column if not exists must_change_password boolean not null default false"));
  assert.doesNotMatch(archiveMigration, /drop column|drop table|alter type/i);
});

test("owner account creation returns a one-time temporary password and requires first login change", () => {
  assert.ok(contracts.includes("OWNER_ACCOUNT_CREATION_DECISION_REQUIRED = false"));
  assert.ok(cmsService.includes("createOwner"));
  assert.ok(cmsService.includes("generateTemporaryPassword"));
  assert.ok(cmsService.includes("must_change_password"));
  assert.ok(cmsService.includes("oneTimeSecret"));
  assert.ok(manager.includes("oneTimePassword"));
  assert.ok(manager.includes("navigator.clipboard.writeText"));
  assert.ok(ownerApi.includes("ownerMustChangePassword"));
  assert.ok(ownerDashboard.includes("owner_password_change_required"));
  assert.ok(ownerChangePassword.includes("password_reuse_rejected"));
  assert.doesNotMatch(cmsService, /password.*metadata|temporaryPassword.*metadata/i);
});

test("archive and restore use archived_at instead of publication or activity fields", () => {
  assert.ok(contracts.includes("ARCHIVE_SCHEMA_DECISION_REQUIRED = false"));
  assert.ok(contracts.includes("restoreSupported(entity"));
  assert.ok(cmsService.includes("data.archived_at = new Date().toISOString()"));
  assert.ok(cmsService.includes("data.archived_at = null"));
  assert.ok(cmsService.includes("archive_blocked_by_dependencies"));
  assert.ok(strapiClient.includes("filters[archived_at][$null]=true"));
  assert.ok(ownerDashboard.includes("owner_account_archived"));
  assert.doesNotMatch(blockBetween(cmsService, "function buildModerationUpdate", "function normalizeEmail"), /moderation_status = \"archived\"|publishedAt|published_at/);
});

test("documents and media use upload service and shared media usage checks", () => {
  assert.ok(cmsService.includes("files_related_mph"));
  assert.ok(cmsService.includes("mediaUsageCount"));
  assert.ok(routeHelper.includes("handleAdminCrudUpload"));
  assert.ok(routeHelper.includes("validateUploadFile"));
  assert.ok(routeHelper.includes("image/jpeg"));
  assert.ok(routeHelper.includes("application/pdf"));
  assert.ok(cmsService.includes("attachDocument"));
  assert.ok(cmsService.includes("attachMedia"));
  assert.ok(cmsService.includes('strapi.plugin("upload").service("upload").remove'));
  assert.ok(manager.includes("Документы владельцев доступны только в разделе"));
  assert.doesNotMatch(manager, /server path|filesystem path|wildcard/i);
});

test("boats and experiences preserve moderation and publication contracts", () => {
  assert.ok(boatSchema.includes('"moderation_status"'));
  assert.ok(experienceSchema.includes('"boat"'));
  assert.ok(cmsService.includes("validateExperienceBoat"));
  assert.ok(cmsService.includes("archived_at"));
  assert.ok((cockpit + boatControl).includes('entity="boat"'));
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
  assert.ok(manager.includes('onClick={() => setCreateOpen(true)}'));
  assert.ok(manager.includes('async function runCreateBoat()'));
  assert.ok(manager.includes('ADMIN_CRUD_ROUTES.boat'));
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


test("dependency UI uses real read-only endpoints and permanent delete is hidden for archive-capable entities", () => {
  assert.match(
    manager,
    /`\$\{ADMIN_CRUD_ROUTES\[entity\]\}\/\$\{encodeURIComponent\(id\)\}\/dependencies`/
  );
  assert.match(manager, /json\?\.dependencies/);
  assert.match(manager, /dependencyState\.data\.dependentCounts/);
  assert.match(manager, /dependencyState\.data\.canDelete/);

  assert.doesNotMatch(
    manager,
    /<p>\{ui\.bookingDependency\} · \{ui\.paymentDependency\} · \{ui\.dodoDependency\}<\/p>/
  );

  assert.match(
    manager,
    /\{entity === "document" \|\| entity === "media" \? \(/
  );

  assert.match(
    manager,
    /\{!archived \? \([\s\S]*?openAction\(row, "archive"\)[\s\S]*?openAction\(row, "restore"\)/
  );
});

test("technical CRUD does not expose boat or experience moderation lifecycle buttons", () => {
  const managerSource = read("../frontend/app/[lang]/admin/AdminCrudManager.tsx");

  const technicalLifecycleBlock =
    managerSource.match(
      /\{\(entity === "boat" \|\| entity === "experience"\)[\s\S]*?\) : null\}/
    )?.[0] ?? "";

  assert.equal(
    technicalLifecycleBlock,
    "",
    "boat/experience technical lifecycle action block must not exist"
  );

  assert.ok(
    managerSource.includes(
      'asText(row.verification_status) === "documents_uploaded"'
    ),
    "owner verification action must remain intact"
  );
});
