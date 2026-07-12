import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const RESET_TOKEN_TTL_MINUTES = 45;

export function normalizeOwnerEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateOwnerPassword(password: unknown): { ok: true } | { ok: false; code: string } {
  if (typeof password !== "string") return { ok: false, code: "password_required" };
  if (password.length < 10) return { ok: false, code: "password_too_short" };
  if (!/[a-z]/.test(password)) return { ok: false, code: "password_lowercase_required" };
  if (!/[A-Z]/.test(password)) return { ok: false, code: "password_uppercase_required" };
  if (!/[0-9]/.test(password)) return { ok: false, code: "password_number_required" };
  return { ok: true };
}

export function createResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function resetExpiryIso(now: number = Date.now()): string {
  return new Date(now + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
}

export function safeTokenHashEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
