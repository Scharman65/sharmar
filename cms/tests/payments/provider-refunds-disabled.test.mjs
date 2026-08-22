import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cmsRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const repoRoot = dirname(cmsRoot);

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const bookingController = read("cms/src/api/booking-request/controllers/booking-request.ts");
const paymentController = read("cms/src/api/payment/controllers/payment.ts");
const paymentRoutes = read("cms/src/api/payment/routes/payment.ts");
const paymentService = read("cms/src/api/payment/services/payment.ts");
const dodoService = read("cms/src/api/payment/services/dodo.ts");
const adminDashboardController = read("cms/src/api/admin-dashboard/controllers/admin-dashboard.ts");
const adminDashboardService = read("cms/src/api/admin-dashboard/services/marketplace-analytics.ts");
const adminDashboardRoutes = read("cms/src/api/admin-dashboard/routes/admin-dashboard.ts");
const adminExternalRefundProxy = read("frontend/app/api/admin/booking-requests/[id]/external-refund/route.ts");
const ownerProxy = read("frontend/app/api/owner-actions/[token]/[action]/route.ts");

const paymentSource = [
  bookingController,
  paymentController,
  paymentRoutes,
  paymentService,
  dodoService,
  adminDashboardController,
  adminDashboardService,
  adminDashboardRoutes,
  adminExternalRefundProxy,
  ownerProxy,
].join("\n");

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function withoutCommentsOrStrings(source) {
  return withoutComments(source).replace(/(["'`])(?:\\[\s\S]|(?!\1)[\s\S])*?\1/g, "\"\"");
}

test("production payment source contains no executable provider refund initiation", () => {
  const executableCode = withoutCommentsOrStrings(paymentSource);
  const requestCode = withoutComments(paymentSource);

  assert.doesNotMatch(executableCode, /\bstripe\s*(?:\.|\?\.)\s*refunds\s*(?:\.|\?\.)\s*create\s*\(/i);
  assert.doesNotMatch(executableCode, /\brefunds\s*(?:\.|\?\.)\s*create\s*\(/i);
  assert.doesNotMatch(
    requestCode,
    /\bfetch\s*\(\s*(?:dodoBase|dodoCfg\.(?:apiBaseUrl|baseUrl)|[^,\n)]*dodopayments\.com)[\s\S]{0,240}["'`][^"'`]*(?:\/refunds?|refunds?\/)[^"'`]*["'`]/i
  );
  assert.doesNotMatch(
    requestCode,
    /\bfetch\s*\([\s\S]{0,240}\b(?:dodoBase|dodoCfg\.(?:apiBaseUrl|baseUrl)|providerBase|providerApiBase|paymentProviderBase|paymentsBase)\b[\s\S]{0,240}(?:\/refunds?|refunds?\/)/i
  );
  assert.doesNotMatch(
    requestCode,
    /\bfetch\s*\([\s\S]{0,240}["'`][^"'`]*\/api\/payments\/refunds?(?:\/|["'`?])[^"'`]*["'`]/i
  );
  assert.doesNotMatch(paymentRoutes, /path:\s*["']\/payments\/refunds?(?:\/|["'])/i);
  assert.doesNotMatch(paymentRoutes, /handler:\s*["']payment\.(?:refund|refundPayment|providerRefund|stripeRefund|dodoRefund)["']/i);
  assert.doesNotMatch(executableCode, /\basync\s+(?:providerRefund|refundProvider|stripeRefund|dodoRefund)\s*\(/i);
  assert.doesNotMatch(executableCode, /\b(?:providerRefund|refundProvider|stripeRefund|dodoRefund)\s*:\s*async\s*\(/i);
  assert.doesNotMatch(bookingController, /owner_decline_refund|owner_refund:|request_decline_refund/);
});

test("owner refund API and Next owner proxy fail closed with external_refund_only", () => {
  assert.match(bookingController, /async ownerRefund/);
  assert.match(bookingController, /ctx\.status = 409/);
  assert.match(bookingController, /external_refund_only/);
  assert.match(ownerProxy, /mapped === "owner-refund"/);
  assert.match(ownerProxy, /return json\(409/);
  assert.match(ownerProxy, /external_refund_only/);
});

test("paid owner decline, request decline, and admin markers store only external refund status", () => {
  assert.match(bookingController, /external_refund_status = case when \?/);
  assert.match(bookingController, /external_refund_marked_at = case when \?/);
  assert.match(bookingController, /external_refund_completed_at = case when \?/);
  assert.match(adminExternalRefundProxy, /keys\.length !== 1 \|\| keys\[0\] !== "external_refund_status"/);
  assert.match(adminExternalRefundProxy, /value === "none" \|\| value === "required" \|\| value === "completed"/);
  assert.match(adminDashboardController, /external_refund_transaction_unavailable/);
  assert.match(adminDashboardController, /external_refund_status_completed_terminal/);
  assert.match(adminDashboardRoutes, /\/admin-dashboard\/booking-requests\/:id\/external-refund/);
  assert.doesNotMatch(bookingController, /refund_failed_no_id|refund_id = coalesce/);
});
