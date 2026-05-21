# Payment Vertical Production Readiness

Status: Production-operational foundation ready  
Scope: Sharmar Marketplace frontend, owner dashboard, booking/payment operations  
Last updated: 2026-05-21

## Current State

The marketplace payment and booking vertical has a working production-grade foundation:

- Hold-first booking flow is active.
- Hold overlap protection is active.
- Stripe payment lifecycle is active.
- Owner confirm/decline flow is active.
- Owner dashboard is active.
- Occupancy overview is active.
- Customer request, confirmed, and declined email lifecycle is active.
- Notification audit, retry, idempotency, queue, and reconciliation foundations exist.
- WhatsApp provider integration is prepared in dry-run/foundation mode only.
- Operational payment visibility is exposed in the owner dashboard.

The implementation intentionally avoids broad refactors and preserves the existing payment core.

## Booking Lifecycle

1. Customer submits a booking request.
2. The platform creates a booking request with a stable public token.
3. A hold-first booking path protects the requested slot.
4. Overlap protection prevents conflicting active holds/bookings.
5. Owner action is required where applicable.
6. Owner confirms or declines through existing owner action routes.
7. Dashboard state refreshes after owner action.

Important operational statuses currently visible to owners:

- `hold`
- `deposit_paid`

## Payment Lifecycle

The Stripe payment lifecycle remains protected and unchanged by operational readiness work.

Current operational visibility includes:

- Confirmed/deposit-paid booking count.
- Pending hold count.
- Successful payment count derived from deposit-paid bookings with a payment intent.
- Latest payment indicator when a payment intent is recorded.
- Latest booking status.

The dashboard does not perform payment mutations. It does not call Stripe directly.

## Owner Approval Lifecycle

Owner actions are available from recent booking activity when:

- booking status is `hold`
- public owner/customer action token exists

Owner confirm and decline use existing owner action routes. The dashboard does not create new booking or payment lifecycle mutations.

## Email Notification Lifecycle

Customer email lifecycle currently includes:

- Request received email.
- Booking confirmed email after owner confirmation.
- Booking declined email after owner decline.

Email sending is best-effort where attached to operational routes. Email failures must not fail booking/payment/owner actions.

## WhatsApp Dry-Run Lifecycle

WhatsApp infrastructure is foundation-only:

- Phone normalization helper exists.
- Opt-in eligibility helper exists.
- Provider config helper exists.
- Template payload helper exists.
- Dry-run send simulation exists.
- Audit entry generation exists.

Live WhatsApp delivery is disabled. No Meta Cloud API calls are made.

## Operational Dashboard Capabilities

The owner dashboard exposes read-only operational sections:

- Notification status.
- Payment Operations.
- Payment Health.
- Queue Infrastructure.
- Operational Reconciliation.
- Enterprise Readiness.
- Recent booking activity.
- Occupancy overview.

These sections are informational and operational. They do not mutate payment state.

## Production-Operationally Complete

The payment vertical can be considered production-operationally complete for:

- booking request intake
- hold-first slot protection
- Stripe-backed payment lifecycle
- owner approval workflow
- customer email lifecycle
- owner-facing operational visibility
- operational readiness indicators

## Enterprise-Runtime Pending

The following are intentionally not runtime-enabled yet:

- Persistent notification queue.
- Durable notification audit store.
- Background workers.
- Retry executor.
- Dead-letter queue.
- Provider metrics sink.
- Monitoring vendor integration.
- Live WhatsApp Cloud API delivery.
- Automated reconciliation reports.

## Risks

- Manual monitoring is still required for reconciliation.
- Queue/retry primitives are in code but not persisted.
- Failed payment/refund aggregate counts are not fully reconciled without broader payment history.
- WhatsApp live delivery requires opt-in persistence and approved templates before activation.
- Email delivery depends on provider configuration.

## Rollback Notes

- Dashboard operational sections are additive and read-only.
- Notification helpers are pure foundation helpers.
- No database schema changes are required to roll back this documentation phase.
- Payment core and Stripe capture behavior were not changed by this readiness layer.

If an operational UI regression occurs, roll back the dashboard section changes only. Do not alter Stripe, hold, or owner action routes as part of UI rollback unless a verified bug exists there.

## Test Checklist

Run locally before production promotion:

- `npm --prefix frontend run build`
- Owner dashboard loads for a valid owner.
- Active bookings count displays.
- Active holds count displays.
- Recent activity count displays.
- Payment Operations section displays.
- Payment Health section displays.
- Queue Infrastructure section displays.
- Operational Reconciliation section displays.
- Enterprise Readiness section displays.
- Recent booking activity still renders.
- Occupancy overview still renders.
- Owner confirm/decline buttons still call existing routes when eligible.
- Payment page still loads by public token.
- Request page still submits a valid booking request.

Do not run destructive SQL or production mutations as part of this checklist.
