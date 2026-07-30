import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "lib/auth/ownerVerificationEmail.ts"), "utf8");

function blockBetween(start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

test("owner verification email uses a dedicated sender env with booking fallback", () => {
  assert.ok(source.includes('OWNER_VERIFICATION_EMAIL_FROM_ENV = "OWNER_VERIFICATION_EMAIL_FROM"'));
  assert.ok(source.includes('String(env[OWNER_VERIFICATION_EMAIL_FROM_ENV] || "").trim() || BOOKING_FROM'));
  assert.ok(source.includes("from: ownerVerificationEmailFrom(env)"));
});

test("owner verification email logs only sanitized provider diagnostics", () => {
  const logBlock = blockBetween(
    "function logOwnerVerificationEmailFailure",
    "export async function sendOwnerVerificationEmail"
  );

  assert.ok(logBlock.includes("OWNER_VERIFICATION_EMAIL_SEND_FAILED"));
  assert.ok(logBlock.includes('provider: "resend"'));
  assert.ok(logBlock.includes("providerCode: providerErrorCode(error)"));
  assert.doesNotMatch(logBlock, /verificationUrl|token|html|text|subject|input\.email/i);
});
