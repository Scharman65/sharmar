import { NextRequest, NextResponse } from "next/server";

import { clearOwnerSessionCookie } from "../owner-session/cookies";
import {
  asNumber,
  asString,
  getClientIp,
  getServerToken,
  getStrapiBase,
  isRecord,
  jsonError,
  readJson,
} from "@/lib/auth/ownerApi";
import { checkRateLimit } from "@/lib/security/ownerRateLimit";
import { hashResetToken, validateOwnerPassword } from "@/lib/security/ownerPassword";

async function findProfileByResetHash(tokenHash: string, serverToken: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-password-reset/find`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({ token_hash: tokenHash }),
  });
  const json = await readJson(res);
  return res.ok && isRecord(json) && isRecord(json.profile) ? json.profile : null;
}

async function updateUserPassword(userId: number, password: string, serverToken: string): Promise<boolean> {
  const res = await fetch(`${getStrapiBase()}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverToken}`,
    },
    cache: "no-store",
    body: JSON.stringify({ password }),
  });
  await readJson(res);
  return res.ok;
}

async function consumeResetToken(userId: number, tokenHash: string, changedAt: string, serverToken: string): Promise<boolean> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-password-reset/consume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      token_hash: tokenHash,
      changed_at: changedAt,
    }),
  });
  await readJson(res);
  return res.ok;
}

export async function POST(req: NextRequest) {
  const ipLimit = checkRateLimit("owner-reset-password-ip", getClientIp(req), 12, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: ipLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const token = asString(body.token) || "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirm_password === "string" ? body.confirm_password : "";

  if (!token) return jsonError("reset_token_invalid", 400);
  if (password !== confirmPassword) return jsonError("password_mismatch", 400);

  const passwordValidation = validateOwnerPassword(password);
  if (!passwordValidation.ok) return jsonError(passwordValidation.code, 400);

  const tokenHash = hashResetToken(token);
  const tokenLimit = checkRateLimit("owner-reset-password-token", tokenHash, 8, 60 * 60 * 1000);
  if (!tokenLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: tokenLimit.retryAfter });

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("server_token_missing", 503);

  const profile = await findProfileByResetHash(tokenHash, serverToken);
  if (!profile) return jsonError("reset_token_invalid", 400);

  const userId = asNumber(profile.user_id);
  const expiresAt = asString(profile.password_reset_expires_at);
  const usedAt = asString(profile.password_reset_used_at);

  if (!userId) return jsonError("reset_token_invalid", 400);
  if (usedAt) return jsonError("reset_token_used", 400);
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) return jsonError("reset_token_expired", 400);

  const changedAt = new Date().toISOString();
  const passwordUpdated = await updateUserPassword(userId, password, serverToken);
  if (!passwordUpdated) return jsonError("password_reset_failed", 502);

  const profileUpdated = await consumeResetToken(userId, tokenHash, changedAt, serverToken);
  if (!profileUpdated) return jsonError("password_reset_finalize_failed", 502);

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  clearOwnerSessionCookie(response);
  return response;
}
