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

const sessionCore = read("lib/adminSessionCore.ts");
const sessionHelper = read("lib/adminSession.ts");
const sessionApi = read("app/api/admin/session/route.ts");
const dashboardApi = read("app/api/admin/dashboard/route.ts");
const moderationApi = read("app/api/admin/moderation/route.ts");
const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const moderationActions = read("app/[lang]/admin/AdminModerationActions.tsx");

test("session endpoint reports authenticated permissions and failure reasons without credentials", () => {
  assert.ok(sessionApi.includes("getAdminSessionStatus()"));
  assert.ok(sessionApi.includes("authenticated: status.authenticated"));
  assert.ok(sessionApi.includes("permissions: session?.permissions ?? []"));
  assert.ok(sessionApi.includes("expiresAt: session?.expiresAt ?? null"));
  assert.ok(sessionApi.includes("code: status.code"));
  assert.ok(sessionApi.includes("setAdminSessionCookie(response, cookie)"));

  const postBlock = blockBetween(sessionApi, "export async function POST", "export async function DELETE");
  const successResponse = blockBetween(postBlock, "const response = json({", "});\n  setAdminSessionCookie");
  assert.doesNotMatch(successResponse, /ADMIN_MODERATION_TOKEN|ADMIN_TRANSLATION_TOKEN|password|cookie/i);
});

test("session cookie settings remain HttpOnly, Secure in production, SameSite strict, path-wide, and expiring", () => {
  assert.ok(sessionCore.includes('ADMIN_SESSION_COOKIE = "sharmar_admin_session"'));
  assert.ok(sessionHelper.includes("httpOnly: true"));
  assert.ok(sessionHelper.includes('secure: process.env.NODE_ENV === "production"'));
  assert.ok(sessionHelper.includes('sameSite: "strict"'));
  assert.ok(sessionHelper.includes('path: "/"'));
  assert.ok(sessionHelper.includes("maxAge: ADMIN_SESSION_MAX_AGE_SECONDS"));
});

test("admin signing secret is stable, explicit in production, and never derived from raw tokens", () => {
  assert.ok(sessionCore.includes('envValue(env, "ADMIN_SESSION_SECRET")'));
  assert.ok(sessionCore.includes('envValue(env, "NODE_ENV") === "production"'));
  assert.ok(sessionCore.includes("LOCAL_ADMIN_SESSION_SECRET"));

  const secretBlock = blockBetween(sessionCore, "function signingSecret", "function tokensMatch");
  assert.doesNotMatch(
    secretBlock,
    /ADMIN_TRANSLATION_TOKEN|ADMIN_MODERATION_TOKEN|ADMIN_TRANSLATION_INTERNAL_TOKEN|ADMIN_MODERATION_INTERNAL_TOKEN/
  );
});

test("dashboard endpoint separates session failure from missing dashboard permission and backend failures", () => {
  assert.ok(dashboardApi.includes("getAdminSessionStatus()"));
  assert.ok(dashboardApi.includes("code: sessionStatus.code"));
  assert.ok(dashboardApi.includes("missing_dashboard_permission"));
  assert.ok(dashboardApi.includes("strapi_token_missing"));
  assert.ok(dashboardApi.includes('"cache-control": "no-store"'));
});

test("moderation endpoint accepts only sessions with moderation permission", () => {
  assert.ok(moderationApi.includes("getAdminSessionStatus()"));
  assert.ok(moderationApi.includes("sessionStatus.session.permissions.includes(\"moderation\")"));
  assert.ok(moderationApi.includes("missing_moderation_permission"));
  assert.ok(moderationApi.includes("code: sessionStatus.code"));
  assert.ok(moderationApi.includes('process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true"'));
});

test("admin client verifies cookie after login before loading dashboard", () => {
  const signInBlock = blockBetween(cockpit, "async function signIn", "async function signOut");
  assert.ok(signInBlock.includes('fetch("/api/admin/session"'));
  assert.ok(signInBlock.includes('credentials: "same-origin"'));
  assert.ok(signInBlock.includes('cache: "no-store"'));
  assert.ok(signInBlock.includes('setPassword("")'));
  assert.ok(signInBlock.includes("const nextSession = await refreshSession()"));
  assert.ok(signInBlock.includes("!nextSession.authenticated"));
  assert.ok(signInBlock.includes("admin_cookie_missing"));
  assert.ok(signInBlock.includes("await loadDashboard()"));
});

test("dashboard load errors are not mapped to invalid password", () => {
  const loadBlock = blockBetween(cockpit, "const loadDashboard", "async function signIn");
  assert.ok(loadBlock.includes('fetch("/api/admin/dashboard"'));
  assert.ok(loadBlock.includes('credentials: "same-origin"'));
  assert.ok(loadBlock.includes("dashboard_api_unavailable"));
  assert.ok(cockpit.includes("missing_dashboard_permission"));
  assert.doesNotMatch(loadBlock, /invalid_admin_password/);
});

test("UI error mapping covers invalid password, missing cookie, invalid session, missing moderation permission, and dashboard API", () => {
  [
    "Неверный пароль администратора.",
    "Cookie сессии не установлена.",
    "Сессия администратора недействительна.",
    "У этой сессии нет доступа к панели администратора.",
    "Dashboard API недоступен.",
  ].forEach((text) => assert.ok(cockpit.includes(text), `${text} missing from cockpit`));

  [
    "missing_moderation_permission",
    "У этой сессии нет права на модерацию.",
    "The admin session cookie is missing.",
    "This session does not have moderation access.",
  ].forEach((text) => assert.ok(moderationActions.includes(text), `${text} missing from moderation actions`));
});

test("logout clears cookie and client session state without exposing raw cookie data", () => {
  assert.ok(sessionHelper.includes("clearAdminSessionCookie"));
  assert.ok(sessionHelper.includes("maxAge: 0"));

  const signOutBlock = blockBetween(cockpit, "async function signOut", "useEffect(() =>");
  assert.ok(signOutBlock.includes('fetch("/api/admin/session"'));
  assert.ok(signOutBlock.includes('method: "DELETE"'));
  assert.ok(signOutBlock.includes('credentials: "same-origin"'));
  assert.ok(signOutBlock.includes("setSession({ authenticated: false, permissions: [], expiresAt: null })"));
  assert.doesNotMatch(signOutBlock, /document\.cookie|localStorage|sessionStorage/);
});

test("admin auth flow does not log or return raw tokens or cookie values", () => {
  [sessionCore, sessionHelper, sessionApi, dashboardApi, moderationApi, cockpit, moderationActions].forEach((source) => {
    assert.doesNotMatch(source, /console\.(log|warn|error|info|debug)/);
  });

  const sessionSuccessResponse = blockBetween(
    blockBetween(sessionApi, "export async function POST", "export async function DELETE"),
    "const response = json({",
    "});\n  setAdminSessionCookie"
  );
  const dashboardSuccessResponse = blockBetween(
    dashboardApi,
    "return NextResponse.json(\n    {\n      ok: true",
    "{ status: 200"
  );
  const responseBodies = `${sessionSuccessResponse}\n${dashboardSuccessResponse}`;

  assert.doesNotMatch(responseBodies, /token|cookie|password|Authorization|Bearer/i);
});
