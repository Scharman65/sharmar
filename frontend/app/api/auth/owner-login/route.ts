import { NextRequest, NextResponse } from "next/server";

import { setOwnerSessionCookie } from "../owner-session/cookies";
import { getClientIp, getStrapiBase, jsonError, readJson } from "@/lib/auth/ownerApi";
import { checkRateLimit } from "@/lib/security/ownerRateLimit";
import { normalizeOwnerEmail } from "@/lib/security/ownerPassword";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit("owner-login-ip", ip, 20, 15 * 60 * 1000);
  if (!ipLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: ipLimit.retryAfter });

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const identifier = normalizeOwnerEmail(body.identifier);
  const password = typeof body.password === "string" ? body.password : "";

  const emailLimit = checkRateLimit("owner-login-email", identifier, 8, 15 * 60 * 1000);
  if (!emailLimit.allowed) return jsonError("too_many_attempts", 429, { retryAfter: emailLimit.retryAfter });

  if (!identifier || !password) return jsonError("invalid_credentials", 400);

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

  const response = NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  setOwnerSessionCookie(response, (loginJson as { jwt: string }).jwt);
  return response;
}
