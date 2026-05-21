# ADR — Owner Dashboard Payment Operations

Status: Accepted  
Date: 2026-05-21  
Scope: Sharmar Marketplace frontend operational readiness

## Context

The marketplace has a stable payment and booking foundation:

- hold-first booking flow
- overlap protection
- Stripe payment lifecycle
- owner confirm/decline flow
- customer email lifecycle
- notification retry/idempotency foundation
- WhatsApp dry-run foundation

The next production need was operational visibility and handoff readiness without changing the working payment core.

## Decision

Add owner dashboard operational visibility and readiness documentation while keeping payment, hold, Stripe, and backend lifecycle logic unchanged.

The dashboard exposes read-only sections for:

- payment operations
- payment health
- queue infrastructure
- operational reconciliation
- enterprise readiness

The documentation pack captures production readiness, manual reconciliation, and future enterprise-runtime work.

## Why Dashboard Visibility Was Added Without Modifying Stripe

Stripe capture and payment lifecycle are already sensitive and working. Operational visibility can be derived from existing booking/dashboard data without calling Stripe directly or changing capture behavior.

This keeps the blast radius low:

- no Stripe API changes
- no payment mutations
- no schema changes
- no backend Strapi changes
- no deploy side effects

## Why WhatsApp Remains Dry-Run

WhatsApp live delivery requires production prerequisites that are not yet runtime-enabled:

- customer opt-in persistence
- approved Meta templates
- provider credentials outside the repo
- durable audit history
- retry/dead-letter handling
- operational rollback plan

Until those exist, WhatsApp remains foundation/dry-run only.

## Why Queue Persistence Is Deferred

The queue model, retry model, idempotency model, and reconciliation metric types are prepared as pure helpers. Persistence is deferred because durable delivery needs an explicit infrastructure decision.

Deferred runtime choices include:

- database-backed queue
- Redis/managed queue
- background worker runtime
- retry/dead-letter policy
- monitoring and alerting sink

Deferring persistence avoids introducing hidden runtime behavior before the operational contract is documented.

## Consequences

Positive:

- Operators can inspect payment/booking readiness from the owner dashboard.
- Future queue and reconciliation implementation has typed foundations.
- The production handoff is explicit.
- Payment core remains stable.

Tradeoffs:

- Manual reconciliation is still required.
- Failed payment/refund reporting is not fully automated.
- Notification queue state is not persisted.
- WhatsApp live delivery is not enabled.

## Next Steps

1. Choose durable queue persistence.
2. Add a worker that consumes persisted notification queue records.
3. Persist notification audit and delivery attempts.
4. Add reconciliation reports for bookings, payments, refunds, and notifications.
5. Add monitoring vendor integration.
6. Prepare a separate Meta WhatsApp Cloud API production activation ADR.
