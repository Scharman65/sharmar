export const OWNER_INTERNAL_TOKEN_ENV = "OWNER_API_TOKEN";
export const OWNER_INTERNAL_HEADER = "x-owner-api-token";

type Env = Record<string, string | undefined>;

export type OwnerInternalTokenSource =
  | "OWNER_API_TOKEN"
  | "development_legacy_strapi_token"
  | "missing";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getOwnerInternalTokenSource(env: Env = process.env): OwnerInternalTokenSource {
  if (clean(env.OWNER_API_TOKEN)) return "OWNER_API_TOKEN";

  if (env.NODE_ENV !== "production" && (clean(env.STRAPI_WRITE_TOKEN) || clean(env.STRAPI_TOKEN))) {
    return "development_legacy_strapi_token";
  }

  return "missing";
}

export function getOwnerInternalToken(env: Env = process.env): string {
  const canonical = clean(env.OWNER_API_TOKEN);
  if (canonical) return canonical;

  if (env.NODE_ENV !== "production") {
    return clean(env.STRAPI_WRITE_TOKEN) || clean(env.STRAPI_TOKEN);
  }

  return "";
}

export function ownerInternalHeader(env: Env = process.env): Record<string, string> | null {
  const token = getOwnerInternalToken(env);
  return token ? { [OWNER_INTERNAL_HEADER]: token } : null;
}

export function ownerInternalBearer(env: Env = process.env): Record<string, string> | null {
  const token = getOwnerInternalToken(env);
  return token ? { Authorization: `Bearer ${token}` } : null;
}
