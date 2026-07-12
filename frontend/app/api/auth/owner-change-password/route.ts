import { NextRequest, NextResponse } from "next/server";

import { clearOwnerSessionCookie } from "../owner-session/cookies";
import { getClientIp, getServerToken, getStrapiBase, jsonError, readJson, requireAuthenticatedOwner } from "@/lib/auth/ownerApi";
import { checkRateLimit } from "@/lib/security/ownerRateLimit";
import { validateOwnerPassword } from "@/lib/security/ownerPassword";

async function markPasswordChanged(userId: number, changedAt: string, serverToken: string): Promise<boolean> {
  const res = await fetch(`${getStrapiBase()}/api/owner/profile-password-changed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-owner-api-token": serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({ user_id: userId, changed_at: changedAt }),
  });
  await readJson(res);
  return res.ok;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  const ipLimit = checkRateLimit("owner-change-password-ip", getClientIp(req), 12, 60 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: ipLimit.retryAfter });

  const emailLimit = checkRateLimit("owner-change-password-user", String(auth.auth.owner.id), 8, 60 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: emailLimit.retryAfter });

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

  const changeRes = await fetch(`${getStrapiBase()}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.auth.userJwt}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      currentPassword,
      password,
      passwordConfirmation: confirmPassword,
    }),
  });
  await readJson(changeRes);
  if (!changeRes.ok) return jsonError("current_password_invalid", 400);

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("owner_profile_missing", 502);

  const changedAt = new Date().toISOString();
  const profileUpdated = await markPasswordChanged(auth.auth.owner.id, changedAt, serverToken);
  if (!profileUpdated) return jsonError("password_change_finalize_failed", 502);

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  clearOwnerSessionCookie(response);
  return response;
}
