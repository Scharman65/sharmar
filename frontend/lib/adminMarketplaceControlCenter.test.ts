import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildAdminMarketplaceControlCenter,
  type AdminMarketplaceBookingHealth,
  type AdminMarketplacePeriod,
} from "./adminMarketplaceControlCenter.ts";
import type { JsonRecord, LogicalBoat } from "./adminUnifiedBoatWorkflow.ts";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(frontendRoot, path), "utf8");
}

const controlCenter = read("lib/adminMarketplaceControlCenter.ts");
const boatComponent = read("app/[lang]/admin/AdminBoatControlCenter.tsx");
const cockpit = read("app/[lang]/admin/AdminCockpitClient.tsx");
const manager = read("app/[lang]/admin/AdminCrudManager.tsx");

function row(locale: string, overrides: JsonRecord = {}): JsonRecord {
  return {
    id: locale === "en" ? 10 : locale === "ru" ? 11 : 12,
    documentId: "boat-a",
    locale,
    title: `Boat ${locale}`,
    slug: `boat-${locale}`,
    moderation_status: "approved",
    state: "published",
    publishedAt: "2026-08-01T00:00:00.000Z",
    marina_name: "Porto Montenegro",
    owner_display_name: "Owner",
    owner_email: "owner@example.test",
    owner_phone: "+38260000000",
    ...overrides,
  };
}

function logicalBoat(documentId: string, overrides: Partial<LogicalBoat> = {}, primary: JsonRecord = {}): LogicalBoat {
  const rows = [
    row("en", { documentId, ...primary }),
    row("ru", { documentId, ...primary }),
    row("sr-Latn-ME", { documentId, ...primary }),
  ];
  return {
    documentId,
    rows,
    locales: {
      en: rows[0],
      ru: rows[1],
      "sr-Latn-ME": rows[2],
    },
    primary: rows[0],
    routes: [],
    blockers: [],
    ready: true,
    ...overrides,
  };
}

function booking(id: number, boatDocumentId: string, status: string, createdAt: string, overrides: JsonRecord = {}): JsonRecord {
  return {
    id,
    boat_document_id: boatDocumentId,
    status,
    created_at: createdAt,
    currency: "EUR",
    customer_total_amount: 100,
    marketplace_fee_amount: 15,
    owner_amount: 85,
    ...overrides,
  };
}

function payment(id: number, bookingRequestId: number, status: string, createdAt: string, overrides: JsonRecord = {}): JsonRecord {
  return {
    id,
    booking_request_id: bookingRequestId,
    status,
    created_at: createdAt,
    currency: "EUR",
    amount_cents: 10000,
    ...overrides,
  };
}

const now = new Date("2026-08-21T12:00:00.000Z");

test("one boat with EN/RU/ME produces one control-center row", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z")],
    [payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z")],
    { now },
  );

  assert.equal(view.boatRows.length, 1);
  assert.equal(view.boatRows[0].documentId, "boat-a");
});

test("boats are grouped by marina and missing marina is isolated", () => {
  const view = buildAdminMarketplaceControlCenter(
    [
      logicalBoat("boat-a", {}, { marina_name: "Porto Montenegro" }),
      logicalBoat("boat-b", {}, { marina_name: "Bar" }),
      logicalBoat("boat-c", { blockers: ["Missing marina"], ready: false }, { marina_name: "" }),
    ],
    [],
    [],
    { now, missingMarinaLabel: "Марина не указана" },
  );

  assert.deepEqual(view.marinaGroups.map((group) => group.label).sort(), ["Bar", "Porto Montenegro", "Марина не указана"].sort());
  assert.equal(view.marinaGroups.find((group) => group.label === "Марина не указана")?.boats[0].documentId, "boat-c");
});

