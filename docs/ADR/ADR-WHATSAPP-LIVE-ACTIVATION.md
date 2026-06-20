# ADR — WhatsApp Live Activation

Status: Proposed  
Date: 2026-05-21  
Scope: Sharmar Marketplace WhatsApp notification delivery

## Context

WhatsApp notification foundation currently supports:

- phone normalization
- opt-in status modeling
- provider config modeling
- template payload modeling
- dry-run send simulation
- audit entry generation
- queue/retry/idempotency foundations

Live Meta WhatsApp Cloud API delivery is intentionally disabled.

## Prerequisites

Before live activation:

- customer/owner opt-in source must be defined
- opt-in persistence must exist
- Meta Cloud API credentials must be configured outside the repo
- approved message templates must exist
- runtime queue persistence must exist
- worker processing must exist
- delivery audit must be persisted
- monitoring and alerting must be active
- rollback plan must be documented and tested

## Meta Cloud API Credentials

Credentials must never be committed to the repo.

Required runtime configuration will likely include:

- Meta app credentials
- WhatsApp business account ID
- phone number ID
- access token
- template namespace if applicable
- default locale

Credentials must be stored in the deployment environment or secret manager.

## Templates

Templates should be created for:

- booking request received
- owner action required
- booking confirmed
- booking declined

Template wording must be neutral and operational:

- do not claim a booking is final until confirmed
- do not promise refunds unless the payment/refund flow confirms it
- include support context where appropriate

## Opt-In

Live WhatsApp requires explicit opt-in handling.

Minimum requirements:

- record opt-in status
- record opt-in source
- record opt-in timestamp where possible
- allow opt-out handling
- do not send live WhatsApp if status is unknown or opted out

## Dry-Run To Live Activation Steps

1. Keep WhatsApp mode disabled.
2. Persist notification queue and audit records.
3. Run worker in dry-run mode only.
4. Compare dry-run queue output against expected templates.
5. Confirm opt-in data is available.
6. Configure Meta credentials in production environment.
7. Enable provider health checks.
8. Enable live mode for an internal test recipient only.
9. Review audit logs and provider responses.
10. Gradually expand live delivery.

## Rollback

Rollback should not touch booking/payment core.

Rollback sequence:

1. Set WhatsApp mode to disabled.
2. Stop WhatsApp worker delivery.
3. Keep audit and queue records for investigation.
4. Continue email notifications.
5. Review provider errors before reactivation.

## Risks

- sending messages without opt-in
- template rejection by Meta
- duplicate delivery if idempotency is incomplete
- queue backlog during provider outage
- leaking PII in logs
- confusing customers with premature booking status language

## Compliance Notes

- Respect opt-in and opt-out status.
- Keep message content transactional and expected.
- Do not expose sensitive customer data in monitoring.
- Keep provider credentials out of source control.
- Review Meta policy requirements before live activation.

## Non-Goals

- No live WhatsApp delivery is enabled by this ADR.
- No queue worker is implemented by this ADR.
- No credentials are added by this ADR.
