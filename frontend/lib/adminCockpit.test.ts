import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const moderationActions = read("app/[lang]/admin/AdminModerationActions.tsx");
const previewClient = read("app/[lang]/admin/translations/preview/AdminTranslationPreviewClient.tsx");
const page = read("app/[lang]/admin/page.tsx");
const sessionApi = read("app/api/admin/session/route.ts");
const sessionHelper = read("lib/adminSession.ts");
const dashboardApi = read("app/api/admin/dashboard/route.ts");
const moderationApi = read("app/api/admin/moderation/route.ts");
const previewApi = read("app/api/admin/translations/preview/route.ts");
const saveDraftApi = read("app/api/admin/translations/save-draft/route.ts");
const cmsModeration = read("../cms/src/api/admin-moderation/services/admin-moderation.ts");
const cmsStateMachine = read("../cms/src/api/admin-moderation/services/state-machine.ts");
const experienceSchema = read("../cms/src/api/experience/content-types/experience/schema.json");

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

test("admin page uses the simplified cockpit client", () => {
  assert.ok(page.includes("AdminCockpitClient"));
  assert.doesNotMatch(page, /AdminDashboardClient/);
});

test("admin login uses server session route and does not store raw token in browser storage", () => {
  assert.ok(cockpit.includes('fetch("/api/admin/session"'));
  assert.ok(cockpit.includes("Пароль администратора"));
  assert.ok(cockpit.includes("Admin password"));
  assert.ok(cockpit.includes("Administratorska lozinka"));
  assert.doesNotMatch(cockpit, /localStorage|sessionStorage|document\.cookie|x-admin-token/);
  assert.doesNotMatch(previewClient, /localStorage|sessionStorage|document\.cookie|x-admin-token/);
});

test("admin session cookie is HttpOnly, Secure in production, SameSite strict, and expiring", () => {
  assert.ok(sessionHelper.includes('ADMIN_SESSION_COOKIE = "sharmar_admin_session"'));
  assert.ok(sessionHelper.includes("httpOnly: true"));
  assert.ok(sessionHelper.includes('secure: process.env.NODE_ENV === "production"'));
  assert.ok(sessionHelper.includes('sameSite: "strict"'));
  assert.ok(sessionHelper.includes("ADMIN_SESSION_MAX_AGE_SECONDS"));
  assert.ok(sessionHelper.includes("exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS"));
});

test("raw admin credential is not returned by session API", () => {
  const postBlock = blockBetween(sessionApi, "export async function POST", "export async function DELETE");
  assert.ok(postBlock.includes("setAdminSessionCookie(response, cookie)"));
  const responseBlock = blockBetween(postBlock, "const response = json({", "});\n  setAdminSessionCookie");
  assert.doesNotMatch(responseBlock, /token|password|adminPassword|credential/i);
  assert.ok(responseBlock.includes("permissions"));
  assert.ok(responseBlock.includes("expiresAt"));
});

test("logout clears the HttpOnly admin session", () => {
  assert.ok(sessionApi.includes("export async function DELETE"));
  assert.ok(sessionApi.includes("clearAdminSessionCookie(response)"));
  assert.ok(cockpit.includes("signOut"));
  assert.ok(previewClient.includes("signOut"));
});

test("protected admin APIs require server session instead of browser-supplied token", () => {
  [dashboardApi, moderationApi, previewApi, saveDraftApi].forEach((source) => {
    assert.ok(source.includes("requireAdminSession("));
    assert.doesNotMatch(source, /req\.headers\.get\("x-admin-token"\)/);
  });
});

test("translation-only session cannot moderate and moderation writes remain fail-closed", () => {
  assert.ok(sessionHelper.includes('permissions: ["dashboard", "translation"]'));
  assert.ok(sessionHelper.includes('permissions: ["dashboard", "translation", "moderation"]'));
  assert.ok(moderationApi.includes('requireAdminSession("moderation")'));
  assert.ok(moderationApi.includes('process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true"'));
});

test("admin write routes include same-origin CSRF checks", () => {
  [sessionApi, moderationApi, previewApi, saveDraftApi].forEach((source) => {
    assert.ok(source.includes("sameOriginRequest(req)"));
    assert.ok(source.includes("csrf_check_failed"));
  });
});

test("simple admin navigation covers daily moderation sections", () => {
  [
    "Обзор",
    "Владельцы",
    "Документы",
    "Лодки",
    "Маршруты",
    "Переводы",
    "Журнал действий",
    "Выйти",
  ].forEach((text) => assert.ok(cockpit.includes(text), `${text} missing`));
});

