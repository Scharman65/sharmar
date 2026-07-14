import { NextRequest, NextResponse } from "next/server";
import { appendFile } from "node:fs/promises";

import { BOOKING_FROM, resend } from "@/app/lib/email";
import { ownerPasswordResetEmail } from "@/app/lib/emailTemplates";
import {
  asNumber,
  asString,
  getClientIp,
  getServerToken,
  getStrapiBase,
  isRecord,
  jsonError,
  readJson,
  strapiFetchJson,
} from "@/lib/auth/ownerApi";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";
import {
  createResetToken,
  hashResetToken,
  normalizeOwnerEmail,
  resetExpiryIso,
  RESET_TOKEN_TTL_MINUTES,
} from "@/lib/security/ownerPassword";

const NEUTRAL_BODY = { ok: true, code: "password_reset_if_registered" };

function safeLang(value: unknown): "en" | "ru" | "me" {
  return value === "ru" || value === "me" || value === "en" ? value : "en";
}

function configuredSiteOrigin(): string | null {
  const raw = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (process.env.NODE_ENV !== "production" && url.protocol !== "https:" && !isLocal) return null;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function findUserByEmail(email: string, serverToken: string): Promise<{ id: number; email: string } | null> {
  const qs = new URLSearchParams();
  qs.set("filters[email][$eq]", email);
  qs.set("pagination[pageSize]", "1");
  const res = await strapiFetchJson(`/api/users?${qs.toString()}`, { method: "GET" }, serverToken);
  const rows = Array.isArray(res.json) ? res.json : [];
  const row = rows.find(isRecord);
  const id = asNumber(row?.id);
  const rowEmail = asString(row?.email);
  return id && rowEmail ? { id, email: rowEmail } : null;
}

async function getOwnerProfile(userId: number, serverToken: string): Promise<Record<string, unknown> | null> {
  const res = await strapiFetchJson(`/api/owner/profile-by-user?user_id=${userId}`, { method: "GET" }, serverToken);
  return isRecord(res.json) && isRecord(res.json.profile) ? res.json.profile : null;
}

async function setResetToken(userId: number, tokenHash: string, expiresAt: string, serverToken: string): Promise<boolean> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-password-reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    }),
  });
  await readJson(res);
  return res.ok;
}

async function sendResetEmail(to: string, message: { subject: string; text: string; html: string }): Promise<boolean> {
  const mockFile = (process.env.OWNER_RESET_EMAIL_MOCK_FILE || "").trim();
  if (process.env.NODE_ENV === "test" && mockFile) {
    await appendFile(
      mockFile,
      `${JSON.stringify({ to, subject: message.subject, text: message.text, html: message.html })}\n`,
      "utf8"
    );
    return true;
  }

  if (!resend) return false;
  await resend.emails.send({
    from: BOOKING_FROM,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = await checkPersistentRateLimit("owner-forgot-password-ip", ip, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError(ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", ipLimit.unavailable ? 503 : 429, { retryAfter: ipLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const email = normalizeOwnerEmail(body.email);
  const lang = safeLang(body.lang);
  const emailLimit = await checkPersistentRateLimit("owner-forgot-password-email", email, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError(emailLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", emailLimit.unavailable ? 503 : 429, { retryAfter: emailLimit.retryAfter });

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("server_token_missing", 503);

  if (!resend && !(process.env.NODE_ENV === "test" && process.env.OWNER_RESET_EMAIL_MOCK_FILE)) {
    return jsonError("email_unavailable", 503);
  }

  const siteOrigin = configuredSiteOrigin();
  if (!siteOrigin) return jsonError("site_url_not_configured", 503);

  if (!email) {
    return NextResponse.json(NEUTRAL_BODY, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const user = await findUserByEmail(email, serverToken);
  if (!user) {
    return NextResponse.json(NEUTRAL_BODY, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const profile = await getOwnerProfile(user.id, serverToken);
  if (!asString(profile?.documentId)) {
    return NextResponse.json(NEUTRAL_BODY, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const token = createResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = resetExpiryIso();

  const updated = await setResetToken(user.id, tokenHash, expiresAt, serverToken);

  if (!updated) return jsonError("password_reset_prepare_failed", 502);

  const resetUrl = `${siteOrigin}/${lang}/owner-reset-password?token=${encodeURIComponent(token)}`;
  const emailMessage = ownerPasswordResetEmail({ locale: lang, resetUrl, expiresMinutes: RESET_TOKEN_TTL_MINUTES });
  const sent = await sendResetEmail(user.email, emailMessage);
  if (!sent) return jsonError("email_unavailable", 503);

  return NextResponse.json(NEUTRAL_BODY, { status: 200, headers: { "cache-control": "no-store" } });
}
