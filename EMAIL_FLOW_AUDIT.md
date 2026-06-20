# Sharmar Marketplace — Email Flow Audit

## Current status

Email flow is partially implemented.

## Implemented

- Booking request created email
- Internal admin notification via Resend
- Owner decision email via Resend when boat.owner_email exists
- Owner page link generated as /:lang/owner/:public_token

## Missing

- Customer payment authorized email
- Customer booking confirmed email
- Customer booking declined/refunded email
- Reliable email delivery logging
- Complete env documentation

## Current provider

- Resend
- No SMTP fallback
- mailto fallback exists only in failed request response

## Important architecture decision

Canonical owner confirm route is:

/api/request/:token/approve

Do not switch frontend back to /api/booking-requests/:token/owner-confirm until backend owner-confirm is redesigned for the current pay-first flow.

## Sale readiness impact

Email flow is the next highest-value improvement after payments stabilization.

## Next implementation priority

1. Customer booking confirmed email
2. Customer payment authorized email
3. Owner decision email hardening
4. Decline/refund customer email
5. Env example update