test("period filtering supports 7, 30, 90 days and all time", () => {
  const boats = [logicalBoat("boat-a")];
  const bookings = [
    booking(1, "boat-a", "paid", "2026-08-19T00:00:00.000Z"),
    booking(2, "boat-a", "paid", "2026-08-01T00:00:00.000Z"),
    booking(3, "boat-a", "paid", "2026-06-01T00:00:00.000Z"),
    booking(4, "boat-a", "paid", "2026-01-01T00:00:00.000Z"),
  ];
  const countFor = (period: AdminMarketplacePeriod) =>
    buildAdminMarketplaceControlCenter(boats, bookings, [], { now, period }).counters.requests;

  assert.equal(countFor(7), 1);
  assert.equal(countFor(30), 2);
  assert.equal(countFor(90), 3);
  assert.equal(countFor("all"), 4);
});

test("booking health priority is red over yellow, green, blue, and gray", () => {
  const priority: AdminMarketplaceBookingHealth[] = ["gray", "blue", "green", "yellow", "red"];
  const bookings = [
    booking(1, "boat-a", "submitted", "2026-08-20T00:00:00.000Z"),
    booking(2, "boat-a", "confirmed", "2026-08-20T00:00:00.000Z"),
    booking(3, "boat-a", "pending_payment", "2026-08-20T00:00:00.000Z"),
    booking(4, "boat-a", "payment_failed", "2026-08-20T00:00:00.000Z"),
  ];
  const view = buildAdminMarketplaceControlCenter([logicalBoat("boat-a")], bookings, [], { now });

  assert.equal(view.boatRows[0].bookingHealth, "red");
  assert.equal(Math.max(...priority.map((status) => priority.indexOf(status))), priority.indexOf("red"));
});

test("payment cents stay separate from booking major-unit sums", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", { customer_total_amount: 123 })],
    [payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", { amount_cents: 12300 })],
    { now },
  );
  const eur = view.financialByCurrency.EUR;

  assert.equal(eur.bookingPaid, 123);
  assert.equal(eur.paymentAmountCents, 12300);
  assert.equal(eur.paymentAmountMajor, 123);
  assert.notEqual(eur.bookingPaid, eur.paymentAmountCents);
});

test("different currencies are not summed together", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", { currency: "EUR", customer_total_amount: 100 }),
      booking(2, "boat-a", "paid", "2026-08-20T00:00:00.000Z", { currency: "USD", customer_total_amount: 200 }),
    ],
    [
      payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", { currency: "EUR", amount_cents: 10000 }),
      payment(2, 2, "succeeded", "2026-08-20T00:00:00.000Z", { currency: "USD", amount_cents: 20000 }),
    ],
    { now },
  );

  assert.equal(view.financialByCurrency.EUR.bookingPaid, 100);
  assert.equal(view.financialByCurrency.USD.bookingPaid, 200);
  assert.equal(Object.keys(view.financialByCurrency).sort().join(","), "EUR,USD");
});

test("current payments resolve through old bookings before booking-period filtering", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "submitted", "2026-01-01T00:00:00.000Z", {
        customer_total_amount: 240,
        owner_amount: 204,
      }),
    ],
    [
      payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        amount_cents: 24000,
        provider: "stripe",
        provider_intent_id: "pi_old_booking",
      }),
    ],
    { now, period: 7 },
  );
  const row = view.boatRows[0];

  assert.equal(row.counters.requests, 0);
  assert.equal(row.counters.paid, 1);
  assert.equal(row.relatedPayments.length, 1);
  assert.equal(row.financialByCurrency.EUR.bookingPaid, 240);
  assert.equal(row.financialByCurrency.EUR.ownerPayout, 204);
  assert.equal(row.financialByCurrency.EUR.paymentAmountCents, 24000);
  assert.deepEqual(view.dataQualityIssues, []);
});

test("incomplete booking preview suppresses booking-derived details while complete direct payment rows remain available", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", {
        external_refund_status: "required",
        customer_total_amount: 240,
        marketplace_fee_amount: 36,
        owner_amount: 204,
      }),
    ],
    [
      payment(1, 999, "succeeded", "2026-08-20T00:00:00.000Z", {
        amount_cents: 24000,
        provider: "stripe",
        provider_intent_id: "pi_direct_boat",
        boat_document_id: "boat-a",
      }),
    ],
    { now, period: 7, previewCompleteness: { bookingRequests: false, payments: true } },
  );
  const row = view.boatRows[0];

  assert.equal(row.previewCompleteness.bookingRequests, false);
  assert.equal(row.previewCompleteness.payments, true);
  assert.equal(row.counters.requests, 0);
  assert.equal(row.counters.paid, 0);
  assert.equal(row.counters.externalRefundRequired, 0);
  assert.equal(row.recentBookingRequests.length, 0);
  assert.equal(row.relatedPayments.length, 1);
  assert.deepEqual(row.financialByCurrency, {});
  assert.equal(row.bookingHealth, "gray");
  assert.deepEqual(view.dataQualityIssues, []);
});

