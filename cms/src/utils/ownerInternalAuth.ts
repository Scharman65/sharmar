import crypto from "crypto";

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function bearerToken(value: unknown): string {
  const raw = cleanString(value);
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match?.[1]?.trim() || "";
}

export function isOwnerInternalAuthorized(
  ctx: any
): boolean {
  const configured = cleanString(
    process.env.OWNER_API_TOKEN ||
      process.env.STRAPI_WRITE_TOKEN ||
      process.env.STRAPI_TOKEN
  );

  const headers = ctx.request?.headers || {};

  const providedHeader = cleanString(
    headers["x-owner-api-token"] ||
      ctx.get?.("x-owner-api-token")
  );

  const providedBearer = bearerToken(
    headers.authorization ||
      headers.Authorization ||
      ctx.get?.("authorization")
  );

  const provided =
    providedHeader || providedBearer;

  if (!configured || !provided) {
    return false;
  }

  const configuredDigest = crypto
    .createHash("sha256")
    .update(configured)
    .digest();

  const providedDigest = crypto
    .createHash("sha256")
    .update(provided)
    .digest();

  return crypto.timingSafeEqual(
    configuredDigest,
    providedDigest
  );
}
