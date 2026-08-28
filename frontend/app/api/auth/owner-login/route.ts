import { NextRequest, NextResponse } from "next/server";

import { setOwnerSessionCookie } from "../owner-session/cookies";
import { getOwnerInternalToken } from "@/lib/auth/ownerInternalAuth";
import { parseOwnerLoginCredentials } from "@/lib/auth/ownerLoginCredentials";
import { asNumber, getClientIp, getStrapiBase, isRecord, jsonError, readJson, strapiFetchJson } from "@/lib/auth/ownerApi";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = await checkPersistentRateLimit("owner-login-ip", ip, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError(ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", ipLimit.unavailable ? 503 : 429, { retryAfter: ipLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const credentials = parseOwnerLoginCredentials(body);
  const identifier = credentials.identifier;

  const emailLimit = await checkPersistentRateLimit("owner-login-email", identifier, 8, 15 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError(emailLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts", emailLimit.unavailable ? 503 : 429, { retryAfter: emailLimit.retryAfter });

  if (!credentials.ok) return jsonError(credentials.code, credentials.status);

  const password = credentials.password;

  const loginRes = await fetch(`${getStrapiBase()}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ identifier, password }),
  });
  const loginJson = await readJson(loginRes);

  if (!loginRes.ok || typeof (loginJson as { jwt?: unknown } | null)?.jwt !== "string") {
    return jsonError("invalid_credentials", 401);
  }

  const loginUser = isRecord(loginJson) && isRecord(loginJson.user) ? loginJson.user : null;
  const userId = asNumber(loginUser?.id);
  const serverToken = getOwnerInternalToken();
  if (!userId || !serverToken) return jsonError("owner_profile_unavailable", 503);

  const profileRes = await strapiFetchJson(`/api/owner/profile-by-user?user_id=${userId}`, { method: "GET" }, serverToken);
  const profile = isRecord(profileRes.json) && isRecord(profileRes.json.profile) ? profileRes.json.profile : null;
  if (!profileRes.ok || !profile) return jsonError("owner_profile_unavailable", 503);
  const sessionVersion = asNumber(profile.session_version) ?? 0;

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  setOwnerSessionCookie(response, (loginJson as { jwt: string }).jwt, sessionVersion);
  return response;
}
