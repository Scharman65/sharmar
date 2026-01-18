# DATA_MODEL — Sharmar Marketplace Core (Rent only)

Этот документ фиксирует целевую модель данных для ядра маркетплейса Sharmar (только аренда).
Sale (продажа) не входит в booking/payments контур и рассматривается как lead/contact поток.

Дата: Jan 2026

---

## 1. Scope

Входит:
- Availability (правила доступности и блокировки)
- BookingRequests (заявки)
- Bookings (подтверждённые бронирования)
- Approvals/Audit (история событий)
- Notifications (outbox)
- Orders/Payments/Ledger/Payouts (платёжный контур)

Не входит:
- Sale workflow и sale payments
- KYC процессы (но модель готова к подключению)

---

## 2. Naming & Storage Conventions

### 2.1 Time & Timezones
- Все временные поля в БД: **timestamptz (UTC)**.
- На лодке хранится `timezone` (IANA, напр. `Europe/Podgorica`).
- Любые “дневные” бронирования нормализуются по TZ лодки → записываются в UTC.

### 2.2 Identifiers
- Публичный идентификатор лодки: **slug** (frontend).
- Внутренние связи: `boat.id` (Strapi entity id).
- Для внешних провайдеров: отдельные поля `provider_*_id`.

### 2.3 Immutability
- Денежные расчёты хранятся в snapshot-полях (pricing/policy snapshots).
- История действий сохраняется в audit log; записи не “переписываются”.

---

## 3. Existing Dependencies (Catalog)
Зависимости от существующих сущностей Strapi:
- `boat` (existing content-type)
  - для rent: `listing_type=rent`
  - `price_per_hour`, `price_per_day` и др.
  - `home_marina`, media, i18n localizations
  - добавляется: `timezone` (IANA string) — рекомендуется для календаря

Новые сущности не должны ломать текущую выдачу каталога.

---

## 4. Core Entities (Target)

### 4.1 AvailabilityRule
Назначение: регулярная доступность лодки (когда лодка доступна для аренды).

**Fields**
- `boat` (relation → boat) [required]
- `timezone` (string IANA) [required]
- `period_start` (date) [nullable]
- `period_end` (date) [nullable]
- `granularity` (enum: `hour`, `day`) [required]
- `weekmask` (integer bitmask 0..127) [nullable]  
  (например Mon..Sun)
- `day_start_time` (time) [nullable]
- `day_end_time` (time) [nullable]
- `min_duration_minutes` (int) [nullable]
- `max_duration_minutes` (int) [nullable]
- `notes` (text) [nullable]
- `is_active` (boolean) [default true]

**Indexes**
- `(boat_id, is_active)`
- `(boat_id, period_start, period_end)`

**Notes**
- Rules не гарантируют отсутствие пересечений — пересечения решаются блоками/бронями.

---

### 4.2 AvailabilityBlock
Назначение: блокировки дат/времени (owner/admin/system).

**Fields**
- `boat` (relation → boat) [required]
- `start_at` (timestamptz UTC) [required]
- `end_at` (timestamptz UTC) [required]
- `kind` (enum: `owner_block`, `maintenance`, `system_hold`, `booked`, `admin_block`) [required]
- `source` (enum: `owner`, `admin`, `system`) [required]
- `booking_request` (relation → booking_request) [nullable]
- `booking` (relation → booking) [nullable]
- `reason` (string) [nullable]
- `created_by_user` (relation → users-permissions user) [nullable]
- `created_at`, `updated_at` (system)

**Indexes**
- B-tree: `(boat_id, start_at, end_at)`
- GIST: `(boat_id, tstzrange(start_at, end_at))` — критично

**Constraints (DB-level)**
- `start_at < end_at`
- Пересечения блоков допустимы только если kind позволяет (в MVP: запрещаем пересечения любых blocks с active bookings и system holds)
- Реализация через транзакции + overlap check (и/или exclusion constraint на range)

---

### 4.3 BookingRequest
Назначение: заявка клиента на аренду (до подтверждения и/или оплаты).

**Fields**
- `boat` (relation → boat) [required]
- `customer` (relation → users-permissions user) [required]
- `status` (enum) [required]
  - `draft`
  - `submitted`
  - `owner_approved`
  - `owner_rejected`
  - `cancelled`
  - `expired`
  - `payment_pending` (зарезервировано под этап Payments)
- `start_at` (timestamptz UTC) [required]
- `end_at` (timestamptz UTC) [required]
- `guests` (int) [nullable]
- `notes` (text) [nullable]
- `contact_phone` (string) [nullable] (PII)
- `contact_email` (string) [nullable] (PII)
- `price_quote_total` (decimal) [nullable]
- `currency` (string ISO 4217, e.g. EUR) [nullable]
- `pricing_snapshot` (json) [nullable]  
  (breakdown: base, extras, discounts, taxes placeholder, fees)
- `policy_snapshot` (json) [nullable]  
  (cancellation, deposit policy, owner rules)
- `expires_at` (timestamptz UTC) [nullable]  
  (для system_hold)
- `created_at`, `updated_at` (system)

**Indexes**
- `(boat_id, status)`
- `(customer_id, created_at)`
- `(status, expires_at)`

**Constraints**
- `start_at < end_at`

---

### 4.4 Booking
Назначение: подтверждённое бронирование (источник правды занятости).

