# Runtime Infrastructure Implementation Phase

Status: Foundation prepared, runtime disabled  
Scope: Queue adapter, monitoring adapter, future Redis/BullMQ worker integration  
Last updated: 2026-05-21

## What Is Prepared

The frontend now has disabled-first runtime abstractions for:

- queue runtime provider selection
- queue runtime mode selection
- queue adapter interface
- disabled queue adapter
- monitoring provider selection
- disabled monitoring config

The existing notification foundations remain the data model for:

- queue records
- retry state
- idempotency keys
- delivery attempts
- audit entries
- operational metrics

## What Is Intentionally Disabled

This phase does not enable:

- Redis connections
- BullMQ queues
- BullMQ workers
- background jobs
- live notification queueing
- live WhatsApp delivery
- monitoring vendor initialization
- Sentry runtime
- deployment changes

Runtime execution remains disabled by default.

## Feature Flag Principles

Future runtime work should follow these rules:

- queue writer disabled by default
- worker disabled by default
- monitoring disabled by default
- WhatsApp live disabled by default
- dry-run mode before live mode
- payment/booking route success must not depend on queue success

Recommended config shape:

- `enabled: false`
- `provider: "disabled"`
- `mode: "disabled"`
- `monitoringEnabled: false`

## Why Runtime Remains Disabled

Runtime remains disabled because production activation still requires:

- queue persistence decision
- Redis/BullMQ hosting plan
- worker process deployment plan
- monitoring and alerting
- dead-letter policy
- idempotency persistence
- rollback procedure

Enabling queue execution before these are complete would introduce hidden operational behavior.

## Next Safe Phase

The next safe phase is queue persistence preparation:

1. choose persistence target
2. add queue/audit persistence adapter
3. keep writes feature-flagged
4. add dry-run worker only after persistence exists
5. add monitoring before live provider delivery

## Rollback Principles

- Disable queue writer first.
- Disable worker independently.
- Disable WhatsApp live independently.
- Keep email fallback path available.
- Preserve booking/payment route completion even when runtime queue is disabled.
- Do not roll back by changing Stripe capture logic.
- Do not roll back by changing hold overlap behavior.
