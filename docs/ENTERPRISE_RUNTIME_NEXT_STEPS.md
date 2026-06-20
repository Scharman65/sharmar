# Enterprise Runtime Next Steps

Status: Planning checklist  
Scope: Runtime queue, workers, monitoring, WhatsApp activation  
Last updated: 2026-05-21

## Required Order

### 1. Choose Queue Storage

Decision needed:

- Postgres-backed queue
- Redis/BullMQ
- managed queue

Recommended first production path: Redis/BullMQ for execution queue, with persisted audit/reconciliation records in durable storage.

Acceptance criteria:

- ADR accepted.
- hosting model selected.
- persistence/backup behavior understood.
- rollback plan documented.

### 2. Implement Persistence

Add persistence for:

- notification queue records
- delivery attempts
- audit entries
- idempotency keys
- dead-letter state

Acceptance criteria:

- writes are feature-flagged
- no payment/booking route depends on queue success
- duplicate idempotency keys are handled safely
- read-only admin/reconciliation query path exists

### 3. Implement Worker

Worker responsibilities:

- claim queued records
- execute dry-run delivery first
- record attempts
- apply retry policy
- mark delivered/failed/abandoned

Acceptance criteria:

- worker disabled by default
- dry-run mode works
- retries are bounded
- worker failure does not affect booking/payment core
- dead-letter state is visible

### 4. Add Monitoring

Monitoring scope:

- API route errors
- owner action failures
- queue depth
- retry exhaustion
- dead-letter count
- provider delivery failures
- worker health

Acceptance criteria:

- alert thresholds defined
- no secrets/PII in public dashboards
- uptime checks active
- provider errors are classified

### 5. Activate WhatsApp Dry-Run In Runtime

Use runtime queue and worker, but keep provider delivery simulated.

Acceptance criteria:

- dry-run records are persisted
- templates render expected variables
- opt-in rules are enforced
- delivery audit is queryable
- no real WhatsApp messages are sent

### 6. Activate WhatsApp Live

Enable live Meta Cloud API delivery only after separate approval.

Acceptance criteria:

- Meta credentials configured outside repo
- templates approved
- opt-in persistence active
- monitoring active
- rollback tested
- first live send limited to internal recipients

## Risks

- enabling worker before idempotency persistence
- retry storm during provider outage
- exposing customer PII in logs
- activating WhatsApp without opt-in
- coupling booking/payment route success to notification delivery
- adding queue writes without rollback flag

## Rollback Notes

- Runtime queue writer must be feature-flagged.
- Worker must be independently disabled.
- WhatsApp live mode must be independently disabled.
- Email lifecycle should continue if WhatsApp is disabled.
- Booking/payment core must remain unaffected by queue failures.

## What Not To Do

- Do not modify Stripe capture logic.
- Do not modify hold overlap behavior.
- Do not change DB schema without a separate accepted plan.
- Do not enable WhatsApp live from a dry-run-only branch.
- Do not deploy queue/worker runtime without monitoring.
