# ADR-0002: External Refunds Only

## Status

Accepted.

## Context

Sharmar records and analyses incoming marketplace payments. The product rule is authoritative: Sharmar must not execute provider refunds through Stripe, Dodo, or any other payment provider.

Any customer repayment is handled manually outside Sharmar by the company or by bank transfer. Sharmar needs an operational marker so admins can see which booking requests require manual follow-up, without changing payment records or incoming-payment analytics.

## Decision

Sharmar stores only a structured external-refund marker on `booking_requests`:

- `external_refund_status`: `none`, `required`, or `completed`;
- `external_refund_marked_at`;
- `external_refund_completed_at`.

The marker contains no amount, currency, bank information, owner/customer PII, or free-text note.

Provider refund actions fail closed with stable code `external_refund_only`. Decline/cancellation flows after a clean successful payment mark `external_refund_status = required` and never subtract financial analytics.

## Analytics

Incoming analytics count incoming payments only.

Successful paid bookings are deduplicated once per `booking_request_id`. Successful payment transactions are deduplicated by `provider + provider_intent_id`, with payment id as fallback, so legacy duplicate successful transactions can be counted as distinct inflow while paid-booking/customer totals are not duplicated.

Currencies remain separate. Booking values use major units. Provider payment amounts use cents. Cents and major units are never added together.

External-refund markers are operational counters only:

- `required` is a red operational indicator;
- `completed` remains visible as completed;
- neither status creates refund-value fields or subtracts from incoming-payment totals.

## Migration

Migration `20260821200000-admin-marketplace-inflow-analytics.js` is prepared but not executed by this implementation. It adds the marker columns, status check, analytics indexes, and correctness unique indexes after conflict detection. It does not create a refund transaction table and does not mutate existing payment or booking financial values.
