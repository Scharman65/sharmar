import {
  asString,
  getStrapiBase,
  isRecord,
  readJson,
  strapiFetchJson,
} from "@/lib/auth/ownerApi";

export async function loadOwnerVerificationProfile(
  userId: number,
  ownerInternalToken: string
): Promise<Record<string, unknown> | null> {
  const res = await strapiFetchJson(
    `/api/owner/profile-by-user?user_id=${encodeURIComponent(String(userId))}`,
    { method: "GET" },
    ownerInternalToken
  );

  return res.ok && isRecord(res.json) && isRecord(res.json.profile)
    ? res.json.profile
    : null;
}

export async function updateOwnerVerificationProfile(input: {
  profile: Record<string, unknown>;
  serverToken: string;
  data: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; json: unknown }> {
  const documentId = asString(input.profile.documentId ?? input.profile.document_id);
  if (!documentId) return { ok: false, status: 502, json: null };

  const res = await fetch(
    `${getStrapiBase()}/api/owner-profiles/${encodeURIComponent(documentId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.serverToken}`,
      },
      cache: "no-store",
      body: JSON.stringify({ data: input.data }),
    }
  );

  return {
    ok: res.ok,
    status: res.status,
    json: await readJson(res),
  };
}
