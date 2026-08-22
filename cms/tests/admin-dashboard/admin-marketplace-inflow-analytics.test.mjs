import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cmsRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function read(relativePath) {
  return readFileSync(join(cmsRoot, relativePath), "utf8");
}

const service = read("src/api/admin-dashboard/services/marketplace-analytics.ts");
const controller = read("src/api/admin-dashboard/controllers/admin-dashboard.ts");
const routes = read("src/api/admin-dashboard/routes/admin-dashboard.ts");
const migration = read("database/migrations/20260821200000-admin-marketplace-inflow-analytics.js");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function analyticsResponseContract() {
  const marker = "return {\n      ok: true,";
  const start = service.indexOf(marker);
  assert.notEqual(start, -1, "analytics response contract not found");
  return service.slice(start);
}

function blockBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${start} not found`);
  assert.notEqual(endIndex, -1, `${end} not found`);
  return source.slice(startIndex, endIndex);
}

function assertPayloadFieldAbsent(contract, field) {
  const variants = new Set([field, camelCase(field)]);
  for (const variant of variants) {
    assert.doesNotMatch(
      contract,
      new RegExp(`\\b${escapeRegExp(variant)}\\b`),
      `${variant} leaked in analytics response contract`
    );
  }
}

test("marketplace analytics endpoint is protected, no-store, and validates period", () => {
  assert.match(routes, /admin-dashboard\/marketplace-analytics/);
  assert.match(controller, /invalidAdminToken\(ctx\)/);
  assert.match(controller, /if \(raw === "all"\) return "all"/);
  assert.match(controller, /if \(raw === "7"\) return 7/);
  assert.match(controller, /if \(raw === "30"\) return 30/);
  assert.match(controller, /if \(raw === "90"\) return 90/);
  assert.match(controller, /invalid_period/);
  assert.match(controller, /invalid_recent_limit/);
  assert.match(controller, /cache-control", "no-store"/);
});

test("analytics uses payment-period attribution to old bookings and logical boat marina links", () => {
  assert.match(service, /from public\.payments p/);
  assert.match(service, /join public\.booking_requests br on br\.id = p\.booking_request_id/);
  assert.match(service, /join public\.booking_requests_boat_lnk bl on bl\.booking_request_id = br\.id/);
  assert.match(service, /join public\.boats b on b\.id = bl\.boat_id/);
  assert.match(service, /left join public\.boats_home_marina_lnk/);
  assert.doesNotMatch(service, /and br\.created_at < \?::timestamptz[\s\S]{0,120}from public\.payments p/);
});

test("payment-only boat rows keep document, title, and marina when booking CTE has no period row", () => {
  const bookingCte = blockBetween(service, "with boat_booking_counts as (", "boat_payment_counts as (");
  const paymentCte = blockBetween(service, "boat_payment_counts as (", ")\n      select");
  const finalSelect = blockBetween(service, "select\n        coalesce(bbc.boat_document_id", "from boat_booking_counts bbc");

  assert.match(bookingCte, /br\.created_at >= \?::timestamptz/);
  assert.match(paymentCte, /p\.created_at >= \?::timestamptz/);
  assert.doesNotMatch(paymentCte, /br\.created_at >= \?::timestamptz|br\.created_at < \?::timestamptz/);
  assert.match(paymentCte, /b\.document_id as boat_document_id/);
  assert.match(paymentCte, /min\(b\.title\) as boat_title/);
  assert.match(paymentCte, /min\(marina\.id\)::text as marina_id/);
  assert.match(paymentCte, /min\(marina\.name\) as marina_name/);
  assert.match(paymentCte, /left join public\.boats_home_marina_lnk bml on bml\.boat_id = b\.id/);
  assert.match(paymentCte, /left join public\.locations marina on marina\.id = bml\.location_id/);
  assert.match(finalSelect, /coalesce\(bbc\.boat_document_id, bpc\.boat_document_id\) as document_id/);
  assert.match(finalSelect, /coalesce\(bbc\.boat_title, bpc\.boat_title\) as boat_title/);
  assert.match(finalSelect, /coalesce\(bbc\.marina_id, bpc\.marina_id\) as marina_id/);
  assert.match(finalSelect, /coalesce\(bbc\.marina_name, bpc\.marina_name\) as marina_name/);
});

test("aggregate totals are uncapped while recent activity is capped at 100", () => {
  const beforeRecent = service.slice(0, service.indexOf("const recentActivityResult"));
  assert.doesNotMatch(beforeRecent, /limit \?/i);
  assert.match(service, /Math\.min\(100/);
  assert.match(service, /recentActivity/);
});

test("paid booking deduplication and distinct successful transaction accounting are separate", () => {
  assert.match(service, /select distinct p\.booking_request_id/);
  assert.match(service, /select distinct on/);
  assert.match(service, /successfulPaymentTransactions/);
  assert.match(service, /multiple_clean_successful_payment_transactions_for_booking_request/);
});

test("statuses keep review, pending, failed, and clean success separate", () => {
  assert.match(service, /CLEAN_SUCCESS_STATUS = "succeeded"/);
  assert.match(service, /REVIEW_STATUS = "succeeded_needs_review"/);
  assert.match(service, /PENDING_STATUSES = \["pending", "created", "authorized", "requires_capture", "processing"\]/);
  assert.match(service, /TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES = \["failed", "payment_failed", "canceled", "cancelled", "expired"\]/);
  assert.match(service, /failed_payment_attempts/);
  assert.match(service, /TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES/);
});

test("money rules keep currencies separate and cents separate from major units", () => {
  assert.match(service, /financialByCurrency/);
  assert.match(service, /br\.customer_total_amount/);
  assert.match(service, /br\.marketplace_fee_amount/);
  assert.match(service, /br\.owner_amount/);
  assert.match(service, /requestedCustomerTotalMajor/);
  assert.match(service, /paidCustomerTotalMajor/);
  assert.match(service, /quotedMarketplaceFeeMajor/);
  assert.match(service, /ownerPayoutMajor/);
  assert.match(service, /realizedMarketplaceFeeCents/);
  assert.match(service, /BigInt/);
});

test("analytics response contract excludes direct PII, banking, notes, and refund financial fields", () => {
  const contract = analyticsResponseContract();

  [
    "customer_name",
    "customer_email",
    "customer_phone",
    "owner_email",
    "owner_phone",
    "owner_whatsapp",
    "whatsapp",
    "bank_account",
    "bank_details",
    "iban",
    "bic",
    "swift",
    "public_token",
    "reset_token",
    "action_token",
    "note",
    "notes",
    "internal_note",
    "admin_note",
    "customer_note",
    "owner_note",
    "refund_amount",
    "refunded_amount",
    "refund_cents",
    "refunded_cents",
    "refund_total",
  ].forEach((field) => assertPayloadFieldAbsent(contract, field));

  assert.match(contract, /externalRefundStatus/);
  assert.match(contract, /customerTotalMajor/);
  assert.match(contract, /amountCents/);
  assert.match(contract, /financialByCurrency/);
});

test("external-refund marker validation and transitions are structured only", () => {
  assert.match(controller, /parseExternalRefundStatus/);
  assert.match(controller, /resolveExternalRefundTransition/);
  assert.match(controller, /current === "none" && next === "required"/);
  assert.match(controller, /current === "required" && \(next === "completed" \|\| next === "none"\)/);
  assert.match(controller, /current === "completed"/);
  assert.match(controller, /external_refund_status_completed_terminal/);
  assert.match(controller, /external_refund_transition_invalid/);
  assert.match(controller, /external_refund_transition_conflict/);
  assert.match(controller, /invalid_external_refund_payload/);
  assert.match(controller, /keys\.length !== 1 \|\| keys\[0\] !== "external_refund_status"/);
  assert.match(controller, /strapi\.db\.transaction/);
  assert.match(controller, /\.forUpdate\(\)/);
  assert.match(controller, /\.andWhereRaw\("coalesce\(external_refund_status, 'none'\) = \?", \[previousStatus\]\)/);
  assert.match(controller, /previous_status: previousStatus/);
  assert.match(controller, /new_status: status/);
  assert.match(controller, /external_refund_marked_at: trx\.raw\("coalesce/);
  assert.match(controller, /external_refund_completed_at: trx\.fn\.now/);
  assert.doesNotMatch(`${controller}\n${service}`, /stripe\.refunds|refunds\.create|provider_refund|\brefund_transaction\b/i);
});

test("payment preview rows use canonical schema names and expose completeness metadata", () => {
  assert.match(controller, /from public\.payments p/);
  assert.match(controller, /p\.provider_intent_id/);
  assert.match(controller, /p\.amount_cents/);
  assert.match(controller, /p\.booking_request_id/);
  assert.match(controller, /min\(b\.document_id\) as boat_document_id/);
  assert.match(controller, /min\(b\.title\) as boat_title/);
  assert.match(controller, /min\(marina\.name\) as marina_name/);
  assert.match(controller, /provider_payment_id: nullableString\(row\.provider_intent_id\)/);
  assert.match(controller, /amount_cents: amountCents == null \? null : Math\.trunc\(amountCents\)/);
  assert.doesNotMatch(blockBetween(controller, "async function loadPayments", "async function loadOwners"), /owner_email|owner_phone|customer_email|customer_phone|full_name/);
  assert.match(controller, /collectionCompleteness/);
  assert.match(controller, /bookingRequests: \{\s*rowLimit: ROW_LIMIT,\s*returned: bookingRequests\.length,\s*total: totalBookingRequests,\s*complete: bookingRequestComplete/s);
  assert.match(controller, /payments: \{\s*rowLimit: ROW_LIMIT,\s*returned: payments\.length,\s*total: totalPayments,\s*complete: paymentsComplete/s);
});

test("migration prepares additive columns, checks, and non-unique analytics indexes only", () => {
  assert.match(migration, /add column if not exists external_refund_status/);
  assert.match(migration, /booking_requests_external_refund_status_chk/);
  assert.doesNotMatch(migration, /payments_idempotency_key_nonnull_uidx/);
  assert.doesNotMatch(migration, /payments_provider_intent_nonnull_uidx/);
  assert.doesNotMatch(migration, /create unique index/i);
  assert.doesNotMatch(migration, /Cannot create unique|assertNoRows|having count\(\*\) > 1/i);
  assert.doesNotMatch(migration, /payments_one_clean_success_per_booking_request_uidx/);
  assert.doesNotMatch(migration, /create unique index[\s\S]{0,180}booking_request_id[\s\S]{0,120}status = 'succeeded'/);
  assert.match(migration, /payments_booking_request_status_created_at_idx/);
  assert.match(migration, /on public\.payments \(booking_request_id, status, created_at\)/);
  assert.match(migration, /payments_provider_intent_created_at_idx/);
  assert.match(migration, /on public\.payments \(provider, provider_intent_id, created_at\)/);
  assert.doesNotMatch(migration, /one-clean-succeeded-payment-per-booking-request/);
  assert.doesNotMatch(migration, /create table[\s\S]{0,80}refund/i);
  assert.doesNotMatch(migration, /update public\.payments|update public\.bookings|delete from/i);
});
