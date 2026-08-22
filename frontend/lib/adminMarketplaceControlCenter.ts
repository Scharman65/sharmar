import type { LogicalBoat } from "./adminUnifiedBoatWorkflow";

export type JsonRecord = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export type AdminMarketplacePeriod = 7 | 30 | 90 | "all";
export type AdminMarketplaceSystemHealth = "green" | "yellow" | "red" | "gray";
export type AdminMarketplaceBookingHealth = "blue" | "yellow" | "green" | "red" | "gray";
export type AdminMarketplacePreviewCompleteness = {
  bookingRequests: boolean;
  payments: boolean;
};

export type AdminMarketplaceMoneyTotals = {
  currency: string;
  bookingRequested: number;
  bookingConfirmed: number;
  bookingPaid: number;
  marketplaceFee: number;
  ownerPayout: number;
  paidBookingAverage: number | null;
  paidBookingCount: number;
  paymentAmountCents: number;
  paymentAmountMajor: number;
  paymentSucceededCents: number;
};

export type AdminMarketplaceCounters = {
  requests: number;
  confirmed: number;
  pendingPayment: number;
  paid: number;
  cancelled: number;
  paymentErrors: number;
  paymentsNeedingReview: number;
  externalRefundRequired: number;
  externalRefundCompleted: number;
};

export type AdminMarketplaceBoatRow = {
  documentId: string;
  boat: LogicalBoat;
  marinaName: string | null;
  previewCompleteness: AdminMarketplacePreviewCompleteness;
  systemHealth: AdminMarketplaceSystemHealth;
  bookingHealth: AdminMarketplaceBookingHealth;
  counters: AdminMarketplaceCounters;
  financialByCurrency: Record<string, AdminMarketplaceMoneyTotals>;
  recentBookingRequests: JsonRecord[];
  relatedPayments: JsonRecord[];
  dataQualityIssues: string[];
};

export type AdminMarketplaceMarinaGroup = {
  marinaName: string | null;
  label: string;
  boats: AdminMarketplaceBoatRow[];
  counters: AdminMarketplaceCounters;
  financialByCurrency: Record<string, AdminMarketplaceMoneyTotals>;
};

export type AdminMarketplaceControlCenter = {
  period: AdminMarketplacePeriod;
  generatedAt: string;
  previewCompleteness: AdminMarketplacePreviewCompleteness;
  boatRows: AdminMarketplaceBoatRow[];
  marinaGroups: AdminMarketplaceMarinaGroup[];
  counters: AdminMarketplaceCounters;
  financialByCurrency: Record<string, AdminMarketplaceMoneyTotals>;
  dataQualityIssues: string[];
  systemHealth: AdminMarketplaceSystemHealth;
  bookingHealth: AdminMarketplaceBookingHealth;
};

const EMPTY_COUNTERS: AdminMarketplaceCounters = {
  requests: 0,
  confirmed: 0,
  pendingPayment: 0,
  paid: 0,
  cancelled: 0,
  paymentErrors: 0,
  paymentsNeedingReview: 0,
  externalRefundRequired: 0,
  externalRefundCompleted: 0,
};

const BOOKING_HEALTH_SCORE: Record<AdminMarketplaceBookingHealth, number> = {
  gray: 0,
  blue: 1,
  green: 2,
  yellow: 3,
  red: 4,
};

const FAILURE_STATUSES = new Set([
  "failed",
  "payment_failed",
  "canceled",
  "cancelled",
  "expired",
]);

const PENDING_STATUSES = new Set([
  "pending",
  "created",
  "authorized",
  "pending_confirmation",
  "awaiting_confirmation",
  "awaiting_owner_confirmation",
  "requires_confirmation",
  "pending_payment",
  "awaiting_payment",
  "requires_payment",
  "requires_capture",
  "processing",
]);

const SUCCESS_STATUSES = new Set([
  "confirmed",
  "completed",
  "paid",
  "succeeded",
]);

const NEW_STATUSES = new Set(["new", "created", "requested", "submitted"]);

