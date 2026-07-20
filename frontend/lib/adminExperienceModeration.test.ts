import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const moderationActions = read("app/[lang]/admin/AdminModerationActions.tsx");
const dashboardApi = read("app/api/admin/dashboard/route.ts");
const moderationApi = read("app/api/admin/moderation/route.ts");
const previewApi = read("app/api/admin/translations/preview/route.ts");
const sessionHelper = read("lib/adminSession.ts");
const cmsService = read("../cms/src/api/admin-moderation/services/admin-moderation.ts");
const cmsStateMachine = read("../cms/src/api/admin-moderation/services/state-machine.ts");
const eventSchema = read("../cms/src/api/moderation-event/content-types/moderation-event/schema.json");
const experienceSchema = read("../cms/src/api/experience/content-types/experience/schema.json");

test("Experience counters are loaded and shown on the admin overview", () => {
  [
    "experiencesAwaitingReview",
    "experiencesRejected",
    "experiencesReadyToPublish",
    "experiencesPublished",
    "experiencesWithoutBoat",
    "experiencesWithIncompleteTranslations",
  ].forEach((text) => assert.ok(dashboardApi.includes(text), `${text} missing from dashboard API`));

  [
    "Маршруты ожидают проверки",
    "Маршруты отклонены",
    "Маршруты готовы к публикации",
    "Опубликованные маршруты",
    "Маршруты без связи с лодкой",
    "Маршруты с неполными переводами",
  ].forEach((text) => assert.ok(cockpit.includes(text), `${text} missing from cockpit`));
});

test("Experience detail renders review fields, linked boat, owner, media, status, and history", () => {
  [
    "short_description",
    "full_description",
    "included_services",
    "meeting_point",
    "max_guests",
    "cover_count",
    "gallery_count",
    "boatModerationStatus",
    "boatState",
    "owner_display_name",
    "owner_email",
    "moderationHistory",
    "routeEvents(route, events)",
  ].forEach((text) => assert.ok(cockpit.includes(text) || dashboardApi.includes(text), `${text} missing`));
});

test("Route without boat is visible, explained, and blocked from publication", () => {
  assert.ok(cockpit.includes("Маршрут не связан с лодкой"));
  assert.ok(cockpit.includes("Публикация маршрута без связанной лодкой запрещена.") || cockpit.includes("Публикация маршрута без связанной лодки запрещена."));
  assert.ok(cmsService.includes("experience_boat_required"));
  assert.ok(cmsService.includes('input.action === "approve"') && cmsService.includes('input.action === "publish"'));
});

test("Experience moderation actions are connected with confirmation and double-submit protection", () => {
  assert.ok(moderationActions.includes('type EntityType = "boat" | "experience" | "owner_profile"'));
  assert.ok(moderationActions.includes("EXPERIENCE_ACTIONS"));
  assert.ok(moderationActions.includes('entityType === "experience"'));
  assert.ok(moderationActions.includes("window.confirm"));
  assert.ok(moderationActions.includes("pendingAction !== null"));
  assert.ok(moderationActions.includes("Отправить на дополнительную проверку"));
  assert.ok(moderationActions.includes("Подтвердить маршрут"));
  assert.ok(moderationActions.includes("Отклонить маршрут"));
  assert.ok(moderationActions.includes("Вернуть на доработку"));
  assert.ok(moderationActions.includes("Опубликовать маршрут"));
});

test("Experience state machine supports review, approval, publication, unpublish, archive, and comments", () => {
  assert.ok(cmsStateMachine.includes("ExperienceModerationStatus"));
  assert.ok(cmsStateMachine.includes("planExperienceModerationTransition"));
  ["start_review", "request_changes", "reject", "approve", "publish", "unpublish", "archive"].forEach((action) => {
    assert.ok(cmsStateMachine.includes(action), `${action} missing`);
  });
  assert.ok(cmsStateMachine.includes("COMMENT_REQUIRED_ACTIONS"));
});

test("Experience publish gates fail closed for boat, owner, boat publication, required fields, locales, and stale approval", () => {
  [
    "linkedBoatReadyForExperiencePublish",
    "owner_not_approved",
    "linked_boat_not_published",
    "missingPublishLocales(rows)",
    "incompleteExperiencePublishLocales(rows)",
    "experience_not_approved",
    "updatedAt > latestEvent.occurred_at",
  ].forEach((text) => assert.ok(cmsService.includes(text), `${text} missing`));
  assert.ok(experienceSchema.includes('"duration_hours"'));
  assert.ok(experienceSchema.includes('"price"'));
  assert.ok(experienceSchema.includes('"currency"'));
});

test("Experience moderation writes create safe moderation events without token/session data", () => {
  assert.doesNotMatch(eventSchema, /"experience"/);
  assert.ok(cmsService.includes('subjectEntityType: "experience"'));
  assert.ok(cmsService.includes("subjectDocumentId: documentId"));
  assert.ok(cmsService.includes('entityType: "boat"'));
  assert.ok(cmsService.includes("createAuditEvent(cms"));
  assert.ok(cmsService.includes("previousStatus: currentStatus"));
  assert.ok(cmsService.includes("newStatus: transition.nextStatus"));
  assert.doesNotMatch(cmsService, /cookie|Authorization|adminToken|session/i);
});

test("Translation workflow is linked from route detail without performing AI calls", () => {
  assert.ok(cockpit.includes("/admin/translations/preview?boatDocumentId="));
  assert.ok(previewApi.includes("populate[experiences]"));
  assert.ok(cockpit.includes("translation_complete"));
  assert.ok(cockpit.includes("Перевод не завершён"));
});

test("Admin authorization remains server-side and write-gated", () => {
  assert.ok(moderationApi.includes('requireAdminSession("moderation")'));
  assert.ok(moderationApi.includes('process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true"'));
  assert.ok(sessionHelper.includes('permissions: ["dashboard", "translation"]'));
  assert.ok(sessionHelper.includes('permissions: ["dashboard", "translation", "moderation"]'));
  assert.doesNotMatch(cockpit, /localStorage|sessionStorage|document\.cookie|x-admin-token/);
  assert.doesNotMatch(moderationActions, /localStorage|sessionStorage|document\.cookie|x-admin-token/);
});

test("RU, EN, and ME Experience moderation copy is complete without visible fallback leakage", () => {
  const ruBlock = blockBetween(cockpit, "ru: {", "en: {");
  const enBlock = blockBetween(cockpit, "en: {", "me: {");
  const meBlock = blockBetween(cockpit, "me: {", "} satisfies Record<Lang");

  [
    "Маршруты",
    "Ожидает проверки",
    "Готов к публикации",
    "Опубликован",
    "Отклонён",
    "Требует доработки",
    "Маршрут не связан с лодкой",
    "Перевод не завершён",
    "Причина отказа",
    "История модерации",
  ].forEach((text) => assert.ok(ruBlock.includes(text), `${text} missing from RU copy`));

  assert.ok(enBlock.includes("Routes"));
  assert.ok(enBlock.includes("Route is not linked to a boat"));
  assert.ok(meBlock.includes("Rute"));
  assert.ok(meBlock.includes("Ruta nije povezana sa plovilom"));
  assert.doesNotMatch(enBlock, /[А-Яа-яЁё]/);
});
