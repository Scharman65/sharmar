# Operational Reconciliation Runbook

Status: Manual reconciliation runbook  
Scope: Payments, bookings, owner actions, notifications  
Last updated: 2026-05-21

## Operating Principles

- Read first, mutate only with a separate approved plan.
- Do not modify Stripe capture logic during reconciliation.
- Do not modify hold overlap protection during reconciliation.
- Do not change database schema during routine checks.
- Do not deploy from this runbook.
- Do not paste secrets or provider credentials into logs, issues, or chat.

## Daily Manual Checks

1. Open the owner dashboard.
2. Review Active bookings, Active holds, and Recent activity counts.
3. Review Payment Operations.
4. Review Payment Health.
5. Review Queue Infrastructure.
6. Review Operational Reconciliation.
7. Confirm WhatsApp live delivery remains disabled unless a separate production activation plan has been approved.

## Payment Reconciliation Checks

Check:

- New paid bookings appear as `deposit_paid`.
- Holds remain visible as `hold`.
- Latest payment status is present when a payment intent exists.
- Failed payment counts remain manually reviewed until persistent payment history reporting is implemented.
- Refund-related requests remain manually reviewed until refund reporting is implemented.

Safe read-only SQL examples, if direct database read access is already available:

```sql
select
  id,
  provider,
  provider_intent_id,
  status,
  booking_request_id,
  booking_id,
  updated_at
from public.payments
order by updated_at desc nulls last, id desc
limit 20;
```

```sql
select
  id,
  status,
  payment_intent_id,
  owner_decision,
  slot_start_utc,
  slot_end_utc,
  created_at
from public.bookings
order by created_at desc
limit 20;
```

## Booking Reconciliation Checks

Check:

- Active holds do not overlap for the same boat/time slot.
- Deposit-paid bookings match expected owner-confirmed outcomes.
- Recent activity entries belong to the authenticated owner boats.
- Public tokens exist for owner-action capable records.

Safe read-only SQL example:

```sql
select
  id,
  public_id,
  status,
  boat_id,
  slot_start_utc,
  slot_end_utc,
  owner_decision,
  created_at
from public.bookings
where status in ('hold', 'deposit_paid')
order by created_at desc
limit 50;
```

## Owner Action Checks

Check:

- Hold bookings expose Confirm and Decline where a public token exists.
- Confirmed owner actions refresh the dashboard.
- Declined owner actions refresh the dashboard.
- Email failures do not fail owner action routes.
- Owner action response shape remains backward compatible.

Do not manually change owner decision fields during routine checks.

## Notification Checks

Check:

- Customer request email is configured and active.
- Confirmed/declined customer email templates exist.
- Confirmed/declined customer emails are best-effort and non-blocking.
- Notification audit foundation exists.
- Retry/idempotency foundation exists.
- Queue/reconciliation foundations exist.

## Failed Email Checks

Check application logs for warning tags:

- `CUSTOMER_EMAIL_SEND_FAILED`
- `CUSTOMER_DECISION_EMAIL_SEND_FAILED`
- `CUSTOMER_DECISION_PAYLOAD_LOAD_FAILED`

Escalate if warnings repeat for multiple bookings or correlate with missing provider configuration.

## WhatsApp Dry-Run Checks

Check:

- WhatsApp provider foundation is ready.
- WhatsApp dry-run adapter is ready.
- Live WhatsApp delivery is disabled.
- No real Meta Cloud API messages are sent.
- Phone normalization and opt-in eligibility helpers remain pure.

Do not enable live WhatsApp delivery without:

- documented customer opt-in source
- approved Meta templates
- provider credentials configured outside the repo
- persistent audit/queue plan
- rollback plan

## When To Escalate

Escalate when:

- A payment is captured but no corresponding booking state is visible.
- A booking is confirmed without expected payment evidence.
- Holds overlap for the same boat/time slot.
- Owner confirm/decline fails repeatedly.
- Customer decision emails fail repeatedly.
- Dashboard counts diverge from read-only database checks.
- Any operator proposes direct mutation of payment, booking, or Stripe state without a written plan.

## What Not To Touch

During routine reconciliation, do not:

- change Stripe capture logic
- edit payment intent IDs
- modify hold overlap behavior
- change booking status manually
- update database schema
- deploy new code
- run destructive SQL
- enable live WhatsApp delivery

## No Destructive Commands

This runbook intentionally contains no destructive SQL, no `delete`, no `update`, no schema migration commands, and no deployment commands.
