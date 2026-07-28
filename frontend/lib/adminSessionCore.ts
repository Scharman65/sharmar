import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "sharmar_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const LOCAL_ADMIN_SESSION_SECRET = "sharmar-local-admin-session-secret-v1";

export type AdminPermission = "dashboard" | "translation" | "moderation";

export type AdminSession = {
  permissions: AdminPermission[];
  expiresAt: number;
};

export type AdminSessionFailureCode =
  | "admin_cookie_missing"
  | "admin_session_unavailable"
  | "invalid_admin_session"
  | "session_expired";

export type AdminSessionStatus =
  | {
      authenticated: true;
      session: AdminSession;
      code: "authenticated";
    }
  | {
      authenticated: false;
      session: null;
      code: AdminSessionFailureCode;
    };

type AdminCredential = {
  token: string;
  permissions: AdminPermission[];
};

type SessionPayload = {
  v: 1;
  exp: number;
  permissions: AdminPermission[];
};

type EnvSource = Record<string, string | undefined>;

function envValue(env: EnvSource, key: string): string {
  return String(env[key] || "").trim();
}

function nowSeconds(now = Date.now()): number {
  return Math.floor(now / 1000);
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64url(input: string): string {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function uniquePermissions(permissions: AdminPermission[]): AdminPermission[] {
  return Array.from(new Set(permissions));
}

function configuredCredentials(env: EnvSource = process.env): AdminCredential[] {
  const translationToken = envValue(env, "ADMIN_TRANSLATION_TOKEN");
  const moderationToken = envValue(env, "ADMIN_MODERATION_TOKEN");
  const credentials: AdminCredential[] = [];

  if (translationToken) {
    credentials.push({
      token: translationToken,
      permissions: ["dashboard", "translation"],
    });
  }

  if (moderationToken) {
    credentials.push({
      token: moderationToken,
      permissions: ["dashboard", "translation", "moderation"],
    });
  }

  return credentials;
}

function signingSecret(env: EnvSource = process.env): string | null {
  const explicitSecret = envValue(env, "ADMIN_SESSION_SECRET");
  if (explicitSecret) return explicitSecret;

  if (envValue(env, "NODE_ENV") === "production") return null;

  return LOCAL_ADMIN_SESSION_SECRET;
}

function tokensMatch(input: string, configured: string): boolean {
  const left = Buffer.from(input);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

function signPayload(encodedPayload: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(encodedPayload).digest());
}

export function authenticateAdminPassword(
  password: string,
  env: EnvSource = process.env,
  now = Date.now()
): AdminSession | null {
  const trimmed = password.trim();
  if (!trimmed) return null;

  const permissions: AdminPermission[] = [];
  for (const credential of configuredCredentials(env)) {
    if (tokensMatch(trimmed, credential.token)) {
      permissions.push(...credential.permissions);
    }
  }

  if (!permissions.length) return null;

  return {
    permissions: uniquePermissions(permissions),
    expiresAt: nowSeconds(now) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export function createAdminSessionCookie(
  permissions: AdminPermission[],
  env: EnvSource = process.env,
  now = Date.now()
): string | null {
  const secret = signingSecret(env);
  if (!secret) return null;

  const payload: SessionPayload = {
    v: 1,
    exp: nowSeconds(now) + ADMIN_SESSION_MAX_AGE_SECONDS,
    permissions: uniquePermissions(permissions),
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyAdminSessionCookieDetailed(
  value: string | undefined | null,
  env: EnvSource = process.env,
  now = Date.now()
): AdminSessionStatus {
  const secret = signingSecret(env);
  if (!secret) return { authenticated: false, session: null, code: "admin_session_unavailable" };

  const raw = value?.trim();
  if (!raw) return { authenticated: false, session: null, code: "admin_cookie_missing" };

  const [encodedPayload, signature, ...rest] = raw.split(".");
  if (!encodedPayload || !signature || rest.length) {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  const expected = signPayload(encodedPayload, secret);
  if (!tokensMatch(signature, expected)) {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(encodedPayload)) as SessionPayload;
  } catch {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  if (payload.v !== 1 || !Array.isArray(payload.permissions)) {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  if (!Number.isFinite(payload.exp)) {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  if (payload.exp <= nowSeconds(now)) {
    return { authenticated: false, session: null, code: "session_expired" };
  }

  const permissions = payload.permissions.filter(
    (permission): permission is AdminPermission =>
      permission === "dashboard" || permission === "translation" || permission === "moderation"
  );
  if (!permissions.length) {
    return { authenticated: false, session: null, code: "invalid_admin_session" };
  }

  return {
    authenticated: true,
    session: {
      permissions: uniquePermissions(permissions),
      expiresAt: payload.exp,
    },
    code: "authenticated",
  };
}

export function verifyAdminSessionCookie(
  value: string | undefined | null,
  env: EnvSource = process.env,
  now = Date.now()
): AdminSession | null {
  const result = verifyAdminSessionCookieDetailed(value, env, now);
  return result.authenticated ? result.session : null;
}