test("incomplete payment preview suppresses payment rows and financial totals without hiding complete booking counts", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", {
        external_refund_status: "required",
        customer_total_amount: 240,
        marketplace_fee_amount: 36,
        owner_amount: 204,
      }),
    ],
    [payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", { amount_cents: 24000 })],
    { now, period: 7, previewCompleteness: { bookingRequests: true, payments: false } },
  );
  const row = view.boatRows[0];

  assert.equal(row.previewCompleteness.bookingRequests, true);
  assert.equal(row.previewCompleteness.payments, false);
  assert.equal(row.counters.requests, 1);
  assert.equal(row.counters.externalRefundRequired, 1);
  assert.equal(row.counters.paid, 0);
  assert.equal(row.relatedPayments.length, 0);
  assert.equal(row.recentBookingRequests.length, 1);
  assert.deepEqual(row.financialByCurrency, {});
  assert.equal(row.bookingHealth, "gray");
});

test("complete previews expose booking rows, payment rows, financial totals, markers, and health", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", {
        external_refund_status: "completed",
        customer_total_amount: 240,
        marketplace_fee_amount: 36,
        owner_amount: 204,
      }),
    ],
    [
      payment(1, 1, "succeeded_needs_review", "2026-08-20T00:00:00.000Z", {
        amount_cents: 24000,
        provider: "stripe",
        provider_intent_id: "pi_complete_preview",
        webhook_received_at: "2026-08-20T00:05:00.000Z",
      }),
    ],
    { now, period: 7, previewCompleteness: { bookingRequests: true, payments: true } },
  );
  const row = view.boatRows[0];

  assert.equal(row.counters.requests, 1);
  assert.equal(row.counters.paid, 1);
  assert.equal(row.counters.paymentsNeedingReview, 1);
  assert.equal(row.counters.externalRefundCompleted, 1);
  assert.equal(row.recentBookingRequests.length, 1);
  assert.equal(row.relatedPayments.length, 1);
  assert.equal(row.relatedPayments[0].provider, "stripe");
  assert.equal(row.relatedPayments[0].provider_intent_id, "pi_complete_preview");
  assert.equal(row.relatedPayments[0].webhook_received_at, "2026-08-20T00:05:00.000Z");
  assert.equal(row.financialByCurrency.EUR.bookingPaid, 240);
  assert.equal(row.financialByCurrency.EUR.marketplaceFee, 36);
  assert.equal(row.financialByCurrency.EUR.ownerPayout, 204);
  assert.equal(row.financialByCurrency.EUR.paymentAmountCents, 24000);
  assert.equal(row.bookingHealth, "yellow");
});

test("succeeded_needs_review is not counted as a clean paid booking", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "succeeded_needs_review", "2026-08-20T00:00:00.000Z")],
    [payment(1, 1, "succeeded_needs_review", "2026-08-20T00:00:00.000Z")],
    { now },
  );

  assert.equal(view.counters.paid, 0);
  assert.equal(view.counters.paymentsNeedingReview, 1);
  assert.equal(view.financialByCurrency.EUR?.bookingPaid ?? 0, 0);
});

test("duplicate succeeded_needs_review payment transactions count once by provider intent", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "submitted", "2026-08-20T00:00:00.000Z")],
    [
      payment(1, 1, "succeeded_needs_review", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_intent_id: "pi_review",
      }),
      payment(2, 1, "succeeded_needs_review", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_intent_id: "pi_review",
      }),
    ],
    { now },
  );

  assert.equal(view.counters.paid, 0);
  assert.equal(view.counters.paymentsNeedingReview, 1);
  assert.equal(view.boatRows[0].relatedPayments.length, 2);
  assert.equal(view.financialByCurrency.EUR.paymentAmountCents, 10000);
});

