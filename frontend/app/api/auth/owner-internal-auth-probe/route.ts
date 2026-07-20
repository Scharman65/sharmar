import { NextResponse } from "next/server";

import { checkPersistentRateLimit } from "@/lib/security/ownerRateLimit";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export async function GET() {
  const result = await checkPersistentRateLimit(
    "owner-internal-auth-probe",
    "sharmar-owner-internal-auth-probe",
    1000,
    10 * 60 * 1000
  );

  if (result.unavailable) {
    return NextResponse.json(
      { ok: false, code: "owner_internal_auth_unavailable", reason: result.reason ?? "cms_unavailable" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { ok: true, status: result.allowed ? "accepted" : "rate_limited" },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
