# Sharmar — NOT DOING (Non-Scale Phase) v1.0
Date: 2026-02-05
Scope: Explicit exclusions until revenue achieved

## Purpose
This document locks the scope boundaries for the non-scale phase.
Anything not in Definition of Done is out of scope unless explicitly approved and versioned.

## 1) Payments & Finance
- No online card payments (no Stripe/PayPal/etc.).
- No automatic deposits/refunds/chargebacks.
- No invoicing automation.
- Revenue operations may be manual (bank transfer/cash/card terminal), tracked by status fields.

## 2) Scaling & Performance
- No horizontal scaling or multi-instance Strapi.
- No message queues or event buses (Kafka/RabbitMQ/SQS/etc.).
- No background worker fleet.
- No multi-region or multi-datacenter architecture.
- Performance work only if it blocks conversions or stability.

## 3) Automation
- No auto-approval of booking requests.
- No dynamic pricing engine.
- No real-time availability sync with external calendars.
- No webhooks / Zapier / third-party automation.
- No CRM automation (manual ops acceptable).

## 4) Product Surface / Roles
- No mobile apps.
- No owner portal/dashboard beyond admin.
- No multi-owner permissions model.
- No complex RBAC project.
- No advanced customer accounts (keep minimal).

## 5) Observability & Tooling
- No Prometheus/Grafana stack.
- No APM/Sentry mandatory rollout.
- Logs + minimal runbook + manual diagnostics are sufficient.

## 6) Expansion / Compliance
- No multi-country logic (tax, currency, legal, VAT automation).
- No multi-currency pricing.
- Localization limited to current supported languages/SEO needs.

## 7) UX Polish
- No pixel-perfect redesign.
- No non-essential animations.
- Focus: correctness, clarity, conversion, stability.

## Hard Rule
If a task is not required to pass DoD v1.0, it is not done in this phase.

