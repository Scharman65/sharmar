import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(frontendRoot);

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const cmsAnalytics = read("cms/src/api/admin-dashboard/services/marketplace-analytics.ts");
const nextAnalytics = read("frontend/app/api/admin/marketplace-analytics/route.ts");
const externalRefundRoute = read("frontend/app/api/admin/booking-requests/[id]/external-refund/route.ts");
const ownerProxy = read("frontend/app/api/owner-actions/[token]/[action]/route.ts");
const controlCenter = read("frontend/app/[lang]/admin/AdminBoatControlCenter.tsx");
const clientAggregator = read("frontend/lib/adminMarketplaceControlCenter.ts");

test("Next analytics proxy requires admin session and never exposes CMS credentials to the browser", () => {
  assert.match(nextAnalytics, /getAdminSessionStatus/);
  assert.match(nextAnalytics, /missing_dashboard_permission/);
  assert.match(nextAnalytics, /x-admin-token/);
  assert.doesNotMatch(controlCenter, /x-admin-token|Authorization|Bearer|STRAPI_|PAYMENTS_ADMIN_TOKEN|SHARMAR_OWNER_ACTION_TOKEN/);
});

test("period buttons load server analytics with duplicate request protection", () => {
  assert.match(controlCenter, /\/api\/admin\/marketplace-analytics\?period=/);
  assert.match(controlCenter, /AbortController/);
  assert.match(controlCenter, /analyticsRequestRef/);
  assert.match(controlCenter, /analyticsLoading/);
  assert.match(controlCenter, /analyticsError/);
  assert.match(controlCenter, /period-buttons/);
  assert.match(controlCenter, /\(\[7, 30, 90, "all"\] as const\)\.map/);
});

test("canonical server financial analytics remains authoritative when present", () => {
  assert.match(controlCenter, /const canonicalFinancial = serverAnalytics\?\.financialByCurrency/);
  assert.match(controlCenter, /serverAmountLines\(canonicalFinancial, "paidCustomerTotalMajor"\) \|\| missing\[lang\]/);
  assert.match(controlCenter, /serverCentsLines\(canonicalFinancial, "realizedMarketplaceFeeCents"\) \|\| missing\[lang\]/);
  assert.match(controlCenter, /serverAmountLines\(canonicalFinancial, "ownerPayoutMajor"\) \|\| missing\[lang\]/);
  assert.match(controlCenter, /financialPreviewComplete\s*\?\s*amountLines\(view\.financialByCurrency, "bookingPaid"\)/);
  assert.match(controlCenter, /:\s*ui\.financialPreviewUnavailable/);
});

