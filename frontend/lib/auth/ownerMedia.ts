import { getOwnerInternalToken, OWNER_INTERNAL_HEADER } from "@/lib/auth/ownerInternalAuth";
import { getStrapiBase, readJson } from "@/lib/auth/ownerApi";

function uniquePositiveIds(ids: unknown[]): number[] {
  return Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
}

async function callMediaOwnership(path: string, userId: number, fileIds: number[], purpose?: string): Promise<boolean> {
  const serverToken = getOwnerInternalToken();
  if (!serverToken || fileIds.length === 0) return false;

  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [OWNER_INTERNAL_HEADER]: serverToken,
    },
    cache: "no-store",
    body: JSON.stringify({
      user_id: userId,
      file_ids: fileIds,
      ...(purpose ? { purpose } : {}),
    }),
  });
  await readJson(res);
  return res.ok;
}

export async function registerOwnerMedia(userId: number, fileIds: unknown[], purpose = "owner_upload"): Promise<boolean> {
  return callMediaOwnership("/api/owner/media-ownership/register", userId, uniquePositiveIds(fileIds), purpose);
}

export async function verifyOwnerMedia(userId: number, fileIds: unknown[]): Promise<boolean> {
  const ids = uniquePositiveIds(fileIds);
  if (ids.length === 0) return true;
  return callMediaOwnership("/api/owner/media-ownership/verify", userId, ids);
}
