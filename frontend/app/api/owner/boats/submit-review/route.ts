import { NextRequest, NextResponse } from "next/server";

import {
  asString,
  getServerToken,
  getStrapiBase,
  isRecord,
  jsonError,
  readJson,
  requireAuthenticatedOwner,
  strapiFetchJson,
} from "@/lib/auth/ownerApi";

const SUBMITTABLE_STATUSES = new Set(["draft", "needs_changes", "rejected"]);

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedOwner(req);
  if (!auth.ok) return auth.response;

  if (auth.auth.ownerProfile?.email_verified !== true) {
    return jsonError("owner_email_not_verified", 409);
  }
  if (auth.auth.ownerProfile?.whatsapp_verified !== true) {
    return jsonError("owner_whatsapp_not_verified", 409);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return jsonError("invalid_request", 400);
  }

  const documentId = asString(body.documentId);
  if (!documentId) return jsonError("document_id_required", 400);

  const serverToken = getServerToken();
  if (!serverToken) return jsonError("server_token_missing", 500);

  const ownerBoatsRes = await strapiFetchJson(
    `/api/owner/boats-by-user?user_id=${auth.auth.owner.id}`,
    { method: "GET" },
    serverToken
  );
  const boats = isRecord(ownerBoatsRes.json) && Array.isArray(ownerBoatsRes.json.boats) ? ownerBoatsRes.json.boats : [];
  const ownedBoat = boats.find((item) => isRecord(item) && item.documentId === documentId);

  if (!ownedBoat || !isRecord(ownedBoat)) return jsonError("boat_not_found_for_owner", 404);

  const status = asString(ownedBoat.moderation_status) || "draft";
  if (!SUBMITTABLE_STATUSES.has(status)) return jsonError("boat_not_submittable", 409);

  const res = await fetch(`${getStrapiBase()}/api/boats/${encodeURIComponent(documentId)}?status=draft`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverToken}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      data: {
        moderation_status: "submitted",
        submitted_for_review_at: new Date().toISOString(),
      },
    }),
  });
  const json = await readJson(res);

  if (!res.ok) {
    return NextResponse.json({ ok: false, code: "submit_for_review_failed", details: json }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
