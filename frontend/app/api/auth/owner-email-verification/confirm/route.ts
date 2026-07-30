import { NextRequest, NextResponse } from "next/server";

import { getOwnerInternalToken } from "@/lib/auth/ownerInternalAuth";
import {
  asNumber,
  asString,
  getClientIp,
  getServerToken,
  isRecord,
  jsonError,
  strapiFetchJson,
} from "@/lib/auth/ownerApi";
import {
  loadOwnerVerificationProfile,
  updateOwnerVerificationProfile,
} from "@/lib/auth/ownerVerificationProfile";
import {
  getOwnerContactVerificationSecret,
  hashOwnerVerificationEmail,
  nextOwnerContactVerificationStatus,
  verifyOwnerEmailVerificationToken,
} from "@/lib/security/ownerContactVerification";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

async function findOwnerUser(userId: number, serverToken: string) {
  const qs = new URLSearchParams();
  qs.set("filters[id][$eq]", String(userId));
  qs.set("pagination[pageSize]", "1");

  const res = await strapiFetchJson(
    `/api/users?${qs.toString()}`,
    { method: "GET" },
    serverToken
  );
  const rows = Array.isArray(res.json) ? res.json : [];
  const user = rows.find(isRecord);
  const id = asNumber(user?.id);
  const email = asString(user?.email)?.toLowerCase() || "";
  return res.ok && id === userId && email ? { id, email } : null;
}

export async function POST(req: NextRequest) {
  const ipLimit = await checkPersistentRateLimit(
    "owner-email-verification-confirm-ip",
    getClientIp(req),
    20,
    60 * 60 * 1000
  );
  if (!ipLimit.allowed) {
    return jsonError(
      ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts",
      ipLimit.unavailable ? 503 : 429,
      { retryAfter: ipLimit.retryAfter }
    );
  }

  let token = "";
  try {
    const body = await req.json();
    token =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).token === "string"
        ? String((body as Record<string, unknown>).token).trim()
        : "";
  } catch {
    return jsonError("invalid_request", 400);
  }

  const secret = getOwnerContactVerificationSecret();
  if (!secret) return jsonError("verification_secret_missing", 503);

  const payload = verifyOwnerEmailVerificationToken({ token, secret });
  if (!payload) return jsonError("email_verification_token_invalid", 400);

  const serverToken = getServerToken();
  const ownerInternalToken = getOwnerInternalToken();
  if (!serverToken || !ownerInternalToken) return jsonError("verification_service_unavailable", 503);

  const user = await findOwnerUser(payload.userId, serverToken);
  if (!user || hashOwnerVerificationEmail(user.email) !== payload.emailHash) {
    return jsonError("email_verification_token_invalid", 400);
  }

  const profile = await loadOwnerVerificationProfile(user.id, ownerInternalToken);
  if (!profile) return jsonError("owner_profile_missing", 404);

  if (profile.email_verified === true) {
    return NextResponse.json(
      { ok: true, code: "email_already_verified" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const whatsappVerified = profile.whatsapp_verified === true;
  const verificationStatus = nextOwnerContactVerificationStatus({
    currentStatus: profile.verification_status,
    emailVerified: true,
    whatsappVerified,
  });

  const updated = await updateOwnerVerificationProfile({
    profile,
    serverToken,
    data: {
      email_verified: true,
      verification_status: verificationStatus,
    },
  });

  if (!updated.ok) return jsonError("email_verification_update_failed", 502);

  return NextResponse.json(
    { ok: true, code: "email_verified" },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
