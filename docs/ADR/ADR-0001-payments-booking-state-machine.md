# ADR-0001 — Payments ↔ Booking State Machine

Status: Accepted  
Date: 2026-02-06  
Scope: Sharmar — Payments v2 (GREEN)

## Context
The platform processes bookings and payments asynchronously via Stripe webhooks.
E2E verification confirmed correct handling of:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

An audit revealed invalid combinations where `booking_requests.confirmed`
co-existed with `payments.created` or `payments.failed`, which violates business
invariants and complicates future Owner approval and scaling.

## Decision
Adopt a strict state machine with the following invariant:

**A booking can be `confirmed` if and only if the associated payment is `succeeded`.**

## State Definitions

### Booking (`booking_requests.status`)
- `pending`
- `confirmed`
- `cancelled`
- `expired`

### Payment (`payments.status`)
- `created`
- `requires_capture`
- `succeeded`
- `failed`

## Invariants (Hard Rules)
1. `booking.confirmed` ⇔ `payment.succeeded`
2. `payment.failed` ⇒ `booking != confirmed`
3. `payment.created` or `payment.requires_capture` ⇒ `booking = pending`
4. Webhook retries MUST be idempotent and MUST NOT:
   - revert `succeeded`
   - transition `failed → succeeded`
5. `booking.confirmed` is terminal (except admin-cancel).

## Consequences
- Prevents confirmed bookings without successful payment.
- Simplifies accounting, reporting, and future Owner approval.
- Enables safe idempotent webhook handling.
- Provides a clear contract for frontend and automation.

## Implementation Notes (Non-normative)
- Enforce invariants in webhook handlers (no DB schema changes required).
- Soft-hardening first; DB constraints may follow later if needed.

## Alternatives Considered
- Allow `confirmed` before payment (rejected due to complexity and risk).
