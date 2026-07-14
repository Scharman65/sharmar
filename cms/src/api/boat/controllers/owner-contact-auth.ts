import crypto from "crypto";

export function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function ownerContactInternalAuthorized(headers: Record<string, unknown>, expectedSecret: string): boolean {
  const expected = String(expectedSecret || "").trim();
  if (!expected) return false;

  const raw =
    headers["x-sharmar-internal-secret"] ||
    headers["x-internal-notify-secret"] ||
    "";
  const got = (Array.isArray(raw) ? String(raw[0] || "") : String(raw || "")).trim();

  return !!got && timingSafeEqualString(got, expected);
}
