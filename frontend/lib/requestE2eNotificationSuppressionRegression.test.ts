import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("request E2E notification suppression is secret-gated and fail-closed", () => {
  const requestApi = source("frontend/app/api/request/route.ts");

  assert.match(requestApi, /process\.env\.SHARMAR_E2E_TEST_SECRET/);
  assert.match(requestApi, /x-sharmar-e2e-test-secret/);
  assert.match(requestApi, /x-sharmar-e2e-suppress-notifications/);
  assert.match(requestApi, /configuredSecret\.length < 32/);
  assert.match(requestApi, /suppliedSecret\.length !== configuredSecret\.length/);
  assert.match(requestApi, /crypto\.timingSafeEqual/);
  assert.match(requestApi, /catch \{\s*return false;\s*\}/);
});

test("authorized E2E mode suppresses every outbound notification path", () => {
  const requestApi = source("frontend/app/api/request/route.ts");

  assert.match(
    requestApi,
    /BOOKING_TO[\s\S]*resend[\s\S]*!suppressNotifications[\s\S]*bookingAdminEmail/
  );

  assert.match(
    requestApi,
    /if \(id > 0 && !suppressNotifications\)[\s\S]*notifyOwnerOfBookingRequest/
  );

  assert.match(
    requestApi,
    /p\.email[\s\S]*resend[\s\S]*!suppressNotifications[\s\S]*bookingCustomerRequestEmail/
  );

  assert.match(
    requestApi,
    /notificationsSuppressed: suppressNotifications/
  );

  assert.match(
    requestApi,
    /e2e_notifications_suppressed: suppressNotifications/
  );
});

test("ordinary requests remain fail-closed without every safeguard", () => {
  const requestApi = source("frontend/app/api/request/route.ts");

  assert.match(
    requestApi,
    /const suppressionRequested =[\s\S]*=== "1"/
  );

  assert.match(
    requestApi,
    /!suppressionRequested \|\|[\s\S]*configuredSecret\.length < 32 \|\|[\s\S]*suppliedSecret\.length !== configuredSecret\.length[\s\S]*return false/
  );

  assert.doesNotMatch(
    requestApi,
    /SHARMAR_E2E_TEST_SECRET\s*\?\?\s*"[^"]+"/
  );

  assert.doesNotMatch(
    requestApi,
    /suppressNotifications\s*=\s*true/
  );
});
