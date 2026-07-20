import { NextRequest, NextResponse } from "next/server";
import { setOwnerSessionCookie } from "../owner-session/cookies";
import { getOwnerInternalToken } from "@/lib/auth/ownerInternalAuth";
import { getClientIp } from "@/lib/auth/ownerApi";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

type PreferredLanguage = "ru" | "me" | "en";

type JsonRecord = Record<string, unknown>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGS = new Set<PreferredLanguage>(["ru", "me", "en"]);

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error(
      "STRAPI_URL is not configured"
    );
  }

  return configured.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function readString(body: JsonRecord, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: { "cache-control": "no-store" } }
  );
}

async function parseJson(req: NextRequest): Promise<JsonRecord | null> {
  try {
    const body: unknown = await req.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getStrapiErrorCode(json: unknown): string {
  if (!isRecord(json)) return "strapi_registration_failed";
  const error = json.error;
  if (!isRecord(error)) return "strapi_registration_failed";
  const name = typeof error.name === "string" ? error.name : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  if (message.includes("email") && (message.includes("taken") || message.includes("already"))) {
    return "email_already_registered";
  }

  if (name || message) return "strapi_registration_failed";
  return "strapi_registration_failed";
}

export async function POST(req: NextRequest) {
  const ipLimit =
    await checkPersistentRateLimit(
      "owner-register-ip",
      getClientIp(req),
      8,
      60 * 60 * 1000
    );

  if (!ipLimit.allowed) {
    return jsonError(
      ipLimit.unavailable
        ? "rate_limit_unavailable"
        : "too_many_attempts",
      ipLimit.unavailable ? 503 : 429
    );
  }

  const body = await parseJson(req);

  if (!body) return jsonError("invalid_request", 400);

  const firstName = readString(body, "first_name");
  const lastName = readString(body, "last_name");
  const email =
    readString(body, "email").toLowerCase();

  if (email) {
    const emailLimit =
      await checkPersistentRateLimit(
        "owner-register-email",
        email,
        4,
        24 * 60 * 60 * 1000
      );

    if (!emailLimit.allowed) {
      return jsonError(
        emailLimit.unavailable
          ? "rate_limit_unavailable"
          : "too_many_attempts",
        emailLimit.unavailable
          ? 503
          : 429
      );
    }
  }

  const whatsappNumber =
    readString(body, "whatsapp_number");
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirm_password === "string" ? body.confirm_password : "";
  const preferredLanguage =
    typeof body.preferred_language === "string" && LANGS.has(body.preferred_language as PreferredLanguage)
      ? (body.preferred_language as PreferredLanguage)
      : null;
  const acceptTerms = body.accept_terms === true;

  if (!firstName || !lastName || !email || !whatsappNumber || !password || !confirmPassword || !preferredLanguage) {
    return jsonError("missing_required_fields", 400);
  }

  if (!EMAIL_RE.test(email)) return jsonError("invalid_email", 400);
  if (password.length < 8) return jsonError("password_too_short", 400);
  if (password !== confirmPassword) return jsonError("password_mismatch", 400);
  if (!acceptTerms) return jsonError("terms_required", 400);

  const strapiBase = getStrapiBase();

  const registerRes = await fetch(`${strapiBase}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      username: email,
      email,
      password,
    }),
  });

  const registerJson = await readJson(registerRes);

  if (!registerRes.ok || !isRecord(registerJson) || typeof registerJson.jwt !== "string" || !isRecord(registerJson.user)) {
    return jsonError(getStrapiErrorCode(registerJson), registerRes.ok ? 502 : registerRes.status);
  }

  const userId =
    typeof registerJson.user.id === "number"
      ? registerJson.user.id
      : Number(registerJson.user.id || 0);

  if (!Number.isFinite(userId) || userId <= 0) {
    return jsonError("registration_user_missing", 502);
  }

  const serverToken = getOwnerInternalToken();

  if (!serverToken) {
    return jsonError("rate_limit_unavailable", 503);
  }

  const profileRes = await fetch(`${strapiBase}/api/owner/profile-create-for-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverToken}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      whatsapp_number: whatsappNumber,
      preferred_language: preferredLanguage,
    }),
  });

  const profileJson = await readJson(profileRes);

  if (!profileRes.ok || !isRecord(profileJson) || profileJson.ok !== true) {
    return NextResponse.json(
      {
        ok: false,
        code: "owner_profile_create_failed",
        status: profileRes.status,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      user_id: userId,
      owner_profile_created: profileJson.created === true,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );

  const profile = isRecord(profileJson.profile) ? profileJson.profile : null;
  const sessionVersion = typeof profile?.session_version === "number" ? profile.session_version : 0;
  setOwnerSessionCookie(response, registerJson.jwt, sessionVersion);

  return response;
}