test("dashboard cards cover pending owners, documents, boats, routes, translations, and recent actions", () => {
  [
    "Владельцы ожидают проверки",
    "Документы ожидают проверки",
    "Лодки ожидают проверки",
    "Маршруты ожидают проверки",
    "Переводы требуют внимания",
    "Недавние действия",
  ].forEach((text) => assert.ok(cockpit.includes(text), `${text} missing`));
});

test("Russian cockpit copy removes audited English phrases", () => {
  const ruBlock = blockBetween(cockpit, "ru: {", "en: {");
  [
    "Protected admin cockpit",
    "Admin token",
    "write enabled",
    "internal token",
    "raw JSON",
  ].forEach((text) => assert.equal(ruBlock.includes(text), false, `${text} leaked into RU copy`));
});

test("ME and EN cockpit localization exists without Russian leakage in EN copy", () => {
  const enBlock = blockBetween(cockpit, "en: {", "me: {");
  const meBlock = blockBetween(cockpit, "me: {", "} satisfies Record<Lang");
  assert.ok(meBlock.includes("Administratorska tabla"));
  assert.ok(meBlock.includes("Dokumenti čekaju provjeru"));
  assert.doesNotMatch(enBlock, /[А-Яа-яЁё]/);
});

test("document review shows owner identity, document fields, statuses, and review actions", () => {
  [
    "passport_document",
    "identity_document",
    "documents_uploaded_at",
    "verification_status",
    "rejection_reason",
    "openDocument",
    "owner_profile",
  ].forEach((text) => assert.ok(cockpit.includes(text) || moderationActions.includes(text) || dashboardApi.includes(text), `${text} missing`));
});

test("document requirement decision remains explicit instead of guessed", () => {
  assert.ok(cockpit.includes("DOCUMENT_REQUIREMENT_DECISION_REQUIRED"));
  assert.ok(cockpit.includes("passport") || cockpit.includes("passport_document"));
  assert.ok(cockpit.includes("identity") || cockpit.includes("identity_document"));
});

test("boat moderation is connected to protected actions and CMS audit events", () => {
  assert.ok(moderationActions.includes('entityType="boat"') || cockpit.includes('entityType="boat"'));
  assert.ok(moderationApi.includes("/api/admin-moderation/action"));
  assert.ok(dashboardApi.includes("moderationEventQuery"));
  assert.ok(dashboardApi.includes("moderationEvents,"));
  assert.ok(cmsModeration.includes("createAuditEvent"));
  assert.ok(cmsStateMachine.includes("approve"));
  assert.ok(cmsStateMachine.includes("publish"));
  assert.ok(cmsStateMachine.includes("reject"));
});

test("experience list, translation review, and moderation actions are connected", () => {
  assert.ok(dashboardApi.includes("experienceQuery"));
  assert.ok(cockpit.includes("routeNotAssigned"));
  assert.ok(cockpit.includes("cannotPublishRoute"));
  assert.ok(cockpit.includes('entityType="experience"'));
  assert.ok(previewApi.includes("populate[experiences]"));
  assert.ok(saveDraftApi.includes('ContentType = "boat" | "experience"'));
  assert.ok(cmsStateMachine.includes("planExperienceModerationTransition"));
});

test("unassigned experience publication is blocked in UI copy", () => {
  assert.ok(cockpit.includes("Маршрут не связан с лодкой"));
  assert.ok(cockpit.includes("Публикация маршрута без связанной лодки запрещена."));
  assert.ok(experienceSchema.includes('"boat"'));
});

test("translation workflow supports source preview, AI preview, dry-run, and draft save without publishing", () => {
  assert.ok(previewClient.includes("Показать исходные данные"));
  assert.ok(previewClient.includes("Generate AI preview"));
  assert.ok(previewClient.includes("runSaveDraft(true)"));
  assert.ok(saveDraftApi.includes("dryRun === false"));
  assert.ok(saveDraftApi.includes("doesPublish: false"));
  assert.ok(saveDraftApi.includes("overwrite_not_enabled"));
});

test("API errors render as safe localized messages", () => {
  assert.ok(cockpit.includes("loadError"));
  assert.ok(moderationActions.includes("errorMessage"));
  assert.ok(previewClient.includes("errorMessage"));
  assert.doesNotMatch(cockpit, /Authorization|Bearer|OPENAI_API_KEY|STRAPI_WRITE_TOKEN/);
});

test("double-submit protection is present on client moderation and translation actions", () => {
  assert.ok(moderationActions.includes("pendingAction !== null"));
  assert.ok(previewClient.includes("disabled={saveLoading}"));
  assert.ok(previewClient.includes("disabled={loading}"));
});

test("server does not accept trusted browser role or arbitrary owner relation", () => {
  assert.doesNotMatch(moderationApi, /role|isAdmin|owner_user_id|ownerProfileIdFromBrowser/i);
  assert.ok(moderationApi.includes("actor:"));
});
