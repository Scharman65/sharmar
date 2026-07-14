import { NextRequest, NextResponse } from "next/server";

import { clearOwnerSessionCookie } from "../owner-session/cookies";
import { getClientIp, getServerToken, getStrapiBase, jsonError, readJson, requireAuthenticatedOwner } from "@/lib/auth/ownerApi";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";
import { validateOwnerPassword } from "@/lib/security/ownerPassword";

async function changePasswordInCms(userId: number, currentPassword: string, password: string, serverToken: string): Promise<{ ok: boolean; status: number; code: string }> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      current_password: currentPassword,
      password,
    }),
  });
  const json = await readJson(res);
  const code = typeof json === "object" && json !== null && "error" in json && typeof json.error === "string"
    ? json.error
    : "password_change_failed";
  return { ok: res.ok, status: res.status, code };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  const ipLimit = await checkPersistentRateLimit("owner-change-password-ip", getClientIp(req), 12, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError(ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", ipLimit.unavailable ? 503 : 429, { retryAfter: ipLimit.retryAfter });

  const emailLimit = await checkPersistentRateLimit("owner-change-password-user", String(auth.auth.owner.id), 8, 60 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError(emailLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", emailLimit.unavailable ? 503 : 429, { retryAfter: emailLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirm_password === "string" ? body.confirm_password : "";

  if (!currentPassword) return jsonError("current_password_required", 400);
  if (password !== confirmPassword) return jsonError("password_mismatch", 400);

  const passwordValidation = validateOwnerPassword(password);
  if (!passwordValidation.ok) return jsonError(passwordValidation.code, 400);

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("owner_profile_missing", 502);

  const changed = await changePasswordInCms(auth.auth.owner.id, currentPassword, password, serverToken);
  if (!changed.ok) return jsonError(changed.code, changed.status >= 400 && changed.status < 600 ? changed.status : 502);

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  clearOwnerSessionCookie(response);
  return response;
}
