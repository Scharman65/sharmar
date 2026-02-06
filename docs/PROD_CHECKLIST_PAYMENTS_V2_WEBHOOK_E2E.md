# PROD CHECKLIST — PAYMENTS v2 (GREEN) — Webhook E2E (Manual Capture)

Scope:
- Only GREEN (`:1338`)
- No schema migrations
- No frontend changes
- No Strapi build
- Reversible, prod-safe

## Preconditions
- `api.sharmar.me` routes `/api/payments/webhook` to GREEN (127.0.0.1:1338)
- Strapi GREEN has raw body enabled:
  - `dist/config/middlewares.js` includes:
    - `{ name: 'strapi::body', config: { includeUnparsed: true } }`
- Env set in GREEN:
  - `STRIPE_WEBHOOK_SECRET=<whsec_...>` (for Stripe CLI forward)

## Identify GREEN endpoints
- Internal:
  - `http://127.0.0.1:1338/api/payments/intent`
- External webhook:
  - `https://api.sharmar.me/api/payments/webhook`

## DB baseline queries (server)
### Find latest payments for booking_request_id (example: 324)
```sql
select
  id,
  provider_intent_id,
  status,
  metadata->>'provider_status' as provider_status,
  updated_at
from public.payments
where booking_request_id = 324
order by id desc
limit 5;