test("duplicate succeeded payments count once by canonical provider intent and keep cents as cents", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "submitted", "2026-08-20T00:00:00.000Z")],
    [
      payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_intent_id: "pi_paid",
        amount_cents: 1500,
      }),
      payment(2, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_intent_id: "pi_paid",
        provider_payment_id: "legacy_alias_must_not_win",
        amount_cents: 1500,
      }),
    ],
    { now },
  );

  assert.equal(view.counters.paid, 1);
  assert.equal(view.financialByCurrency.EUR.paymentAmountCents, 1500);
  assert.equal(view.financialByCurrency.EUR.paymentAmountMajor, 15);
});

test("provider_payment_id is only a compatibility alias when provider_intent_id is absent", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "submitted", "2026-08-20T00:00:00.000Z")],
    [
      payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_payment_id: "pi_compat",
        amount_cents: 2000,
      }),
      payment(2, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        provider: "stripe",
        provider_payment_id: "pi_compat",
        amount_cents: 2000,
      }),
    ],
    { now },
  );

  assert.equal(view.financialByCurrency.EUR.paymentAmountCents, 2000);
});

test("major-unit payment amount is not interpreted as amount_cents", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "submitted", "2026-08-20T00:00:00.000Z")],
    [
      payment(1, 1, "succeeded", "2026-08-20T00:00:00.000Z", {
        amount_cents: undefined,
        amount: 15,
      }),
    ],
    { now },
  );

  assert.equal(view.financialByCurrency.EUR?.paymentAmountCents ?? 0, 0);
  assert.match(view.dataQualityIssues.join("\n"), /Payment 1 has no amount_cents/);
});

test("terminal unsuccessful payment statuses are red and booking cancellation alone is not a payment error", () => {
  const statuses = ["failed", "payment_failed", "canceled", "cancelled", "expired"];
  for (const status of statuses) {
    const view = buildAdminMarketplaceControlCenter(
      [logicalBoat("boat-a")],
      [booking(1, "boat-a", "declined", "2026-08-20T00:00:00.000Z")],
      [payment(1, 1, status, "2026-08-20T00:00:00.000Z")],
      { now },
    );

    assert.equal(view.counters.cancelled, 1);
    assert.equal(view.counters.paymentErrors, 1);
    assert.equal(view.bookingHealth, "red");
  }

  const cancellationOnly = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [booking(1, "boat-a", "declined", "2026-08-20T00:00:00.000Z")],
    [],
    { now },
  );
  assert.equal(cancellationOnly.counters.cancelled, 1);
  assert.equal(cancellationOnly.counters.paymentErrors, 0);
  assert.notEqual(cancellationOnly.bookingHealth, "green");
});

test("external refund markers are operational and never subtract financial totals", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "boat-a", "paid", "2026-08-20T00:00:00.000Z", { external_refund_status: "required" }),
      booking(2, "boat-a", "paid", "2026-08-20T00:00:00.000Z", { external_refund_status: "completed" }),
    ],
    [],
    { now },
  );

  assert.equal(view.counters.externalRefundRequired, 1);
  assert.equal(view.counters.externalRefundCompleted, 1);
  assert.equal(view.financialByCurrency.EUR.bookingPaid, 200);
  assert.equal(controlCenter.includes("booking" + "Refunded"), false);
  assert.equal(controlCenter.includes("payment" + "RefundedCents"), false);
});

test("published or ready boat without activity is blue commercial activity, not a system error", () => {
  const view = buildAdminMarketplaceControlCenter([logicalBoat("boat-a")], [], [], { now });

  assert.equal(view.boatRows[0].bookingHealth, "blue");
  assert.equal(view.boatRows[0].systemHealth, "green");
  assert.equal(view.counters.requests, 0);
});

