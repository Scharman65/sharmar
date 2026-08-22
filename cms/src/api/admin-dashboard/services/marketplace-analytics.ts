const CLEAN_SUCCESS_STATUS = "succeeded";
const REVIEW_STATUS = "succeeded_needs_review";
const PENDING_STATUSES = ["pending", "created", "authorized", "requires_capture", "processing"];
const TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES = ["failed", "payment_failed", "canceled", "cancelled", "expired"];
const CANCELLATION_STATUSES = ["declined", "expired", "cancelled", "canceled"];
const CONFIRMED_STATUSES = ["confirmed"];

type Period = 7 | 30 | 90 | "all";
type MoneyBucket = Record<string, Record<string, string>>;

function rawRows(result: unknown): Record<string, unknown>[] {
  const record = result as { rows?: Record<string, unknown>[] } | undefined;
  if (Array.isArray(record?.rows)) return record.rows;
  if (Array.isArray((result as unknown[] | undefined)?.[0])) {
    return (result as [Record<string, unknown>[]])[0];
  }
  return [];
}

function firstRow(result: unknown): Record<string, unknown> {
  return rawRows(result)[0] ?? {};
}

function text(value: unknown): string | null {
  return value == null ? null : String(value);
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function decimalString(value: unknown): string {
  if (value == null) return "0";
  const raw = String(value);
  return raw.trim() || "0";
}

function addMoney(bucket: MoneyBucket, currency: string | null, key: string, amount: unknown): void {
  const code = (currency || "UNKNOWN").toUpperCase();
  bucket[code] ??= {};
  const current = Number(bucket[code][key] || 0);
  const next = Number(decimalString(amount));
  bucket[code][key] = (current + (Number.isFinite(next) ? next : 0)).toFixed(2);
}

function addCents(bucket: MoneyBucket, currency: string | null, key: string, amount: unknown): void {
  const code = (currency || "UNKNOWN").toUpperCase();
  bucket[code] ??= {};
  const current = BigInt(bucket[code][key] || "0");
  const next = BigInt(Math.trunc(numberValue(amount)));
  bucket[code][key] = String(current + next);
}

function paymentTransactionKeySql(alias = "p"): string {
  return `case
            when nullif(trim(${alias}.provider), '') is not null
             and nullif(trim(${alias}.provider_intent_id), '') is not null
            then lower(trim(${alias}.provider)) || ':' || trim(${alias}.provider_intent_id)
            else 'payment:' || ${alias}.id::text
          end`;
}

function ensureFinancialDefaults(bucket: MoneyBucket): Record<string, Record<string, string | null>> {
  const out: Record<string, Record<string, string | null>> = {};
  for (const [currency, values] of Object.entries(bucket)) {
    const paidTotal = Number(values.paidCustomerTotalMajor || 0);
    const paidCount = Number(values.paidBookingCount || 0);
    out[currency] = {
      requestedCustomerTotalMajor: values.requestedCustomerTotalMajor || "0.00",
      confirmedCustomerTotalMajor: values.confirmedCustomerTotalMajor || "0.00",
      paidCustomerTotalMajor: values.paidCustomerTotalMajor || "0.00",
      quotedMarketplaceFeeMajor: values.quotedMarketplaceFeeMajor || "0.00",
      realizedMarketplaceFeeCents: values.realizedMarketplaceFeeCents || "0",
      ownerPayoutMajor: values.ownerPayoutMajor || "0.00",
      averagePaidBookingMajor: paidCount > 0 ? (paidTotal / paidCount).toFixed(2) : null,
    };
  }
  return out;
}

function range(period: Period, now = new Date()): { startAt: string | null; endAt: string } {
  const endAt = now.toISOString();
  if (period === "all") return { startAt: null, endAt };
  const start = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt };
}