function normalizeStatus(value: unknown): string {
  return asText(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function cloneCounters(counters = EMPTY_COUNTERS): AdminMarketplaceCounters {
  return { ...counters };
}

function addCounters(target: AdminMarketplaceCounters, source: AdminMarketplaceCounters) {
  target.requests += source.requests;
  target.confirmed += source.confirmed;
  target.pendingPayment += source.pendingPayment;
  target.paid += source.paid;
  target.cancelled += source.cancelled;
  target.paymentErrors += source.paymentErrors;
  target.paymentsNeedingReview += source.paymentsNeedingReview;
  target.externalRefundRequired += source.externalRefundRequired;
  target.externalRefundCompleted += source.externalRefundCompleted;
}

function emptyMoneyTotals(currency: string): AdminMarketplaceMoneyTotals {
  return {
    currency,
    bookingRequested: 0,
    bookingConfirmed: 0,
    bookingPaid: 0,
    marketplaceFee: 0,
    ownerPayout: 0,
    paidBookingAverage: null,
    paidBookingCount: 0,
    paymentAmountCents: 0,
    paymentAmountMajor: 0,
    paymentSucceededCents: 0,
  };
}

function totalsFor(
  totals: Record<string, AdminMarketplaceMoneyTotals>,
  currency: string,
): AdminMarketplaceMoneyTotals {
  const key = currency.trim().toUpperCase();
  totals[key] ??= emptyMoneyTotals(key);
  return totals[key];
}

function mergeMoneyTotals(
  target: Record<string, AdminMarketplaceMoneyTotals>,
  source: Record<string, AdminMarketplaceMoneyTotals>,
) {
  for (const [currency, value] of Object.entries(source)) {
    const next = totalsFor(target, currency);
    next.bookingRequested += value.bookingRequested;
    next.bookingConfirmed += value.bookingConfirmed;
    next.bookingPaid += value.bookingPaid;
    next.marketplaceFee += value.marketplaceFee;
    next.ownerPayout += value.ownerPayout;
    next.paymentAmountCents += value.paymentAmountCents;
    next.paymentAmountMajor += value.paymentAmountMajor;
    next.paymentSucceededCents += value.paymentSucceededCents;
    next.paidBookingCount += value.paidBookingCount;
    if (next.paidBookingCount > 0) {
      next.paidBookingAverage = next.bookingPaid / next.paidBookingCount;
    }
  }
}

function numericId(value: unknown): string | null {
  if (typeof value === "string" && !value.trim()) return null;
  const number = asNumber(value);
  return number === null ? null : String(number);
}

function textId(value: unknown): string | null {
  const text = asText(value);
  return text || numericId(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nestedData(value: unknown): JsonRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.data) ?? record;
}

export function bookingBoatDocumentId(booking: JsonRecord): string | null {
  const direct =
    textId(booking.documentId) ??
    textId(booking.boatDocumentId) ??
    textId(booking.boat_document_id);
  if (direct) return direct;

  const boat = nestedData(booking.boat ?? booking.boats);
  if (boat) {
    return (
      textId(boat.documentId) ??
      textId(boat.document_id) ??
      textId(boat.boatDocumentId) ??
      textId(boat.boat_document_id)
    );
  }

  return null;
}

function bookingId(booking: JsonRecord): string | null {
  return (
    textId(booking.id) ??
    textId(booking.bookingRequestId) ??
    textId(booking.booking_request_id) ??
    textId(booking.public_token)
  );
}

function paymentBookingId(payment: JsonRecord): string | null {
  const direct =
    textId(payment.bookingRequestId) ??
    textId(payment.booking_request_id) ??
    textId(payment.bookingRequestDocumentId) ??
    textId(payment.booking_request_document_id);
  if (direct) return direct;

  const booking = nestedData(payment.bookingRequest ?? payment.booking_request ?? payment.booking);
  if (booking) return bookingId(booking);

  return null;
}

function paymentBoatDocumentId(payment: JsonRecord): string | null {
  return (
    textId(payment.boatDocumentId) ??
    textId(payment.boat_document_id) ??
    textId(payment.documentId)
  );
}

function rowDate(row: JsonRecord): Date | null {
  const raw = asText(row.created_at ?? row.createdAt ?? row.requested_at ?? row.updated_at ?? row.updatedAt);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodStart(period: AdminMarketplacePeriod, now: Date): Date | null {
  if (period === "all") return null;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - period);
  return start;
}

function inPeriod(row: JsonRecord, period: AdminMarketplacePeriod, now: Date): boolean {
  const start = periodStart(period, now);
  if (!start) return true;
  const date = rowDate(row);
  return date ? date >= start : false;
}

function bookingCurrency(booking: JsonRecord): string | null {
  return asText(booking.currency).toUpperCase() || null;
}

function bookingCustomerTotal(booking: JsonRecord): number | null {
  return (
    asNumber(booking.customer_total_amount) ??
    asNumber(booking.customerTotalAmount) ??
    asNumber(booking.total_amount) ??
    asNumber(booking.totalAmount)
  );
}

function bookingMarketplaceFee(booking: JsonRecord): number | null {
  return asNumber(booking.marketplace_fee_amount) ?? asNumber(booking.marketplaceFeeAmount);
}

function bookingOwnerPayout(booking: JsonRecord): number | null {
  return asNumber(booking.owner_amount) ?? asNumber(booking.ownerAmount);
}

function paymentCurrency(payment: JsonRecord): string | null {
  return asText(payment.currency).toUpperCase() || null;
}

function paymentAmountCents(payment: JsonRecord): number | null {
  const cents = asNumber(payment.amount_cents) ?? asNumber(payment.amountCents);
  return cents === null ? null : Math.trunc(cents);
}

function paymentIdentity(payment: JsonRecord, fallbackIndex: number): string {
  const provider = asText(payment.provider).toLowerCase();
  const providerIntent =
    asText(payment.provider_intent_id ?? payment.providerIntentId) ||
    asText(payment.provider_payment_id ?? payment.providerPaymentId);
  if (provider && providerIntent) return `${provider}:${providerIntent}`;
  return `payment:${textId(payment.id) ?? fallbackIndex}`;
}

function isCancelled(status: string): boolean {
  return status === "cancelled" || status === "canceled" || status === "declined" || status === "expired";
}

function externalRefundStatus(row: JsonRecord): "none" | "required" | "completed" {
  const status = normalizeStatus(row.external_refund_status ?? row.externalRefundStatus);
  if (status === "required" || status === "completed") return status;
  return "none";
}

function isPaymentError(status: string): boolean {
  return FAILURE_STATUSES.has(status);
}

function isPaid(status: string): boolean {
  return ["paid", "succeeded", "completed"].includes(status);
}

function isCleanPaymentSuccess(status: string): boolean {
  return status === "succeeded";
}

function isConfirmed(status: string): boolean {
  return ["confirmed", "completed"].includes(status);
}

function isPendingPayment(status: string): boolean {
  return [
    "pending",
    "created",
    "authorized",
    "pending_payment",
    "awaiting_payment",
    "requires_payment",
    "requires_capture",
    "processing",
  ].includes(status);
}

function healthFromPaymentStatus(status: string): AdminMarketplaceBookingHealth {
  if (FAILURE_STATUSES.has(status)) return "red";
  if (PENDING_STATUSES.has(status)) return "yellow";
  if (status === "succeeded") return "green";
  if (status === "succeeded_needs_review") return "yellow";
  if (NEW_STATUSES.has(status) || !status) return "blue";
  return "blue";
}

function healthFromBookingStatus(status: string): AdminMarketplaceBookingHealth {
  if (["failed", "payment_failed", "expired"].includes(status)) return "red";
  if (PENDING_STATUSES.has(status)) return "yellow";
  if (SUCCESS_STATUSES.has(status)) return "green";
  if (isCancelled(status)) return "blue";
  if (NEW_STATUSES.has(status) || !status) return "blue";
  return "blue";
}

function highestBookingHealth(
  current: AdminMarketplaceBookingHealth,
  next: AdminMarketplaceBookingHealth,
): AdminMarketplaceBookingHealth {
  return BOOKING_HEALTH_SCORE[next] > BOOKING_HEALTH_SCORE[current] ? next : current;
}

function systemHealthForBoat(boat: LogicalBoat, issues: string[]): AdminMarketplaceSystemHealth {
  const statuses = boat.rows.map((row) => normalizeStatus(row.moderation_status ?? row.state));
  if (!boat.documentId) return "gray";
  if (statuses.includes("rejected") || statuses.includes("blocked")) return "red";
  if (issues.length || boat.blockers.length) return "yellow";
  if (boat.ready || statuses.includes("published") || statuses.includes("approved")) return "green";
  return "gray";
}

function inactiveBookingHealthForBoat(boat: LogicalBoat): AdminMarketplaceBookingHealth {
  const statuses = boat.rows.map((row) => normalizeStatus(row.moderation_status ?? row.state));
  const published = boat.rows.some((row) => normalizeStatus(row.state) === "published" || Boolean(asText(row.publishedAt)));
  const ready = boat.ready || statuses.includes("approved") || statuses.includes("published");
  return published || ready ? "blue" : "gray";
}

function overallSystemHealth(rows: AdminMarketplaceBoatRow[]): AdminMarketplaceSystemHealth {
  if (!rows.length) return "gray";
  if (rows.some((row) => row.systemHealth === "red")) return "red";
  if (rows.some((row) => row.systemHealth === "yellow")) return "yellow";
  if (rows.some((row) => row.systemHealth === "green")) return "green";
  return "gray";
}

function overallBookingHealth(rows: AdminMarketplaceBoatRow[]): AdminMarketplaceBookingHealth {
  return rows.reduce<AdminMarketplaceBookingHealth>(
    (health, row) => highestBookingHealth(health, row.bookingHealth),
    "gray",
  );
}

function boatMarinaName(boat: LogicalBoat): string | null {
  return asText(boat.primary.marina_name ?? boat.primary.home_marina_name) || null;
}

function makeIssues(boat: LogicalBoat, bookings: JsonRecord[], payments: JsonRecord[]): string[] {
  const issues = [...boat.blockers];
  for (const booking of bookings) {
    if (!bookingCurrency(booking)) issues.push(`Booking ${bookingId(booking) ?? "unknown"} has no currency.`);
  }
  for (const payment of payments) {
    const id = textId(payment.id) ?? "unknown";
    if (!paymentCurrency(payment)) issues.push(`Payment ${id} has no currency.`);
    if (paymentAmountCents(payment) === null) issues.push(`Payment ${id} has no amount_cents.`);
  }
  return Array.from(new Set(issues));
}

function stableSortRows(rows: AdminMarketplaceBoatRow[]): AdminMarketplaceBoatRow[] {
  return [...rows].sort((left, right) => {
    const marina = (left.marinaName ?? "").localeCompare(right.marinaName ?? "");
    if (marina !== 0) return marina;
    const leftTitle = asText(left.boat.primary.title) || left.documentId;
    const rightTitle = asText(right.boat.primary.title) || right.documentId;
    return leftTitle.localeCompare(rightTitle);
  });
}

function sortedRecentRows(rows: JsonRecord[]): JsonRecord[] {
  return [...rows].sort((left, right) => {
    const leftTime = rowDate(left)?.getTime() ?? 0;
    const rightTime = rowDate(right)?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}

export function buildAdminMarketplaceControlCenter(
  logicalBoats: LogicalBoat[],
  bookingRequests: JsonRecord[],
  payments: JsonRecord[],
  options: {
    period?: AdminMarketplacePeriod;
    now?: Date;
    missingMarinaLabel?: string;
    previewCompleteness?: Partial<AdminMarketplacePreviewCompleteness>;
  } = {},
): AdminMarketplaceControlCenter {
  const period = options.period ?? 30;
  const now = options.now ?? new Date();
  const missingMarinaLabel = options.missingMarinaLabel ?? "Marina not specified";
  const previewCompleteness: AdminMarketplacePreviewCompleteness = {
    bookingRequests: options.previewCompleteness?.bookingRequests ?? true,
    payments: options.previewCompleteness?.payments ?? true,
  };
  const financialPreviewComplete = previewCompleteness.bookingRequests && previewCompleteness.payments;
  const bookingsInPeriod = previewCompleteness.bookingRequests
    ? bookingRequests.filter((booking) => inPeriod(booking, period, now))
    : [];
  const paymentsInPeriod = previewCompleteness.payments
    ? payments.filter((payment) => inPeriod(payment, period, now))
    : [];
  const bookingsByBoat = new Map<string, JsonRecord[]>();
  const bookingsById = new Map<string, JsonRecord>();
  const unresolvedPaymentIssues: string[] = [];

  if (previewCompleteness.bookingRequests) {
    for (const booking of bookingRequests) {
      const id = bookingId(booking);
      if (id) bookingsById.set(id, booking);
    }
  }

  for (const booking of bookingsInPeriod) {
    const boatDocumentId = bookingBoatDocumentId(booking);
    if (!boatDocumentId) continue;
    bookingsByBoat.set(boatDocumentId, [...(bookingsByBoat.get(boatDocumentId) ?? []), booking]);
  }

  const paymentsByBoat = new Map<string, JsonRecord[]>();
  paymentsInPeriod.forEach((payment, index) => {
    const relatedBookingId = paymentBookingId(payment);
    const booking = relatedBookingId ? bookingsById.get(relatedBookingId) ?? null : null;
    const nestedBooking = nestedData(payment.bookingRequest ?? payment.booking_request ?? payment.booking);
    const boatDocumentId =
      paymentBoatDocumentId(payment) ??
      (booking
        ? bookingBoatDocumentId(booking)
        : nestedBooking
          ? bookingBoatDocumentId(nestedBooking)
          : null);

    if (!boatDocumentId) {
      if (previewCompleteness.bookingRequests) {
        unresolvedPaymentIssues.push(`Payment ${textId(payment.id) ?? index} could not be resolved to a logical boat.`);
      }
      return;
    }

    paymentsByBoat.set(boatDocumentId, [...(paymentsByBoat.get(boatDocumentId) ?? []), payment]);
  });

  const rows = logicalBoats.map((boat) => {
    const relatedBookings = bookingsByBoat.get(boat.documentId) ?? [];
    const relatedPayments = paymentsByBoat.get(boat.documentId) ?? [];
    const paymentTransactions = new Map<string, JsonRecord>();
    relatedPayments.forEach((payment, index) => {
      const key = paymentIdentity(payment, index);
      if (!paymentTransactions.has(key)) paymentTransactions.set(key, payment);
    });
    const counters = cloneCounters();
    const financialByCurrency: Record<string, AdminMarketplaceMoneyTotals> = {};
    let bookingHealth: AdminMarketplaceBookingHealth = financialPreviewComplete
      ? inactiveBookingHealthForBoat(boat)
      : "gray";
    const paidBookingIds = new Set<string>();
    const paidFinancialBookingIds = new Set<string>();

    for (const booking of relatedBookings) {
      const status = normalizeStatus(booking.status);
      const id = bookingId(booking);
      counters.requests += 1;
      if (isConfirmed(status)) counters.confirmed += 1;
      if (isPendingPayment(status)) counters.pendingPayment += 1;
      if (financialPreviewComplete && isPaid(status)) {
        counters.paid += 1;
        if (id) paidBookingIds.add(id);
      }
      if (isCancelled(status)) counters.cancelled += 1;
      const marker = externalRefundStatus(booking);
      if (marker === "required") counters.externalRefundRequired += 1;
      if (marker === "completed") counters.externalRefundCompleted += 1;
      if (financialPreviewComplete) bookingHealth = highestBookingHealth(bookingHealth, healthFromBookingStatus(status));

      if (!financialPreviewComplete) continue;

      const currency = bookingCurrency(booking);
      const total = bookingCustomerTotal(booking);
      if (currency && total !== null) {
        const totals = totalsFor(financialByCurrency, currency);
        totals.bookingRequested += total;
        if (isConfirmed(status)) totals.bookingConfirmed += total;
        if (isPaid(status)) {
          totals.bookingPaid += total;
          totals.paidBookingCount += 1;
          totals.paidBookingAverage = totals.bookingPaid / totals.paidBookingCount;
          const bookingKey = bookingId(booking);
          if (bookingKey) paidFinancialBookingIds.add(bookingKey);
        }
      }

      if (currency) {
        const totals = totalsFor(financialByCurrency, currency);
        const fee = bookingMarketplaceFee(booking);
        const payout = bookingOwnerPayout(booking);
        if (fee !== null) totals.marketplaceFee += fee;
        if (payout !== null) totals.ownerPayout += payout;
      }
    }

    for (const payment of paymentTransactions.values()) {
      const status = normalizeStatus(payment.status ?? payment.provider_status);
      const relatedBookingId = paymentBookingId(payment);
      const relatedBooking = relatedBookingId ? bookingsById.get(relatedBookingId) ?? null : null;
      if (isPendingPayment(status)) counters.pendingPayment += 1;
      if (isPaymentError(status)) counters.paymentErrors += 1;
      if (status === "succeeded_needs_review") counters.paymentsNeedingReview += 1;
      if (financialPreviewComplete && isCleanPaymentSuccess(status) && relatedBookingId && !paidBookingIds.has(relatedBookingId)) {
        counters.paid += 1;
        paidBookingIds.add(relatedBookingId);
      }
      if (financialPreviewComplete) bookingHealth = highestBookingHealth(bookingHealth, healthFromPaymentStatus(status));

      if (!financialPreviewComplete) continue;

      const currency = paymentCurrency(payment);
      const cents = paymentAmountCents(payment);
      if (!currency || cents === null) continue;
      const totals = totalsFor(financialByCurrency, currency);
      totals.paymentAmountCents += cents;
      totals.paymentAmountMajor += cents / 100;
      if (isCleanPaymentSuccess(status)) totals.paymentSucceededCents += cents;

      if (isCleanPaymentSuccess(status) && relatedBooking) {
        const bookingCurrencyCode = bookingCurrency(relatedBooking);
        const total = bookingCustomerTotal(relatedBooking);
        if (bookingCurrencyCode && total !== null) {
          const bookingTotals = totalsFor(financialByCurrency, bookingCurrencyCode);
          const bookingKey = bookingId(relatedBooking);
          if (bookingKey && !paidFinancialBookingIds.has(bookingKey)) {
            bookingTotals.bookingPaid += total;
            bookingTotals.paidBookingCount += 1;
            bookingTotals.paidBookingAverage = bookingTotals.bookingPaid / bookingTotals.paidBookingCount;
            paidFinancialBookingIds.add(bookingKey);
            const payout = bookingOwnerPayout(relatedBooking);
            if (payout !== null) bookingTotals.ownerPayout += payout;
          }
        }
      }
    }

    const dataQualityIssues = makeIssues(boat, relatedBookings, relatedPayments);

    return {
      documentId: boat.documentId,
      boat,
      marinaName: boatMarinaName(boat),
      previewCompleteness,
      systemHealth: systemHealthForBoat(boat, dataQualityIssues),
      bookingHealth,
      counters,
      financialByCurrency,
      recentBookingRequests: sortedRecentRows(relatedBookings).slice(0, 5),
      relatedPayments: sortedRecentRows(relatedPayments),
      dataQualityIssues,
    };
  });

  const boatRows = stableSortRows(rows);
  const counters = cloneCounters();
  const financialByCurrency: Record<string, AdminMarketplaceMoneyTotals> = {};
  const dataQualityIssues: string[] = [];

  for (const row of boatRows) {
    addCounters(counters, row.counters);
    mergeMoneyTotals(financialByCurrency, row.financialByCurrency);
    dataQualityIssues.push(...row.dataQualityIssues.map((issue) => `${row.documentId}: ${issue}`));
  }
  dataQualityIssues.push(...unresolvedPaymentIssues);

  const groups = new Map<string, AdminMarketplaceMarinaGroup>();
  for (const row of boatRows) {
    const key = row.marinaName ?? "";
    const group = groups.get(key) ?? {
      marinaName: row.marinaName,
      label: row.marinaName ?? missingMarinaLabel,
      boats: [],
      counters: cloneCounters(),
      financialByCurrency: {},
    };
    group.boats.push(row);
    addCounters(group.counters, row.counters);
    mergeMoneyTotals(group.financialByCurrency, row.financialByCurrency);
    groups.set(key, group);
  }

  return {
    period,
    generatedAt: now.toISOString(),
    previewCompleteness,
    boatRows,
    marinaGroups: Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label)),
    counters,
    financialByCurrency,
    dataQualityIssues: Array.from(new Set(dataQualityIssues)),
    systemHealth: overallSystemHealth(boatRows),
    bookingHealth: overallBookingHealth(boatRows),
  };
}
