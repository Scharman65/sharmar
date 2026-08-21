import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL(
    "../app/api/auth/owner-forgot-password/route.ts",
    import.meta.url
  ),
  "utf8"
);

test("password reset supports a dedicated sender with booking fallback", () => {
  assert.ok(source.includes("OWNER_PASSWORD_RESET_EMAIL_FROM"));
  assert.ok(
    source.includes(
      '(process.env.OWNER_PASSWORD_RESET_EMAIL_FROM || "").trim() || BOOKING_FROM'
    )
  );
  assert.ok(source.includes("from: ownerPasswordResetFrom"));
});

test("password reset verifies the actual Resend provider result", () => {
  assert.ok(source.includes("const result = await resend.emails.send"));
  assert.ok(source.includes("resendSendSucceeded(result)"));
  assert.ok(
    source.includes("OWNER_PASSWORD_RESET_EMAIL_SEND_FAILED")
  );
  assert.ok(source.includes("resendProviderErrorCode(result.error)"));
});
