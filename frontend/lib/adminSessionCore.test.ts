import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  authenticateAdminPassword,
  createAdminSessionCookie,
  verifyAdminSessionCookieDetailed,
} from "./adminSessionCore.ts";

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    ADMIN_SESSION_SECRET: "stable-session-secret",
    ADMIN_TRANSLATION_TOKEN: "translation-token",
    ADMIN_MODERATION_TOKEN: "moderation-token",
    ADMIN_TRANSLATION_INTERNAL_TOKEN: "translation-internal-token",
    ADMIN_MODERATION_INTERNAL_TOKEN: "moderation-internal-token",
    ...overrides,
  };
}

test("moderation token login grants dashboard, translation, and moderation", () => {
  const session = authenticateAdminPassword("moderation-token", env(), NOW);

  assert.deepEqual(session?.permissions, ["dashboard", "translation", "moderation"]);
  assert.equal(session?.expiresAt, Math.floor(NOW / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS);
});

test("translation token login grants dashboard and translation only", () => {
  const session = authenticateAdminPassword("translation-token", env(), NOW);

  assert.deepEqual(session?.permissions, ["dashboard", "translation"]);
  assert.equal(session?.permissions.includes("moderation"), false);
});

test("invalid token does not authenticate", () => {
  assert.equal(authenticateAdminPassword("wrong-token", env(), NOW), null);
});

test("session cookie is created without raw tokens and verifies permissions", () => {
  const cookie = createAdminSessionCookie(["dashboard", "translation", "moderation"], env(), NOW);

  assert.equal(typeof cookie, "string");
  assert.equal(cookie?.includes("moderation-token"), false);
  assert.equal(cookie?.includes("translation-token"), false);

  const status = verifyAdminSessionCookieDetailed(cookie, env(), NOW);
  assert.equal(status.authenticated, true);
  assert.deepEqual(status.authenticated ? status.session.permissions : [], [
    "dashboard",
    "translation",
    "moderation",
  ]);
});

test("expired session returns a distinct reason", () => {
  const cookie = createAdminSessionCookie(["dashboard"], env(), NOW);
  const afterExpiry = NOW + (ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1000;

  assert.deepEqual(verifyAdminSessionCookieDetailed(cookie, env(), afterExpiry), {
    authenticated: false,
    session: null,
    code: "session_expired",
  });
});

test("changed signing secret invalidates an existing session", () => {
  const cookie = createAdminSessionCookie(["dashboard"], env(), NOW);
  const status = verifyAdminSessionCookieDetailed(
    cookie,
    env({ ADMIN_SESSION_SECRET: "changed-session-secret" }),
    NOW
  );

  assert.deepEqual(status, {
    authenticated: false,
    session: null,
    code: "invalid_admin_session",
  });
});

test("production fails closed when ADMIN_SESSION_SECRET is absent", () => {
  const missingSecretEnv = env({ ADMIN_SESSION_SECRET: "" });

  assert.equal(createAdminSessionCookie(["dashboard"], missingSecretEnv, NOW), null);
  assert.deepEqual(verifyAdminSessionCookieDetailed("payload.signature", missingSecretEnv, NOW), {
    authenticated: false,
    session: null,
    code: "admin_session_unavailable",
  });
});

test("non-production fallback secret is stable and independent from configured tokens", () => {
  const devEnv = env({ NODE_ENV: "development", ADMIN_SESSION_SECRET: "" });
  const cookie = createAdminSessionCookie(["dashboard"], devEnv, NOW);
  const status = verifyAdminSessionCookieDetailed(
    cookie,
    {
      ...devEnv,
      ADMIN_TRANSLATION_TOKEN: "rotated-translation-token",
      ADMIN_MODERATION_TOKEN: "rotated-moderation-token",
      ADMIN_TRANSLATION_INTERNAL_TOKEN: "rotated-translation-internal-token",
      ADMIN_MODERATION_INTERNAL_TOKEN: "rotated-moderation-internal-token",
    },
    NOW
  );

  assert.equal(status.authenticated, true);
});
