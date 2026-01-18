# API_CONTRACTS — Sharmar Marketplace Core (Rent + Platform Fee Online)

Контракты API для:
- каталога и фильтров (public read)
- availability (public read)
- booking requests + approvals (commands)
- оплаты комиссии платформы (online)
- webhooks (provider → platform)

Модель денег:
- Rental payment: OFFLINE (платформа не обрабатывает)
- Platform service fee: ONLINE (платформа принимает оплату комиссии)

Дата: Jan 2026

---

## 1. Principles

### 1.1 Public vs Command API
- Public read endpoints: кэшируемые, безопасные, без PII.
- Command endpoints: некэшируемые, транзакционные, с guards.

### 1.2 Idempotency
- Все команды должны принимать `Idempotency-Key` (header).
- Повторный запрос с тем же ключом возвращает тот же результат.

### 1.3 Time & TZ
- Внешний API принимает ISO-8601.
- На хранении: UTC timestamptz.
- Validation: start_at < end_at.

### 1.4 Authorization
- Auth: Strapi users-permissions JWT.
- Roles:
  - client
  - owner
  - admin
- Ownership guard: owner может действовать только по своим boats/requests.

### 1.5 Versioning
- Command API вводится в namespace `/api/marketplace/v1/...`
- Strapi content REST остаётся как есть (catalog).

---

## 2. Public Read API

### 2.1 Catalog listing (existing Strapi REST)
GET /api/boats
- Query: filters, locale, pagination, sort
- Notes:
  - только published
  - slug as public id
  - PII отсутствует

### 2.2 Availability read (custom, public)
GET /api/marketplace/v1/boats/{boatId}/availability?from={ISO}&to={ISO}
Auth: none
Returns:
- timezone
- blocks (sanitized kinds, no PII)
- derived availability slots (optional)
Caching:
- allowed short TTL (e.g. 60s) if response does not include user context

Response (example schema):
{
  "boatId": 123,
  "timezone": "Europe/Podgorica",
  "from": "...",
  "to": "...",
  "blocks": [{ "startAt": "...", "endAt": "...", "kind": "booked" }],
  "slots": [{ "startAt": "...", "endAt": "...", "granularity": "hour" }]
}

---

## 3. Auth API (Strapi users-permissions)
POST /api/auth/local
POST /api/auth/local/register
GET /api/users/me (protected)
Notes:
- public registration optional; owner onboarding может быть manual.

---

## 4. BookingRequest Command API (client)

### 4.1 Create draft
POST /api/marketplace/v1/booking-requests
Auth: client
Headers: Idempotency-Key
Body:
{
  "boatId": 123,
  "startAt": "2026-02-01T09:00:00+01:00",
  "endAt": "2026-02-01T13:00:00+01:00",
  "guests": 6,
  "notes": "..."
}
Returns:
- bookingRequestId
- status=draft

### 4.2 Submit request (creates system_hold)
POST /api/marketplace/v1/booking-requests/{id}/submit
Auth: client (owner/admin forbidden)
Headers: Idempotency-Key
Effects:
- validates overlap
- creates system_hold block with HOLD_TTL
- status=submitted
Returns:
{
  "id": "...",
  "status": "submitted",
  "holdExpiresAt": "..."
}

### 4.3 Cancel request
POST /api/marketplace/v1/booking-requests/{id}/cancel
Auth: client (owner/admin allowed with separate endpoint)
Headers: Idempotency-Key
Effects:
- releases hold if exists
- status=cancelled

### 4.4 Read own requests
GET /api/marketplace/v1/me/booking-requests?status=&page=
Auth: client

---

## 5. Owner Command API (approve/reject + inbox)

### 5.1 Owner inbox
GET /api/marketplace/v1/owner/inbox?status=submitted&page=
Auth: owner
Returns:
- list of requests for owner boats
- sanitized contact fields per policy (MVP minimal)

### 5.2 Approve
POST /api/marketplace/v1/owner/booking-requests/{id}/approve
Auth: owner
Headers: Idempotency-Key
Effects:
- status=owner_approved
- extends hold expiry to PAYMENT_TTL
- snapshot pricing/policy if needed
Returns:
{
  "id": "...",
  "status": "owner_approved",
  "paymentExpiresAt": "..."
}

### 5.3 Reject
POST /api/marketplace/v1/owner/booking-requests/{id}/reject
Auth: owner
Headers: Idempotency-Key
Effects:
- status=owner_rejected
- releases hold

---

## 6. Platform Fee Payment API (online fee, rental offline)

Ключевой инвариант:
- Booking becomes CONFIRMED only after platform fee is paid.
- Rental amount is not processed by platform.

### 6.1 Create Fee Checkout Session / PaymentIntent
POST /api/marketplace/v1/booking-requests/{id}/fee/checkout
Auth: client
Headers: Idempotency-Key
Preconditions:
- booking_request.status == owner_approved
- hold not expired
Effects:
- creates Order (platform fee only) status=payment_pending
- creates provider checkout session or payment_intent
Returns:
{
  "orderId": "...",
  "provider": "stripe",
  "checkoutUrl": "...",             // if Stripe Checkout
  "paymentIntentId": "..."          // optional
}

Notes:
- amount_total == platform fee only
- pricing_snapshot reflects fee calculation (percent, min fee, etc)

### 6.2 Webhook endpoint (provider → platform)
POST /api/marketplace/v1/webhooks/stripe
Auth: none (verified by signature)
Effects (idempotent):
- on payment success:
  - Order.status → paid
  - create Payment record
  - create LedgerEntry(type=charge, platform_fee)
  - confirm booking:
    - create Booking(status=confirmed) OR update if exists
    - convert system_hold → booked block
- on payment failed:
  - Order.status → failed
  - booking_request remains owner_approved (until PAYMENT_TTL) or expires

### 6.3 Read fee payment status
GET /api/marketplace/v1/booking-requests/{id}/fee/status
Auth: client (owner/admin allowed with separate read)
Returns:
{
  "bookingRequestStatus": "...",
  "orderStatus": "...",
  "bookingStatus": "confirmed|...",
  "expiresAt": "..."
}

---

## 7. Booking Read API

### 7.1 Client bookings
GET /api/marketplace/v1/me/bookings?status=&page=
Auth: client

### 7.2 Owner bookings (calendar view)
GET /api/marketplace/v1/owner/bookings?from=&to=
Auth: owner
Returns:
- bookings for owner boats
- no PII beyond what owner is allowed to see

---

## 8. Admin API (minimal)
- admin cancel booking request
- admin cancel booking
- admin mark dispute
- admin override holds (with audit)

All admin actions:
- require admin role
- must write BookingEvent + NotificationOutbox

---

## 9. Caching & CDN Rules

- DO NOT cache:
  - POST /api/marketplace/v1/**
  - /webhooks/**
  - any endpoint returning PII or user-specific data
- Allow short caching:
  - GET availability (public) with TTL if safe

---

## 10. Error Contracts (standard)

- 400 validation_error (bad dates, missing fields)
- 401 unauthenticated
- 403 forbidden (role/ownership)
- 409 conflict (overlap detected, hold expired, state mismatch)
- 422 state_error (invalid transition)
- 500 internal (with correlation id)

Response minimal schema:
{
  "error": {
    "code": "conflict",
    "message": "...",
    "details": {}
  }
}

---

## 11. Observability

- Every command returns:
  - request_id / correlation_id (header)
- Audit:
  - BookingEvent written for every state transition
- Webhooks:
  - store provider event id and processing status
  - idempotent handling

---
