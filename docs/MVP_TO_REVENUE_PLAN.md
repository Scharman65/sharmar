# Sharmar — MVP → Revenue Plan v1.0
Date: 2026-02-05
Scope: Linear execution plan (non-scale phase)

## Principles
- One step at a time.
- No parallel tasks.
- No changes that risk production stability.
- Every step has a clear DONE condition.

## Step 1 — Freeze Booking Flow
Goal:
- Booking request + hold flow is stable and repeatable.

DONE when:
- booking_requests idempotency = PASS
- HOLD idempotency = PASS
- No duplicate bookings in DB under repeated requests.

## Step 2 — Admin Decision Flow
Goal:
- Admin can process every request without DB access.

Tasks:
- Define final booking_request statuses.
- Ensure approve/reject paths are consistent.

DONE when:
- Admin can fully resolve a request via UI/API.
- Status transitions are explicit and persisted.

## Step 3 — User Confirmation UX
Goal:
- User always knows the outcome of their action.

Tasks:
- Clear confirmation after request submit.
- Clear messaging for pending/approved/rejected.

DONE when:
- No silent states.
- Errors are visible and user-safe.

## Step 4 — Ops Safety Net
Goal:
- System survives failures without manual panic.

Tasks:
- Backup schedule verified.
- Restore procedure documented.
- Restart behaviour verified.

DONE when:
- Backup exists and is recent.
- Restart does not break booking flow.

## Step 5 — Revenue Readiness (Manual)
Goal:
- Ability to accept money manually.

Tasks:
- Manual payment instructions defined.
- Status reflecting payment received exists.

DONE when:
- Admin can mark request as paid.
- Revenue can be tracked externally.

## Stop Condition
When Step 5 is DONE:
- Product is revenue-ready.
- Scale work is explicitly forbidden until revenue feedback.