test("frontend fails closed when dashboard preview collections are incomplete", () => {
  assert.match(controlCenter, /collectionCompleteness\?: JsonRecord \| null/);
  assert.match(controlCenter, /function collectionComplete/);
  assert.match(controlCenter, /bookingRequests: collectionComplete\(collectionCompleteness, "bookingRequests"\)/);
  assert.match(controlCenter, /payments: collectionComplete\(collectionCompleteness, "payments"\)/);
  assert.match(controlCenter, /previewCompleteness,/);
  assert.match(
    controlCenter,
    /const rowPreviewNotice = !rowBookingPreviewComplete && !rowPaymentPreviewComplete[\s\S]*?\? ui\.previewUnavailable[\s\S]*?: !rowBookingPreviewComplete[\s\S]*?\? ui\.bookingPreviewUnavailable[\s\S]*?: !rowPaymentPreviewComplete[\s\S]*?\? ui\.paymentPreviewUnavailable/,
  );
  assert.match(
    controlCenter,
    /\{rowPreviewNotice \? <p className="admin-warning" role="status">\{rowPreviewNotice\}<\/p> : null\}/,
  );
  assert.match(controlCenter, /rowBookingPreviewComplete \? counters\.requests : "—"/);
  assert.match(controlCenter, /rowFinancialPreviewComplete \? amountLines\(row\.financialByCurrency, "bookingPaid"\)/);
  assert.match(controlCenter, /ui\.financialPreviewUnavailable/);
  assert.match(controlCenter, /!rowBookingPreviewComplete \? \(/);
  assert.match(controlCenter, /ui\.bookingPreviewUnavailable/);
  assert.match(controlCenter, /Preview data incomplete/);
  assert.match(controlCenter, /Предпросмотр неполный/);
  assert.match(controlCenter, /Podaci pregleda nijesu potpuni/);
});

test("external-refund marker proxy requires moderation session, CSRF, strict payload, and idempotency", () => {
  assert.match(externalRefundRoute, /permissions\.includes\("moderation"\)/);
  assert.match(externalRefundRoute, /sameOriginRequest\(req\)/);
  assert.match(externalRefundRoute, /keys\.length !== 1/);
  assert.match(externalRefundRoute, /Idempotency-Key/);
  assert.match(externalRefundRoute, /cache-control/);
});

test("owner refund action fails closed before forwarding", () => {
  const block = ownerProxy.slice(ownerProxy.indexOf('if (mapped === "owner-refund")'));
  assert.match(block, /return json\(409/);
  assert.match(block, /external_refund_only/);
  assert.ok(block.indexOf("return json(409") < block.indexOf("const base") || !block.includes("const base"));
});

test("frontend control center keeps external refunds operational and separate from financial subtraction", () => {
  assert.match(controlCenter, /externalRefundRequired/);
  assert.match(controlCenter, /externalRefundCompleted/);
  assert.match(controlCenter, /external-marker \$\{externalRefundStatus\(request\)\}/);
  assert.match(clientAggregator, /externalRefundStatus/);
  assert.equal(clientAggregator.includes("booking" + "Refunded"), false);
  assert.equal(clientAggregator.includes("payment" + "RefundedCents"), false);
});

test("CMS analytics contract covers period boundaries, dedupe, repeated failures, currencies, and review status", () => {
  assert.match(cmsAnalytics, /created_at >= \?::timestamptz/);
  assert.match(cmsAnalytics, /created_at < \?::timestamptz/);
  assert.match(cmsAnalytics, /select distinct p\.booking_request_id/);
  assert.match(cmsAnalytics, /paymentTransactionKeySql/);
  assert.match(cmsAnalytics, /lower\(trim\(\$\{alias\}\.provider\)\) \|\| ':' \|\| trim\(\$\{alias\}\.provider_intent_id\)/);
  assert.match(cmsAnalytics, /count\(distinct transaction_key\) filter \(where lower\(coalesce\(status, ''\)\) = any \(\?::text\[\]\)\)::int as failed_payment_attempts/);
  assert.match(cmsAnalytics, /TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES = \["failed", "payment_failed", "canceled", "cancelled", "expired"\]/);
  assert.match(cmsAnalytics, /coalesce\(nullif\(upper\(br\.currency\), ''\), 'UNKNOWN'\)/);
  assert.match(cmsAnalytics, /REVIEW_STATUS = "succeeded_needs_review"/);
});

test("analytics response has no refund financial fields and no PII", () => {
  const responseBlock = cmsAnalytics.slice(cmsAnalytics.indexOf("return {"));
  const allowedExternalRefundMarkers = new Set([
    "external_refund_required",
    "external_refund_completed",
    "external_refund_status",
    "external_refund_marked_at",
    "external_refund_completed_at",
  ]);
  const externalRefundMarkers = new Set(responseBlock.match(/\bexternal_refund_[a-z0-9_]+\b/g) ?? []);

  assert.deepEqual(
    [...externalRefundMarkers].filter((marker) => !allowedExternalRefundMarkers.has(marker)),
    []
  );
  assert.doesNotMatch(
    responseBlock,
    /\b(?:refund_amount|refunded_amount|refund_total|refunded_total|refund_value|refunded_value|refund_cents|refunded_cents|refund_major|refunded_major|refundAmount|refundedAmount|refundTotal|refundedTotal|refundValue|refundedValue|refundCents|refundedCents|refundMajor|refundedMajor)\b/
  );
  assert.doesNotMatch(responseBlock, /customer_name|customer_email|customer_phone|full_name|public_token|source_ip|user_agent|notes/);
});
