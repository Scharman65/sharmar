# BOOKING_STATE_MACHINE — Sharmar (Rent only)

State machine для rent-потока:
BookingRequest → (Owner approval) → (Payment) → Booking → Completion/Cancel/Refund.

Политика MVP:
- Owner approval выполняется ДО оплаты.
- Payment создаётся только после owner_approved.
- Пересечения дат защищены на уровне БД (range + GIST) и транзакций.

Дата: Jan 2026

---

## 1. Entities & Roles

### 1.1 Entities
- BookingRequest
- Booking
- AvailabilityBlock (system_hold / booked / owner_block / admin_block)
- Order
- Payment
- LedgerEntry
- NotificationOutbox
- BookingEvent (audit)

### 1.2 Roles
- Client (customer)
- Owner (boat owner)
- Admin (platform)

---

## 2. High-level Flow (MVP)

1) Client создаёт BookingRequest (draft)  
2) Client отправляет (submitted)  
   - создаётся system_hold block на интервал с expires_at
3) Owner принимает/отклоняет
   - approve: owner_approved (+ продление hold до оплаты)
   - reject: owner_rejected (hold снимается)
4) После approve клиент переходит к оплате
   - создаётся Order (payment_pending)
   - создаётся PaymentIntent у провайдера
5) После успешной оплаты
   - Booking создаётся/переводится в confirmed
   - system_hold преобразуется в booked block (или создаётся booked block)
6) Выполнение аренды → completed  
7) Отмена/возвраты → cancelled/refunded

---

## 3. BookingRequest State Machine

### 3.1 States
- `draft`
- `submitted`
- `owner_approved`
- `owner_rejected`
- `payment_pending`
- `cancelled`
- `expired`

### 3.2 Allowed Transitions (Commands)

#### Client Commands
- `create_draft` : (none) → draft
- `submit` : draft → submitted
- `cancel` : draft/submitted/owner_approved/payment_pending → cancelled

#### Owner Commands
- `approve` : submitted → owner_approved
- `reject` : submitted → owner_rejected

#### System Commands
- `expire_hold` : submitted/owner_approved/payment_pending → expired
- `mark_payment_pending` : owner_approved → payment_pending

#### Admin Commands
- `admin_cancel` : any active → cancelled

### 3.3 Side-effects by Transition

#### submit (draft → submitted)
- Validate:
  - start_at < end_at
  - boat exists, listing_type=rent
  - user authenticated
- DB transaction:
  - check overlap against:
    - bookings with status in (pending_payment, confirmed, active)
    - blocks kind in (owner_block, maintenance, admin_block, booked, system_hold)
  - create AvailabilityBlock:
    - kind=system_hold, source=system
    - start_at/end_at from request
    - expires_at = now + HOLD_TTL (e.g. 30 min in MVP)
- Write BookingEvent: `booking_request.submitted`
- Enqueue NotificationOutbox:
  - owner notified: “new request”

#### approve (submitted → owner_approved)
- Validate:
  - actor is owner/admin for the boat
  - request is still within hold TTL (or extend)
- DB transaction:
  - extend hold expiry for payment window (PAYMENT_TTL e.g. 60 min)
  - optionally refresh pricing_snapshot/policy_snapshot
- BookingEvent: `booking_request.owner_approved`
- Notify client: “approved, proceed to payment”

#### reject (submitted → owner_rejected)
- DB transaction:
  - delete or close related system_hold block
- BookingEvent: `booking_request.owner_rejected`
- Notify client

#### mark_payment_pending (owner_approved → payment_pending)
- DB transaction:
  - create Order(status=payment_pending) with pricing snapshot
  - create Payment record with provider ids when available
- BookingEvent: `order.created`
- Notify client: “payment started” (optional)

#### cancel (… → cancelled)
- DB transaction:
  - release system_hold if exists
  - if payment already succeeded (rare in this state machine), route to refund workflow
- BookingEvent: `booking_request.cancelled`
- Notify owner/client depending on state

#### expire_hold (… → expired)
- System job:
  - finds requests where expires_at < now AND status in submitted/owner_approved/payment_pending
- DB transaction:
  - release hold block
  - status → expired
- BookingEvent: `booking_request.expired`
- Notify client/owner (optional)

---

## 4. Booking State Machine

### 4.1 States
- `pending_payment`
- `confirmed`
- `active`
- `completed`
- `cancelled`
- `refunded`
- `dispute`

### 4.2 Creation policy
- Booking может появиться:
  - после успешного платежа (preferred MVP)
  - или как “skeleton” после approval со статусом pending_payment (optional)
MVP recommendation:
- Создавать Booking после payment success, чтобы не плодить “зависшие” записи.

### 4.3 Transitions

#### System/Payments
- `confirm_after_payment` : (none) → confirmed
- `cancel_before_start` : confirmed → cancelled
- `refund` : cancelled/confirmed → refunded
- `start` : confirmed → active
- `complete` : active → completed

#### Admin
- `admin_cancel` : confirmed/active → cancelled
- `admin_refund` : cancelled/confirmed → refunded
- `dispute_open` : confirmed/active → dispute
- `dispute_close` : dispute → (confirmed/cancelled/refunded)

### 4.4 Side-effects

#### confirm_after_payment
- DB transaction:
  - create Booking (confirmed)
  - convert system_hold → booked block OR delete hold and create booked block
  - ensure overlap constraints hold
- BookingEvent: `booking.confirmed`
- Notify owner/client

#### start / complete
- Can be system/manual in MVP (admin sets), позже — автоматизация
- BookingEvent: `booking.active` / `booking.completed`

#### cancel_before_start
- Policy snapshot defines fee/refund rules
- BookingEvent: `booking.cancelled`
- Payment/Order may be refunded depending on rules

---

## 5. Order State Machine (Payments)

### 5.1 States
- `created`
- `payment_pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`
- `payout_pending`
- `payout_done`

### 5.2 Transitions
- `create` : none → payment_pending
- `mark_paid` : payment_pending → paid (via webhook)
- `mark_failed` : payment_pending → failed
- `cancel` : payment_pending → cancelled
- `refund` : paid → refunded
- `schedule_payout` : paid → payout_pending
- `payout_done` : payout_pending → payout_done

### 5.3 Invariants
- paid только по webhook подтверждению провайдера
- refund только через провайдера
- ledger фиксирует каждое денежное событие

---

## 6. Holds & Overlap Guarantees

### 6.1 Holds TTL
- HOLD_TTL (submitted): 30 минут (MVP)
- PAYMENT_TTL (after approval): 60 минут (MVP)
Все значения — конфигурируемые.

### 6.2 Overlap policy
Запрещены пересечения для одной лодки между:
- booking (pending_payment/confirmed/active)
- system_hold
- booked
- owner/admin/maintenance blocks

Гарантия обеспечивается:
- DB-level range + GIST
- транзакциями на create/confirm

---

## 7. Notifications & Audit

Для каждого перехода:
- BookingEvent записывается всегда
- NotificationOutbox создаётся для внешней доставки
- доставка ретраится и не блокирует транзакции

---

## 8. Failure Handling & Idempotency

- Все command endpoints должны быть идемпотентны:
  - повторный submit не создаёт второй hold
  - повторный approve не создаёт новый order
- Webhook обработчики обязаны быть идемпотентны по provider event id.

---

## 9. Read Models (Frontend Needs)

Frontend читает:
- availability slots (derived)
- booking request status
- booking status
- owner inbox

Публичный frontend не должен видеть PII, кроме того что необходимо (в MVP — минимум).

---
