import { cookies } from "next/headers";

export const OWNER_SESSION_COOKIE = "sharmar_owner_session";

export async function getOwnerSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(OWNER_SESSION_COOKIE)?.value?.trim();
  return value || null;
}
