# BOOKING & CALENDAR — MODEL (Plan B / Instant Booking)

## Product Rules (Authoritative)

1. Каждая лодка имеет собственный календарь.
2. Турист может бронировать ТОЛЬКО свободные слоты.
3. Подтверждение владельцем НЕ требуется.
4. Бронирование фиксируется автоматически.
5. Предоплата обязательна (15% / 20% / 25%).
6. После успешной предоплаты туристу открываются контакты владельца.
7. Остальная сумма оплачивается наличными владельцу перед катанием.
8. Двойное бронирование одного слота НЕДОПУСТИМО.

---

## Time & Timezone

- Все расчёты и хранение: **UTC**
- У лодки есть `timezone` (например `Europe/Podgorica`)
- UI работает в TZ лодки
- В БД:
  - slot_start_utc
  - slot_end_utc

---

## Core Entities

### Boat
- id
- slug
- timezone
- booking_enabled (bool)
- min_duration_minutes
- buffer_before_minutes
- buffer_after_minutes

---

### BoatAvailabilityRule
(рабочие часы лодки)

- boat_id
- weekday (0–6)
- start_time_local (HH:mm)
- end_time_local (HH:mm)
- active

---

### BoatBlackout
(недоступные даты)

- boat_id
- start_utc
- end_utc
- reason

---

### BookingSlot (виртуальная сущность)
Слоты НЕ храним постоянно.  
Они **вычисляются** из:
- availability rules
- blackout
- существующих bookings

---

### Booking
(жёсткая фиксация слота)

- id
- public_id (uuid, показывается клиенту)
- boat_id
- slot_start_utc
- slot_end_utc

- status:
  - hold
  - deposit_paid
  - cancelled
  - expired

- deposit_rate (0.15 | 0.20 | 0.25)
- deposit_amount
- currency

- customer_name
- customer_phone
- customer_email

- created_at
- expires_at (для hold)

#### DB Invariant (КРИТИЧНО)
UNIQUE (boat_id, slot_start_utc, slot_end_utc)

---

### BookingPayment
- booking_id
- provider (stripe)
- amount
- currency
- status (pending | succeeded | failed)
- provider_intent_id
- created_at

---

### BookingContactRelease
(факт открытия контактов)

- booking_id
- released_at
- method (deposit_paid)

---

## Booking Flow (Authoritative)

### 1. Availability
`GET /api/boats/{slug}/availability`

→ возвращает только свободные слоты

---

### 2. Hold slot
`POST /api/bookings/hold`

- создаёт booking со статусом `hold`
- выставляет `expires_at` (например +15 минут)
- если слот уже занят → 409

---

### 3. Deposit payment
`POST /api/payments/deposit/intent`

- создаёт payment intent
- сумма = deposit_rate * total_price

---

### 4. Webhook
`POST /api/payments/webhook`

- подтверждает платёж
- переводит booking → `deposit_paid`
- открывает контакты владельца

---

### 5. Client access
Контакты владельца возвращаются ТОЛЬКО если:
- booking.status = deposit_paid

---

## Anti-Double Booking Strategy

1. HOLD создаётся в транзакции
2. UNIQUE constraint в БД
3. Повторный hold того же слота → 409
4. Истёкшие hold чистятся cron-ом

---

## Explicitly NOT Implemented (by design)

- paid_full ❌
- owner confirmation ❌
- manual approval ❌
- overbooking ❌

