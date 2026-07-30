import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  getServerToken,
  isRecord,
  jsonError,
  requireAuthenticatedOwner,
} from "@/lib/auth/ownerApi";
import {
  updateOwnerVerificationProfile,
} from "@/lib/auth/ownerVerificationProfile";
import {
  checkOwnerWhatsAppVerification,
  nextOwnerContactVerificationStatus,
  normalizeOwnerWhatsApp,
  ownerWhatsAppVerificationReady,
} from "@/lib/security/ownerContactVerification";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  const profile = isRecord(auth.auth.ownerProfile) ? auth.auth.ownerProfile : null;
  if (!profile) return jsonError("owner_profile_missing", 404);

  if (profile.whatsapp_verified === true) {
    return NextResponse.json(
      { ok: true, code: "whatsapp_already_verified" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  let code = "";
  try {
    const body = await req.json();
    code =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).code === "string"
        ? String((body as Record<string, unknown>).code).trim()
        : "";
  } catch {
    return jsonError("invalid_request", 400);
  }

  if (!/^\d{4,10}$/.test(code)) return jsonError("invalid_verification_code", 400);

  const phone = normalizeOwnerWhatsApp(profile.whatsapp_number);
  if (!phone) return jsonError("invalid_whatsapp_number", 400);
  if (!ownerWhatsAppVerificationReady()) {
    return jsonError("whatsapp_verification_unavailable", 503);
  }

  const ipLimit = await checkPersistentRateLimit(
    "owner-whatsapp-verification-check-ip",
    getClientIp(req),
    30,
    60 * 60 * 1000
  );
  if (!ipLimit.allowed) {
    return jsonError(
      ipLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts",
      ipLimit.unavailable ? 503 : 429,
      { retryAfter: ipLimit.retryAfter }
    );
  }

  const ownerLimit = await checkPersistentRateLimit(
    "owner-whatsapp-verification-check-owner",
    String(auth.auth.owner.id),
    8,
    15 * 60 * 1000
  );
  if (!ownerLimit.allowed) {
    return jsonError(
      ownerLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts",
      ownerLimit.unavailable ? 503 : 429,
      { retryAfter: ownerLimit.retryAfter }
    );
  }

  const result = await checkOwnerWhatsAppVerification({ to: phone, code });
  if (!result.ok || result.status !== "approved") {
    return jsonError(
      result.status === "expired" ? "whatsapp_code_expired" : "whatsapp_code_invalid",
      400
    );
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return jsonError("verification_service_unavailable", 503);
  }

  const emailVerified = profile.email_verified === true;
  const verificationStatus = nextOwnerContactVerificationStatus({
    currentStatus: profile.verification_status,
    emailVerified,
    whatsappVerified: true,
  });

  const updated = await updateOwnerVerificationProfile({
    profile,
    serverToken,
    data: {
      whatsapp_verified: true,
      verification_status: verificationStatus,
    },
  });

  if (!updated.ok) return jsonError("whatsapp_verification_update_failed", 502);

  return NextResponse.json(
    { ok: true, code: "whatsapp_verified" },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