**Fields**
- `boat` (relation → boat) [required]
- `customer` (relation → users-permissions user) [required]
- `status` (enum) [required]
  - `pending_payment`
  - `confirmed`
  - `active`
  - `completed`
  - `cancelled`
  - `refunded`
  - `dispute`
- `start_at` (timestamptz UTC) [required]
- `end_at` (timestamptz UTC) [required]
- `booking_request` (relation → booking_request) [nullable]
- `order` (relation → order) [nullable]
- `pricing_snapshot` (json) [required once confirmed]
- `policy_snapshot` (json) [required once confirmed]
- `created_at`, `updated_at` (system)

**Indexes**
- `(boat_id, status)`
- `(customer_id, created_at)`
- GIST: `(boat_id, tstzrange(start_at, end_at))` — критично

**Constraints**
- `start_at < end_at`
- Запрет пересечений для status in (`pending_payment`, `confirmed`, `active`)

---

### 4.5 BookingEvent (Audit Log)
Назначение: трассировка всех важных действий.

**Fields**
- `entity_type` (enum: `booking_request`, `booking`, `order`, `payment`) [required]
- `entity_id` (string or int) [required]
- `actor_user` (relation → user) [nullable]  
  (system actions допускаются)
- `event_type` (string) [required]
- `payload` (json) [nullable]
- `created_at` (timestamptz)

**Indexes**
- `(entity_type, entity_id, created_at)`

---

### 4.6 NotificationOutbox
Назначение: надёжная отправка уведомлений (email/SMS/telegram) с ретраями.

**Fields**
- `channel` (enum: `email`, `sms`, `telegram`, `webhook`) [required]
- `type` (string) [required]
- `to` (string) [required]
- `payload` (json) [required]
- `status` (enum: `pending`, `sent`, `failed`) [default `pending`]
- `attempts` (int) [default 0]
- `next_retry_at` (timestamptz) [nullable]
- `last_error` (text) [nullable]
- `created_at`, `updated_at`

**Indexes**
- `(status, next_retry_at)`

---

## 5. Payments (MVP-ready, Rent only)

### 5.1 Order
Назначение: коммерческий источник правды для денег.

**Fields**
- `booking` (relation → booking) [required]
- `customer` (relation → user) [required]
- `status` (enum) [required]
  - `created`
  - `payment_pending`
  - `paid`
  - `failed`
  - `cancelled`
  - `refunded`
  - `payout_pending`
  - `payout_done`
- `amount_total` (decimal) [required]
- `amount_platform_fee` (decimal) [required]
- `amount_owner_net` (decimal) [required]
- `currency` (string ISO 4217) [required]
- `pricing_snapshot` (json) [required]
- `provider` (enum: `stripe`, `other`) [nullable]
- `created_at`, `updated_at`

**Indexes**
- `(customer_id, created_at)`
- `(status, created_at)`

---

### 5.2 Payment
**Fields**
- `order` (relation → order) [required]
- `provider` (enum) [required]
- `provider_payment_intent_id` (string) [required]
- `status` (enum: `requires_action`, `succeeded`, `failed`, `refunded`) [required]
- `amount` (decimal) [required]
- `currency` (string) [required]
- `raw` (json) [nullable]
- `created_at`, `updated_at`

**Indexes**
- unique `(provider, provider_payment_intent_id)`

---

### 5.3 Payout
**Fields**
- `order` (relation → order) [required]
- `owner_user` (relation → user) [required]
- `provider_transfer_id` (string) [nullable]
- `status` (enum: `pending`, `done`, `failed`) [required]
- `amount` (decimal) [required]
- `currency` (string) [required]
- `raw` (json) [nullable]
- `created_at`, `updated_at`

**Indexes**
- `(owner_user_id, created_at)`

---

### 5.4 LedgerEntry
Назначение: бухгалтерская трассируемость.

**Fields**
- `order` (relation → order) [required]
- `type` (enum: `charge`, `platform_fee`, `payout`, `refund`, `adjustment`) [required]
- `amount` (decimal) [required]
- `currency` (string) [required]
- `meta` (json) [nullable]
- `created_at`

**Indexes**
- `(order_id, created_at)`

---

## 6. PII & Security

PII поля (минимизировать хранение):
- `BookingRequest.contact_phone`
- `BookingRequest.contact_email`
Рекомендации:
- ограничить выдачу этих полей публичным API
- хранить только то, что нужно для операционного процесса
- аудитировать доступ (через роли)

---

## 7. i18n Considerations

- Технические сущности booking/payments **не локализуются**.
- Локализуется только Catalog (boats, pages, labels).
- В UI тексты/статусы локализуются на фронтенде.

---

## 8. DB-level Integrity (Mandatory)

Минимальный набор гарантий:
- `start_at < end_at` для blocks/requests/bookings
- индексы для фильтрации и пересечений
- overlap protection:
  - запрет пересечений для bookings in confirmed/active/pending_payment
  - system_hold должен конфликтовать с confirmed/active

Реализация:
- PostgreSQL range + GIST
- транзакции на создании request/booking/block

---

## 9. Implementation Notes (Strapi v4)

- Для инвариантов (пересечения/статусы/платежи) — только custom controllers/services.
- Стандартные CRUD эндпоинты Strapi не использовать для операций, которые требуют транзакций и guards.
- Включить audit log и outbox на уровне сервисов.

---