export default ({ strapi }: { strapi: { db: { connection: unknown } } }) => ({
  async build(input: { period: Period; recentLimit: number }) {
    const knex = strapi.db.connection as {
      raw: (sql: string, bindings?: unknown[]) => Promise<unknown>;
    };
    const { startAt, endAt } = range(input.period);
    const recentLimit = Math.max(0, Math.min(100, Math.trunc(input.recentLimit)));
    const warnings: string[] = [];

    const bookingSummaryResult = await knex.raw(
      `
      select
        count(distinct br.id)::int as booking_requests,
        count(distinct br.id) filter (where lower(coalesce(br.status, '')) = any (?::text[]))::int as confirmed_bookings,
        count(distinct br.id) filter (where lower(coalesce(br.status, '')) = any (?::text[]))::int as cancellations
      from public.booking_requests br
      where (?::timestamptz is null or br.created_at >= ?::timestamptz)
        and br.created_at < ?::timestamptz
      `,
      [CONFIRMED_STATUSES, CANCELLATION_STATUSES, startAt, startAt, endAt]
    );

    const paymentSummaryResult = await knex.raw(
      `
      with period_payments as (
        select
          p.*,
          ${paymentTransactionKeySql("p")} as transaction_key
        from public.payments p
        where (?::timestamptz is null or p.created_at >= ?::timestamptz)
          and p.created_at < ?::timestamptz
      ),
      transactions as (
        select distinct on (transaction_key)
          transaction_key,
          booking_request_id,
          status
        from period_payments
        order by transaction_key, created_at desc nulls last, id desc
      )
      select
        count(distinct booking_request_id) filter (where lower(coalesce(status, '')) = ?)::int as paid_bookings,
        count(distinct transaction_key) filter (where lower(coalesce(status, '')) = ?)::int as successful_payment_transactions,
        count(distinct transaction_key) filter (where lower(coalesce(status, '')) = any (?::text[]))::int as pending_payment_attempts,
        count(distinct transaction_key) filter (where lower(coalesce(status, '')) = any (?::text[]))::int as failed_payment_attempts,
        count(distinct transaction_key) filter (where lower(coalesce(status, '')) = ?)::int as payments_needing_review
      from transactions
      `,
      [startAt, startAt, endAt, CLEAN_SUCCESS_STATUS, CLEAN_SUCCESS_STATUS, PENDING_STATUSES, TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES, REVIEW_STATUS]
    );

    const markerSummaryResult = await knex.raw(
      `
      select
        count(*) filter (where external_refund_status = 'required')::int as external_refund_required,
        count(*) filter (where external_refund_status = 'completed')::int as external_refund_completed
      from public.booking_requests
      `
    );

    const bookingMoneyResult = await knex.raw(
      `
      select
        coalesce(nullif(upper(br.currency), ''), 'UNKNOWN') as currency,
        coalesce(sum(br.customer_total_amount), 0)::text as requested_customer_total_major,
        coalesce(sum(br.customer_total_amount) filter (where lower(coalesce(br.status, '')) = any (?::text[])), 0)::text as confirmed_customer_total_major,
        coalesce(sum(br.marketplace_fee_amount), 0)::text as quoted_marketplace_fee_major
      from public.booking_requests br
      where (?::timestamptz is null or br.created_at >= ?::timestamptz)
        and br.created_at < ?::timestamptz
      group by coalesce(nullif(upper(br.currency), ''), 'UNKNOWN')
      `,
      [CONFIRMED_STATUSES, startAt, startAt, endAt]
    );

    const paidBookingMoneyResult = await knex.raw(
      `
      with clean_paid_bookings as (
        select distinct p.booking_request_id
        from public.payments p
        where lower(coalesce(p.status, '')) = ?
          and p.booking_request_id is not null
          and (?::timestamptz is null or p.created_at >= ?::timestamptz)
          and p.created_at < ?::timestamptz
      )
      select
        coalesce(nullif(upper(br.currency), ''), 'UNKNOWN') as currency,
        count(distinct br.id)::int as paid_booking_count,
        coalesce(sum(br.customer_total_amount), 0)::text as paid_customer_total_major,
        coalesce(sum(br.owner_amount), 0)::text as owner_payout_major
      from clean_paid_bookings cpb
      join public.booking_requests br on br.id = cpb.booking_request_id
      group by coalesce(nullif(upper(br.currency), ''), 'UNKNOWN')
      `,
      [CLEAN_SUCCESS_STATUS, startAt, startAt, endAt]
    );

    const successfulTransactionMoneyResult = await knex.raw(
      `
      with clean_successes as (
        select distinct on (
          ${paymentTransactionKeySql("p")}
        )
          ${paymentTransactionKeySql("p")} as transaction_key,
          coalesce(nullif(upper(p.currency), ''), 'UNKNOWN') as currency,
          p.amount_cents,
          p.created_at,
          p.id
        from public.payments p
        where lower(coalesce(p.status, '')) = ?
          and (?::timestamptz is null or p.created_at >= ?::timestamptz)
          and p.created_at < ?::timestamptz
        order by
          ${paymentTransactionKeySql("p")},
          p.created_at asc nulls last,
          p.id asc
      )
      select currency, coalesce(sum(amount_cents), 0)::bigint::text as realized_marketplace_fee_cents
      from clean_successes
      group by currency
      `,
      [CLEAN_SUCCESS_STATUS, startAt, startAt, endAt]
    );

    const duplicateSuccessResult = await knex.raw(
      `
      with clean_successes as (
        select
          booking_request_id,
          ${paymentTransactionKeySql("p")} as transaction_key
        from public.payments p
        where lower(coalesce(p.status, '')) = ?
          and booking_request_id is not null
          and (?::timestamptz is null or created_at >= ?::timestamptz)
          and created_at < ?::timestamptz
      )
      select booking_request_id, count(distinct transaction_key)::int as success_count
      from clean_successes
      group by booking_request_id
      having count(distinct transaction_key) > 1
      limit 20
      `,
      [CLEAN_SUCCESS_STATUS, startAt, startAt, endAt]
    );

    const boatRowsResult = await knex.raw(
      `
      with boat_booking_counts as (
        select
          b.document_id as boat_document_id,
          min(b.title) as boat_title,
          min(marina.id)::text as marina_id,
          min(marina.name) as marina_name,
          count(distinct br.id)::int as booking_requests,
          count(distinct br.id) filter (where lower(coalesce(br.status, '')) = any (?::text[]))::int as confirmed_bookings,
          count(distinct br.id) filter (where lower(coalesce(br.status, '')) = any (?::text[]))::int as cancellations,
          count(distinct br.id) filter (where br.external_refund_status = 'required')::int as external_refund_required,
          count(distinct br.id) filter (where br.external_refund_status = 'completed')::int as external_refund_completed
        from public.booking_requests br
        join public.booking_requests_boat_lnk bl on bl.booking_request_id = br.id
        join public.boats b on b.id = bl.boat_id
        left join public.boats_home_marina_lnk bml on bml.boat_id = b.id
        left join public.locations marina on marina.id = bml.location_id
        where (?::timestamptz is null or br.created_at >= ?::timestamptz)
          and br.created_at < ?::timestamptz
        group by b.document_id
      ),
      boat_payment_counts as (
        select
          b.document_id as boat_document_id,
          min(b.title) as boat_title,
          min(marina.id)::text as marina_id,
          min(marina.name) as marina_name,
          count(distinct p.booking_request_id) filter (where lower(coalesce(p.status, '')) = ?)::int as paid_bookings,
          count(distinct ${paymentTransactionKeySql("p")}) filter (where lower(coalesce(p.status, '')) = ?)::int as successful_payment_transactions,
          count(distinct ${paymentTransactionKeySql("p")}) filter (where lower(coalesce(p.status, '')) = any (?::text[]))::int as pending_payment_attempts,
          count(distinct ${paymentTransactionKeySql("p")}) filter (where lower(coalesce(p.status, '')) = any (?::text[]))::int as failed_payment_attempts,
          count(distinct ${paymentTransactionKeySql("p")}) filter (where lower(coalesce(p.status, '')) = ?)::int as payments_needing_review
        from public.payments p
        join public.booking_requests br on br.id = p.booking_request_id
        join public.booking_requests_boat_lnk bl on bl.booking_request_id = br.id
        join public.boats b on b.id = bl.boat_id
        left join public.boats_home_marina_lnk bml on bml.boat_id = b.id
        left join public.locations marina on marina.id = bml.location_id
        where (?::timestamptz is null or p.created_at >= ?::timestamptz)
          and p.created_at < ?::timestamptz
        group by b.document_id
      )
      select
        coalesce(bbc.boat_document_id, bpc.boat_document_id) as document_id,
        coalesce(bbc.boat_title, bpc.boat_title) as boat_title,
        coalesce(bbc.marina_id, bpc.marina_id) as marina_id,
        coalesce(bbc.marina_name, bpc.marina_name) as marina_name,
        coalesce(bbc.booking_requests, 0)::int as booking_requests,
        coalesce(bbc.confirmed_bookings, 0)::int as confirmed_bookings,
        coalesce(bpc.paid_bookings, 0)::int as paid_bookings,
        coalesce(bpc.successful_payment_transactions, 0)::int as successful_payment_transactions,
        coalesce(bpc.pending_payment_attempts, 0)::int as pending_payment_attempts,
        coalesce(bpc.failed_payment_attempts, 0)::int as failed_payment_attempts,
        coalesce(bbc.cancellations, 0)::int as cancellations,
        coalesce(bpc.payments_needing_review, 0)::int as payments_needing_review,
        coalesce(bbc.external_refund_required, 0)::int as external_refund_required,
        coalesce(bbc.external_refund_completed, 0)::int as external_refund_completed
      from boat_booking_counts bbc
      full outer join boat_payment_counts bpc on bpc.boat_document_id = bbc.boat_document_id
      order by coalesce(bbc.marina_name, bpc.marina_name, ''), coalesce(bbc.boat_title, bpc.boat_title, ''), coalesce(bbc.boat_document_id, bpc.boat_document_id)
      `,
      [
        CONFIRMED_STATUSES,
        CANCELLATION_STATUSES,
        startAt,
        startAt,
        endAt,
        CLEAN_SUCCESS_STATUS,
        CLEAN_SUCCESS_STATUS,
        PENDING_STATUSES,
        TERMINAL_UNSUCCESSFUL_PAYMENT_STATUSES,
        REVIEW_STATUS,
        startAt,
        startAt,
        endAt,
      ]
    );

    const recentActivityResult = await knex.raw(
      `
      select *
      from (
        select
          'booking_request'::text as type,
          br.id,
          br.status,
          br.external_refund_status,
          br.currency,
          br.customer_total_amount::text as customer_total_major,
          null::bigint as amount_cents,
          b.document_id as boat_document_id,
          marina.name as marina_name,
          br.created_at
        from public.booking_requests br
        left join public.booking_requests_boat_lnk bl on bl.booking_request_id = br.id
        left join public.boats b on b.id = bl.boat_id
        left join public.boats_home_marina_lnk bml on bml.boat_id = b.id
        left join public.locations marina on marina.id = bml.location_id
        where (?::timestamptz is null or br.created_at >= ?::timestamptz)
          and br.created_at < ?::timestamptz
        union all
        select
          'payment'::text as type,
          p.id,
          p.status,
          br.external_refund_status,
          p.currency,
          null::text as customer_total_major,
          p.amount_cents,
          b.document_id as boat_document_id,
          marina.name as marina_name,
          p.created_at
        from public.payments p
        left join public.booking_requests br on br.id = p.booking_request_id
        left join public.booking_requests_boat_lnk bl on bl.booking_request_id = br.id
        left join public.boats b on b.id = bl.boat_id
        left join public.boats_home_marina_lnk bml on bml.boat_id = b.id
        left join public.locations marina on marina.id = bml.location_id
        where (?::timestamptz is null or p.created_at >= ?::timestamptz)
          and p.created_at < ?::timestamptz
      ) recent
      order by created_at desc nulls last, id desc
      limit ?
      `,
      [startAt, startAt, endAt, startAt, startAt, endAt, recentLimit]
    );

    const summaryRow = firstRow(bookingSummaryResult);
    const paymentRow = firstRow(paymentSummaryResult);
    const markerRow = firstRow(markerSummaryResult);
    const financial: MoneyBucket = {};

    for (const row of rawRows(bookingMoneyResult)) {
      addMoney(financial, text(row.currency), "requestedCustomerTotalMajor", row.requested_customer_total_major);
      addMoney(financial, text(row.currency), "confirmedCustomerTotalMajor", row.confirmed_customer_total_major);
      addMoney(financial, text(row.currency), "quotedMarketplaceFeeMajor", row.quoted_marketplace_fee_major);
    }
    for (const row of rawRows(paidBookingMoneyResult)) {
      addMoney(financial, text(row.currency), "paidCustomerTotalMajor", row.paid_customer_total_major);
      addMoney(financial, text(row.currency), "ownerPayoutMajor", row.owner_payout_major);
      addMoney(financial, text(row.currency), "paidBookingCount", row.paid_booking_count);
    }
    for (const row of rawRows(successfulTransactionMoneyResult)) {
      addCents(financial, text(row.currency), "realizedMarketplaceFeeCents", row.realized_marketplace_fee_cents);
    }

    const duplicateSuccessRows = rawRows(duplicateSuccessResult);
    if (duplicateSuccessRows.length) {
      warnings.push("multiple_clean_successful_payment_transactions_for_booking_request");
    }

    const boats = rawRows(boatRowsResult).map((row) => ({
      documentId: text(row.document_id),
      title: text(row.boat_title),
      marinaId: text(row.marina_id),
      marinaName: text(row.marina_name),
      summary: {
        bookingRequests: numberValue(row.booking_requests),
        confirmedBookings: numberValue(row.confirmed_bookings),
        paidBookings: numberValue(row.paid_bookings),
        successfulPaymentTransactions: numberValue(row.successful_payment_transactions),
        pendingPaymentAttempts: numberValue(row.pending_payment_attempts),
        failedPaymentAttempts: numberValue(row.failed_payment_attempts),
        cancellations: numberValue(row.cancellations),
        paymentsNeedingReview: numberValue(row.payments_needing_review),
        externalRefundRequired: numberValue(row.external_refund_required),
        externalRefundCompleted: numberValue(row.external_refund_completed),
      },
    }));

    const marinas = Object.values(boats.reduce<Record<string, { name: string | null; summary: Record<string, number> }>>((acc, boat) => {
      const key = boat.marinaName || "";
      acc[key] ??= {
        name: boat.marinaName,
        summary: {
          bookingRequests: 0,
          confirmedBookings: 0,
          paidBookings: 0,
          successfulPaymentTransactions: 0,
          pendingPaymentAttempts: 0,
          failedPaymentAttempts: 0,
          cancellations: 0,
          paymentsNeedingReview: 0,
          externalRefundRequired: 0,
          externalRefundCompleted: 0,
        },
      };
      for (const [counter, value] of Object.entries(boat.summary)) {
        acc[key].summary[counter] += value;
      }
      return acc;
    }, {}));

    return {
      ok: true,
      period: input.period,
      range: { start_at: startAt, end_at: endAt },
      summary: {
        bookingRequests: numberValue(summaryRow.booking_requests),
        confirmedBookings: numberValue(summaryRow.confirmed_bookings),
        paidBookings: numberValue(paymentRow.paid_bookings),
        successfulPaymentTransactions: numberValue(paymentRow.successful_payment_transactions),
        pendingPaymentAttempts: numberValue(paymentRow.pending_payment_attempts),
        failedPaymentAttempts: numberValue(paymentRow.failed_payment_attempts),
        cancellations: numberValue(summaryRow.cancellations),
        paymentsNeedingReview: numberValue(paymentRow.payments_needing_review),
        externalRefundRequired: numberValue(markerRow.external_refund_required),
        externalRefundCompleted: numberValue(markerRow.external_refund_completed),
      },
      boats,
      marinas,
      financialByCurrency: ensureFinancialDefaults(financial),
      recentActivity: rawRows(recentActivityResult).map((row) => ({
        type: text(row.type),
        id: numberValue(row.id),
        status: text(row.status),
        externalRefundStatus: text(row.external_refund_status) || "none",
        currency: text(row.currency),
        customerTotalMajor: text(row.customer_total_major),
        amountCents: row.amount_cents == null ? null : numberValue(row.amount_cents),
        boatDocumentId: text(row.boat_document_id),
        marinaName: text(row.marina_name),
        createdAt: text(row.created_at),
      })),
      warnings,
    };
  },
});
