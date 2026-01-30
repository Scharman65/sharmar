# Booking Request — Idempotency + Public API Contracts

This document defines **public booking request** contracts and idempotency rules.

We currently have **two layers**:
1) **CURRENT PROD (authoritative):** Next.js API route on `www.sharmar.me` that validates and creates requests.
2) **FUTURE (planned):** direct Strapi custom endpoint `/api/booking-requests-idempotent` (only if we decide to implement it).

---

## CURRENT PROD — Request API (authoritative)

### Endpoint
**POST** `https://www.sharmar.me/api/request`

### Purpose
Create a booking request from the public site with:
- strict payload validation
- boat lookup by `boatSlug`
- idempotency based on `publicToken`
- safe retries (frontend/network)

### Request (JSON)
```json
{
  "boatSlug": "catamaran-bali-4-2",
  "boatTitle": "Catamaran Bali 4.2",
  "name": "Test User",
  "phone": "+382000000",
  "email": "user@example.com",
  "dateFrom": "2026-02-01",
  "dateTo": "2026-02-01",
  "timeFrom": "10:00",
  "timeTo": "14:00",
  "peopleCount": 2,
  "needSkipper": false,
  "message": "User notes",
  "publicToken": "pt_live_check_1769767574_14792"
}

```
