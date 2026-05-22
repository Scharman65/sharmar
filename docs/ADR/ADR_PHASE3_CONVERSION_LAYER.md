# ADR — Phase 3 Marketplace Conversion Layer

## Status
Accepted

## Context

Sharmar marketplace already has:

- stable booking engine
- Stripe authorization/capture flow
- anti-double-booking foundation
- UTC slot architecture
- duration selector with consecutive slot logic
- production booking widget

The next phase focuses on:
- conversion optimization
- trust UX
- mobile booking UX
- pricing transparency

WITHOUT changing:
- backend contracts
- Stripe flow
- hold API
- request URL contracts
- slot UTC architecture
- anti-double-booking logic

---

# Protected Production Systems

The following systems are considered production-critical and must remain unchanged during Phase 3:

- /api/hold
- /api/request
- /api/payments/intent
- Stripe authorization/capture behavior
- booking lifecycle
- owner approval flow
- request URL parameters
- slot_start_utc / slot_end_utc behavior
- consecutive slot logic
- DB schema
- payment state machine

---

# Phase 3 Goals

## 1. Sticky Mobile CTA

Frontend-only:
- mobile sticky reserve button
- safe-area aware
- no API changes
- no booking logic changes

## 2. Booking Pricing Summary

Frontend-only estimated pricing:
- price/hour
- estimated total
- duration display
- owner approval messaging

Backend remains source of truth.

## 3. Full-Day Premium UX

Frontend-only visual improvements:
- premium badge
- best experience positioning
- preserve slotCount=8 logic

## 4. Mobile Optimization

Frontend-only:
- compact spacing
- reduced vertical height
- preserve readability
- preserve luxury marketplace feel

## 5. Trust Layer

Frontend wording only:
- secure authorization
- owner approval messaging
- anti-double-booking trust messaging

No payment lifecycle changes.

---

# Rollout Strategy

1. frontend-only rollout
2. additive-only changes
3. preview deploy first
4. production smoke tests
5. rollback via git tag if needed

---

# Explicit Non-Goals

Phase 3 does NOT include:
- backend rewrites
- Stripe rewrites
- pricing engine rewrite
- schema changes
- hold system changes
- availability engine rewrite
- analytics backend
- calendar sync backend

---

# Future Backend Phases

Later phases MAY include:
- dynamic pricing engine
- quote snapshot backend
- cancellation policies
- ICS/Google Calendar sync
- analytics events
- A/B testing
- owner SLA system
- reviews/trust system
