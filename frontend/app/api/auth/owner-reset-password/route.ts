import { NextRequest, NextResponse } from "next/server";

import { clearOwnerSessionCookie } from "../owner-session/cookies";
import {
  asString,
  getClientIp,
  getServerToken,
  getStrapiBase,
  isRecord,
  jsonError,
  readJson,
} from "@/lib/auth/ownerApi";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";
import { hashResetToken, validateOwnerPassword } from "@/lib/security/ownerPassword";

async function completePasswordReset(tokenHash: string, password: string, serverToken: string): Promise<{ ok: boolean; status: number; code: string }> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-password-reset/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({
      token_hash: tokenHash,
      password,
    }),
  });
  const json = await readJson(res);
  const code = typeof json === "object" && json !== null && "error" in json && typeof json.error === "string"
    ? json.error
    : "password_reset_failed";
  return { ok: res.ok, status: res.status, code };
}

export async function POST(req: NextRequest) {
  const ipLimit = await checkPersistentRateLimit("owner-reset-password-ip", getClientIp(req), 12, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError(ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", ipLimit.unavailable ? 503 : 429, { retryAfter: ipLimit.retryAfter });

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
  const tokenLimit = await checkPersistentRateLimit("owner-reset-password-token", tokenHash, 8, 60 * 60 * 1000);
  if (!tokenLimit.allowed) return jsonError(tokenLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", tokenLimit.unavailable ? 503 : 429, { retryAfter: tokenLimit.retryAfter });

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("server_token_missing", 503);

  const completed = await completePasswordReset(tokenHash, password, serverToken);
  if (!completed.ok) return jsonError(completed.code, completed.status >= 400 && completed.status < 600 ? completed.status : 502);

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  clearOwnerSessionCookie(response);
  return response;
}