test("unpublished and non-ready boat without activity remains gray", () => {
  const view = buildAdminMarketplaceControlCenter(
    [
      logicalBoat(
        "boat-a",
        { ready: false },
        { moderation_status: "draft", state: "draft", publishedAt: null },
      ),
    ],
    [],
    [],
    { now },
  );

  assert.equal(view.boatRows[0].bookingHealth, "gray");
});

test("safe matching supports direct and nested boat and booking identifiers", () => {
  const view = buildAdminMarketplaceControlCenter(
    [logicalBoat("boat-a")],
    [
      booking(1, "", "paid", "2026-08-20T00:00:00.000Z", {
        boat_document_id: "",
        boat: { data: { documentId: "boat-a" } },
      }),
    ],
    [
      payment(1, 0, "succeeded", "2026-08-20T00:00:00.000Z", {
        booking_request_id: null,
        bookingRequest: { data: { id: 1 } },
      }),
    ],
    { now },
  );

  assert.equal(view.boatRows[0].counters.requests, 1);
  assert.equal(view.boatRows[0].relatedPayments.length, 1);
});

test("owner contacts are kept out of the pure aggregation module and rendered only in admin component", () => {
  assert.doesNotMatch(controlCenter, /owner_email|owner_phone|whatsapp|viber/i);
  assert.match(boatComponent, /ownerContact/);
  assert.match(boatComponent, /owner_email/);
  assert.match(boatComponent, /WhatsApp/);
});

test("raw localized boat rows do not drive the main boat list", () => {
  const componentReturnIndex = boatComponent.indexOf("return (", boatComponent.indexOf("}: Props) {"));
  const mainList = boatComponent.slice(
    componentReturnIndex,
    boatComponent.indexOf('<details className="advanced-area">'),
  );
  assert.match(boatComponent, /view\.marinaGroups/);
  assert.match(mainList, /visibleGroups\.map/);
  assert.doesNotMatch(mainList, /rawBoats/);
});

test("logical boat pagination is grouped, accessible, and localized", () => {
  assert.match(boatComponent, /const LOGICAL_BOAT_PAGE_SIZE = 25/);
  assert.match(boatComponent, /function paginateMarinaGroups/);
  assert.match(boatComponent, /paginateMarinaGroups\(filteredGroups, boatPage, LOGICAL_BOAT_PAGE_SIZE\)/);
  assert.match(boatComponent, /visibleGroups\.map/);
  assert.match(boatComponent, /aria-label=\{ui\.pagination\}/);
  assert.match(boatComponent, /aria-label=\{`\$\{ui\.previous\}: \$\{pageStatus\}`\}/);
  assert.match(boatComponent, /aria-label=\{`\$\{ui\.next\}: \$\{pageStatus\}`\}/);
  assert.match(boatComponent, /disabled=\{boatPage <= 1\}/);
  assert.match(boatComponent, /disabled=\{boatPage >= boatPageCount\}/);
  assert.match(boatComponent, /Страницы лодок/);
  assert.match(boatComponent, /Boat pages/);
  assert.match(boatComponent, /Stranice plovila/);
});

