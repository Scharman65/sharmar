# ADR — Monitoring and Observability

Status: Proposed  
Date: 2026-05-21  
Scope: Sharmar Marketplace operational monitoring

## Context

The booking/payment vertical is production-operationally complete at the application layer, but enterprise runtime operations need monitoring before queues, workers, and live WhatsApp delivery are enabled.

Monitoring must cover:

- booking request creation
- hold creation and expiry risk
- Stripe/payment lifecycle
- owner actions
- customer email lifecycle
- notification queue and retries
- WhatsApp dry-run/live delivery
- dashboard/API health

## Minimum Monitoring Stack

The minimum stack should include:

- application error monitoring
- structured server logs
- uptime checks
- payment/booking operational alerts
- notification delivery alerts
- queue and worker health checks

## Sentry

Use Sentry or equivalent application error monitoring for:

- frontend route errors
- API route exceptions
- owner dashboard load failures
- owner action proxy failures
- notification delivery exceptions
- worker exceptions once workers exist

Do not send secrets, payment card data, provider tokens, or full customer messages to Sentry.

## Logs

Logs should retain structured events for:

- booking request creation result
- owner action result
- customer email send failures
- notification queue enqueue result
- worker processing result
- provider response class
- retry exhaustion

Logs must not expose:

- Stripe secrets
- Resend API keys
- Meta tokens
- owner JWTs
- full customer PII beyond what is operationally necessary

## Uptime Checks

Minimum uptime checks:

- public site root
- boat listing page
- booking request page
- owner login page
- owner dashboard API health with a non-secret synthetic strategy
- Strapi API health

No uptime check should require committing real credentials.

## Payment and Booking Alerts

Alert on:

- owner action failures above threshold
- payment intent proxy failures
- booking status mismatch reports
- hold creation failures
- overlap protection anomalies
- booking confirmed without expected payment evidence

Alerts should page only for production-impacting failures. Lower-priority reconciliation drift can be daily digest.

## Notification Delivery Alerts

Alert on:

- repeated customer email failures
- queue depth above threshold
- retry exhaustion
- dead-letter growth
- WhatsApp provider errors
- opt-in validation failures above expected baseline

Dry-run failures should be visible but should not page unless they block activation testing.

## What Not To Monitor Publicly

Do not expose public dashboards containing:

- customer email addresses
- phone numbers
- payment intent IDs
- owner JWTs
- API tokens
- provider credentials
- raw email/WhatsApp message bodies

Operational dashboards should aggregate counts and statuses unless access is restricted.

## Rollout Stages

1. Add structured log taxonomy.
2. Add Sentry for frontend/API exceptions.
3. Add uptime checks.
4. Add payment/booking alert thresholds.
5. Add notification queue metrics once persistence exists.
6. Add worker health and dead-letter monitoring.
7. Add WhatsApp provider metrics during dry-run.
8. Enable live WhatsApp alerts before live delivery.

## Consequences

- Monitoring becomes a prerequisite for runtime queue and worker activation.
- Provider integrations must define safe error metadata.
- Alert thresholds must avoid noise during early dry-run phases.

## Non-Goals

- No monitoring vendor is activated by this ADR.
- No runtime worker is introduced by this ADR.
- No customer-facing analytics are introduced by this ADR.
