import { NextRequest, NextResponse } from "next/server";

import {
  asString,
  getServerToken,
  getStrapiBase,
  isRecord,
  jsonError,
  readJson,
  requireAuthenticatedOwner,
} from "@/lib/auth/ownerApi";
import { normalizeOwnerWhatsApp } from "@/lib/security/ownerContactVerification";

const LANGS = new Set(["en", "ru", "me"]);

function cleanString(value: unknown, max = 160): string | null {
  const clean = asString(value);
  return clean ? clean.slice(0, max) : null;
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const documentId = asString(auth.auth.ownerProfile?.documentId);
  const serverToken = getServerToken();
  if (!documentId || !serverToken) return jsonError("owner_profile_missing", 502);

  const preferredLanguage = asString(body.preferred_language);
  const requestedWhatsApp = normalizeOwnerWhatsApp(body.whatsapp_number);
  const currentWhatsApp = normalizeOwnerWhatsApp(auth.auth.ownerProfile?.whatsapp_number);

  if (!requestedWhatsApp) return jsonError("invalid_whatsapp_number", 400);
  if (
    auth.auth.ownerProfile?.whatsapp_verified === true &&
    currentWhatsApp &&
    currentWhatsApp !== requestedWhatsApp
  ) {
    return jsonError("verified_whatsapp_change_requires_support", 409);
  }

  const data = {
    first_name: cleanString(body.first_name, 80),
    last_name: cleanString(body.last_name, 80),
    company_name: cleanString(body.company_name, 120),
    phone: cleanString(body.phone, 80),
    whatsapp_number: requestedWhatsApp,
    country: cleanString(body.country, 80),
    preferred_language: preferredLanguage && LANGS.has(preferredLanguage) ? preferredLanguage : undefined,
  };

  if (!data.first_name || !data.last_name || !data.preferred_language) {
    return jsonError("missing_required_profile_fields", 400);
  }

  const res = await fetch(`${getStrapiBase()}/api/owner-profiles/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverToken}`,
    },
    cache: "no-store",
    body: JSON.stringify({ data }),
  });
  const json = await readJson(res);

  if (!res.ok) {
    return NextResponse.json({ ok: false, code: "owner_profile_update_failed", details: json }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
