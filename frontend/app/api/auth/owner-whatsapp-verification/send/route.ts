import { NextRequest, NextResponse } from "next/server";

import {
  getClientIp,
  jsonError,
  requireAuthenticatedOwner,
} from "@/lib/auth/ownerApi";
import {
  normalizeOwnerWhatsApp,
  ownerWhatsAppVerificationReady,
  startOwnerWhatsAppVerification,
} from "@/lib/security/ownerContactVerification";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  if (auth.auth.ownerProfile?.whatsapp_verified === true) {
    return NextResponse.json(
      { ok: true, code: "whatsapp_already_verified" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const phone = normalizeOwnerWhatsApp(auth.auth.ownerProfile?.whatsapp_number);
  if (!phone) return jsonError("invalid_whatsapp_number", 400);
  if (!ownerWhatsAppVerificationReady()) {
    return jsonError("whatsapp_verification_unavailable", 503);
  }

  const ipLimit = await checkPersistentRateLimit(
    "owner-whatsapp-verification-ip",
    getClientIp(req),
    12,
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
    "owner-whatsapp-verification-owner",
    String(auth.auth.owner.id),
    5,
    60 * 60 * 1000
  );
  if (!ownerLimit.allowed) {
    return jsonError(
      ownerLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts",
      ownerLimit.unavailable ? 503 : 429,
      { retryAfter: ownerLimit.retryAfter }
    );
  }

  const result = await startOwnerWhatsAppVerification({ to: phone });
  if (!result.ok || result.status !== "pending") {
    return jsonError("whatsapp_verification_send_failed", 502);
  }

  return NextResponse.json(
    { ok: true, code: "whatsapp_code_sent" },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
