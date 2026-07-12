import { NextRequest, NextResponse } from "next/server";

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
import { checkRateLimit } from "@/lib/security/ownerRateLimit";
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

function siteOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit("owner-forgot-password-ip", ip, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: ipLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const email = normalizeOwnerEmail(body.email);
  const lang = safeLang(body.lang);
  const emailLimit = checkRateLimit("owner-forgot-password-email", email, 3, 60 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: emailLimit.retryAfter });

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("server_token_missing", 503);

  if (!resend) {
    return jsonError("email_unavailable", 503);
  }

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

  const resetUrl = `${siteOrigin(req)}/${lang}/owner-reset-password?token=${encodeURIComponent(token)}`;
  const emailMessage = ownerPasswordResetEmail({ locale: lang, resetUrl, expiresMinutes: RESET_TOKEN_TTL_MINUTES });
  await resend.emails.send({
    from: BOOKING_FROM,
    to: user.email,
    subject: emailMessage.subject,
    text: emailMessage.text,
    html: emailMessage.html,
  });

  return NextResponse.json(NEUTRAL_BODY, { status: 200, headers: { "cache-control": "no-store" } });
}