test("source regression: complete payment previews render compact safe payment records", () => {
  const paymentsSection = boatComponent.slice(
    boatComponent.indexOf("<h4>{ui.payments}</h4>"),
    boatComponent.indexOf("<h4>{ui.latestRequests}</h4>"),
  );

  assert.match(paymentsSection, /row\.relatedPayments\.map\(\(payment, index\)/);
  assert.match(paymentsSection, /key=\{paymentRecordKey\(payment, index\)\}/);
  assert.match(paymentsSection, /paymentProvider\(payment\)/);
  assert.match(paymentsSection, /paymentProviderTransactionId\(payment\)/);
  assert.match(paymentsSection, /paymentStatus\(payment\)/);
  assert.match(paymentsSection, /paymentAmountMajor\(payment\)/);
  assert.match(paymentsSection, /paymentDateField\(payment, ui\)/);
  assert.match(paymentsSection, /paymentReviewRequired\(payment\)/);
  assert.match(boatComponent, /provider_intent_id/);
  assert.match(boatComponent, /provider_transaction_id/);
  assert.match(boatComponent, /provider_payment_id/);
  assert.match(boatComponent, /webhook_received_at/);
  assert.match(boatComponent, /created_at/);
  assert.match(boatComponent, /updated_at/);
  assert.match(boatComponent, /provider_status/);
  assert.match(boatComponent, /succeeded_needs_review/);
  assert.match(boatComponent, /Math\.trunc\(cents\) \/ 100/);
  assert.doesNotMatch(paymentsSection, /metadata|cookie|secret|token|customer_/i);
});

test("source regression: incomplete payment preview fails closed before payment records", () => {
  const paymentsSection = boatComponent.slice(
    boatComponent.indexOf("<h4>{ui.payments}</h4>"),
    boatComponent.indexOf("<h4>{ui.latestRequests}</h4>"),
  );
  const unavailableIndex = paymentsSection.indexOf("!rowPaymentPreviewComplete");
  const recordsIndex = paymentsSection.indexOf("row.relatedPayments.map");

  assert.ok(unavailableIndex > -1);
  assert.ok(recordsIndex > -1);
  assert.ok(unavailableIndex < recordsIndex);
  assert.match(paymentsSection, /<p className="admin-warning" role="status">\{ui\.paymentPreviewUnavailable\}<\/p>/);
});

test("source regression: payment record labels remain localized in RU, EN, and ME", () => {
  for (const text of [
    "Платёжные записи",
    "Провайдер",
    "ID транзакции/intent",
    "Webhook получен",
    "Нужна проверка",
    "Payment records",
    "Provider",
    "Transaction/intent ID",
    "Webhook received",
    "Needs review",
    "Zapisi plaćanja",
    "Provajder",
    "ID transakcije/intenta",
    "Webhook primljen",
    "Potrebna provjera",
  ]) {
    assert.match(boatComponent, new RegExp(text));
  }
});

test("translation save-draft workflow remains connected and does not publish automatically", () => {
  assert.match(cockpit, /\/api\/admin\/translations\/preview/);
  assert.match(cockpit, /\/api\/admin\/translations\/save-draft/);
  assert.match(cockpit, /confirmSaveDraft:\s*true/);
  assert.match(cockpit, /overwrite:\s*false/);
  assert.doesNotMatch(cockpit, /publish_logical_boat[\s\S]*save-draft/);
});

test("publish stays blocked when boat.ready is false", () => {
  assert.match(boatComponent, /disabled=\{Boolean\(pendingBoatAction\) \|\| !boat\.ready\}/);
});

test("source regression: boat technical manager is outside logical boat maps and mounted once", () => {
  const componentReturnIndex = boatComponent.indexOf("return (", boatComponent.indexOf("}: Props) {"));
  const technicalIndex = boatComponent.indexOf('<details className="advanced-area">');
  const managerIndex = boatComponent.indexOf('<AdminCrudManager lang={lang} entity="boat"');
  assert.ok(technicalIndex > -1);
  assert.ok(managerIndex > technicalIndex);
  assert.equal((boatComponent.match(/entity="boat"/g) ?? []).length, 1);
  assert.doesNotMatch(boatComponent.slice(componentReturnIndex, technicalIndex), /AdminCrudManager/);
});

test("source regression: AdminCrudManager deduplicates boat rows by documentId", () => {
  assert.match(manager, /function deduplicateRowsForEntity/);
  assert.match(manager, /entity !== "boat"/);
  assert.match(manager, /byDocumentId = new Map<string, JsonRecord>/);
  assert.match(manager, /row\.documentId/);
});

test("payment record React keys include row ids for duplicate provider intents", async () => {
  const { readFile } = await import("node:fs/promises");
  const componentSource = await readFile(
    new URL("../app/[lang]/admin/AdminBoatControlCenter.tsx", import.meta.url),
    "utf8",
  );

  assert.ok(
    componentSource.includes(
      'if (transactionId && rowId) return `${provider}:${transactionId}:row:${rowId}`;',
    ),
  );
  assert.ok(
    componentSource.includes(
      'if (transactionId) return `${provider}:${transactionId}:row:${fallbackIndex}`;',
    ),
  );
});
