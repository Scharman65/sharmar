# ADR — Runtime Queue Infrastructure

Status: Proposed  
Date: 2026-05-21  
Scope: Sharmar Marketplace enterprise runtime operations

## Context

The marketplace now has notification queue, retry, idempotency, audit, and reconciliation foundations in code, but they are intentionally not persisted or executed by a worker yet.

Runtime queue infrastructure is required before production live delivery for:

- reliable WhatsApp delivery
- durable email audit trails
- retry execution
- dead-letter handling
- provider metrics
- operational reconciliation

No runtime queue should be enabled until the storage and worker model are explicitly selected.

## Decision Options

### Option 1: Postgres-backed queue

Use the existing production Postgres database to store queue records, delivery attempts, audit entries, idempotency keys, and dead-letter state.

Pros:

- one existing durable system
- simple backup and restore story
- transaction-friendly with booking/payment reconciliation
- no new infrastructure dependency

Cons:

- requires schema changes
- worker polling must be designed carefully
- high-volume notification throughput could add load to the main database

### Option 2: Redis/BullMQ

Use Redis with BullMQ for queue storage, retries, delayed jobs, and worker processing.

Pros:

- mature worker and retry primitives
- natural fit for delayed retries
- strong operational model for job queues
- lower pressure on the relational database for transient job state

Cons:

- introduces new infrastructure
- requires Redis persistence/backup decisions
- requires worker process management
- requires operational monitoring for Redis and workers

### Option 3: Managed queue

Use a managed queue provider for durable delivery, retries, and dead-letter handling.

Pros:

- less infrastructure to maintain
- built-in scaling and durability controls
- provider-level metrics may be available

Cons:

- vendor dependency
- local development parity is harder
- integration and cost model must be reviewed
- may complicate data residency and audit export

## Recommended First Production Path

Recommended first path: Redis/BullMQ, introduced behind a disabled runtime flag.

Reasoning:

- The queue use case is notification delivery and retry execution, which maps cleanly to BullMQ.
- Existing pure helper types already model queue records, retry state, attempts, idempotency, and audit.
- Redis/BullMQ can be introduced without touching booking/payment core.
- Runtime activation can be staged: persist only, dry-run worker, then live provider delivery.

Postgres remains the preferred source of truth for long-term audit and reconciliation records. Redis/BullMQ should be treated as the execution queue, not the only permanent audit store.

## Why Not Enable Runtime Queue Yet

Runtime queue is deferred because these decisions must be finalized first:

- Redis hosting and persistence mode
- worker deployment model
- job retention policy
- dead-letter policy
- idempotency key persistence
- audit persistence target
- monitoring and alerting
- rollback plan

Enabling runtime delivery before these are decided would create hidden production behavior.

## Migration Path

1. Add persistent audit/queue schema or storage adapter in a separate approved phase.
2. Add disabled queue writer behind a feature flag.
3. Add worker process in dry-run mode.
4. Persist delivery attempts and idempotency keys.
5. Enable email delivery through worker.
6. Enable WhatsApp dry-run through worker.
7. Enable WhatsApp live delivery only after separate ADR approval.

## Rollback Strategy

- Keep all queue writes feature-flagged.
- Keep worker disabled by default.
- If queue processing fails, disable worker first.
- If queue writes cause operational risk, disable the queue writer flag.
- Payment/booking routes must continue to complete without queue delivery.
- Do not roll back by changing Stripe capture, hold overlap, or booking status logic.

## Risks

- Duplicate notification delivery if idempotency is not persisted correctly.
- Lost jobs if Redis persistence is not configured.
- Worker failures without monitoring.
- Queue backlog hiding notification delivery failures.
- Provider outage causing retry storms.
- Operational complexity if queue and audit stores diverge.

## Non-Goals

- No payment lifecycle rewrite.
- No Stripe capture change.
- No hold overlap behavior change.
- No live WhatsApp activation in this ADR.
