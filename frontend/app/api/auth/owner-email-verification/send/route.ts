import { NextRequest, NextResponse } from "next/server";

import { sendOwnerVerificationEmail } from "@/lib/auth/ownerVerificationEmail";
import {
  asString,
  getClientIp,
  jsonError,
  requireAuthenticatedOwner,
} from "@/lib/auth/ownerApi";
import { normalizeOwnerVerificationLang } from "@/lib/security/ownerContactVerification";
import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  if (auth.auth.ownerProfile?.email_verified === true) {
    return NextResponse.json(
      { ok: true, code: "email_already_verified" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const ownerId = auth.auth.owner.id;
  const email = asString(auth.auth.owner.email)?.toLowerCase() || "";
  if (!email) return jsonError("owner_email_missing", 409);

  const ipLimit = await checkPersistentRateLimit(
    "owner-email-verification-ip",
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
    "owner-email-verification-owner",
    String(ownerId),
    5,
    24 * 60 * 60 * 1000
  );
  if (!ownerLimit.allowed) {
    return jsonError(
      ownerLimit.unavailable ? "rate_limit_unavailable" : "too_many_attempts",
      ownerLimit.unavailable ? 503 : 429,
      { retryAfter: ownerLimit.retryAfter }
    );
  }

  let lang: unknown = auth.auth.ownerProfile?.preferred_language;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && "lang" in body) {
      lang = (body as Record<string, unknown>).lang;
    }
  } catch {
    // Empty request body is valid.
  }

  const result = await sendOwnerVerificationEmail({
    userId: ownerId,
    email,
    lang: normalizeOwnerVerificationLang(lang),
  });

  if (!result.sent) return jsonError(result.code, 503);

  return NextResponse.json(
    { ok: true, code: result.code },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
