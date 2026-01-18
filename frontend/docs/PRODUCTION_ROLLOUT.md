# PRODUCTION_ROLLOUT — Sharmar Marketplace Core

Стратегия внедрения marketplace-ядра в существующий продакшн Sharmar
без простоев, без потери SEO и без риска разрушения базы.

Дата: Jan 2026

---

## 1. Core Principles

- Продакшн всегда имеет приоритет над скоростью.
- Любое внедрение — additive-first.
- Любая новая подсистема может быть:
  - выключена фича-флагом
  - не влиять на существующий каталог
- Любое рискованное изменение имеет:
  - backup
  - план отката
  - health-check критерии

---

## 2. Environments

### 2.1 Production
- https://www.sharmar.me
- https://api.sharmar.me
- реальный SEO-индекс
- реальные данные

### 2.2 Staging (обязателен перед calendar/payments)
Рекомендуется:
- отдельный Strapi instance
- отдельная Postgres БД
- Cloudflare disabled или bypass
- копия продакшн базы (обезличенная)

Назначение:
- тест пересечений
- тест state machine
- тест webhooks
- нагрузочное профилирование

---

## 3. Rollout Layers

### Layer 0 — Baseline hardening (обязателен)
- стабилизация каталога
- индексы для filters
- SEO canonical/noindex политика
- health-checks Strapi/Postgres
- формализация backup-процесса

Без этого следующий слой запрещён.

---

### Layer 1 — Availability foundation
Компоненты:
- AvailabilityRule
- AvailabilityBlock
- public availability read API

Особенности:
- только чтение для public
- owner blocks через admin UI или закрытые endpoints
- никакого влияния на бронирование

Фича-флаг:
- `MARKETPLACE_AVAILABILITY_ENABLED`

Rollback:
- выключение флага → сайт возвращается в каталог-режим

Health-checks:
- нет пересечений
- latency availability API
- ошибки overlap detection = 0

---

### Layer 2 — BookingRequests (no money)
Компоненты:
- BookingRequest
- system_hold
- owner inbox
- audit + outbox

Особенности:
- rental остаётся офлайн
- payment контур выключен
- booking confirmed не создаётся

Фича-флаг:
- `MARKETPLACE_REQUESTS_ENABLED`

Rollback:
- выключение флага → кнопка “запросить” исчезает
- holds чистятся системной задачей

Health-checks:
- holds expire корректно
- нет зависших submitted
- owner inbox работает стабильно

---

### Layer 3 — Commission payment (platform fee only)
Компоненты:
- Order
- Payment
- LedgerEntry
- Stripe Checkout / webhook
- Booking confirmation after fee

Особенности:
- rental payment остаётся офлайн
- платформа принимает только комиссию
- booking.confirmed только после оплаты

Фича-флаг:
- `MARKETPLACE_FEES_ENABLED`

Rollout strategy:
- сначала canary:
  - одна лодка
  - одна категория
  - ручной контроль
- затем расширение

Rollback:
- выключение флага:
  - новые оплаты запрещены
  - существующие заказы обрабатываются до закрытия

Health-checks:
- webhook success rate
- idempotency collisions
- booking confirm errors = 0
- ledger consistency

---

### Layer 4 — Policy hardening
- cancellation rules
- overdue commission handling
- admin enforcement
- owner restrictions

Внедряется только после стабильной Layer 3.

---

## 4. Feature Flags Strategy

Флаги должны быть:
- server-side
- проверяться в каждом command endpoint
- не требовать redeploy для отключения

Минимум:
- MARKETPLACE_AVAILABILITY_ENABLED
- MARKETPLACE_REQUESTS_ENABLED
- MARKETPLACE_FEES_ENABLED

Рекомендуется:
- хранить в БД или env + reload
- логировать смену значений

---

## 5. Backup & Rollback Protocol

Перед каждым этапом:

1) Полный backup:
   - Postgres dump
   - uploads/media archive
2) Git tag:
   - `pre-marketplace-layer-X`
3) Smoke-tests:
   - catalog pages
   - filters
   - admin panel

Rollback всегда должен быть возможен через:
- feature flag OFF
- восстановление backup

Запрещено:
- destructive migrations без полной копии
- “горячие” фиксы без точки возврата

---

## 6. Migration Rules

- Только additive schema changes
- Никаких обязательных полей без backfill
- Индексы добавлять отдельно
- Range/GIST индексы — сначала в staging

Любая миграция сопровождается:
- dry-run отчётом
- оценкой времени
- планом отката

---

## 7. Observability & Health

### 7.1 Metrics
- count of:
  - active holds
  - expired holds
  - confirmed bookings
  - payment failures
- API latency (p95)
- webhook retries

### 7.2 Health endpoints
- /health/catalog
- /health/availability
- /health/booking
- /health/payments

### 7.3 Alerts
- overlap violation attempt
- webhook processing failure
- booking confirm error
- backlog in outbox

---

## 8. SEO & UX Safety

- Никакие marketplace-фичи не должны:
  - менять существующие URL
  - ломать индексацию
  - добавлять crawlable мусорные страницы

- Все новые UI элементы:
  - progressive enhancement
  - graceful fallback при выключенных флагах

---

## 9. Production Readiness Checklist

Перед включением очередного слоя:

- [ ] backup создан и проверен
- [ ] git tag создан
- [ ] фича-флаг по умолчанию OFF
- [ ] overlap protection протестирована
- [ ] error budgets определены
- [ ] логирование включено
- [ ] уведомления работают
- [ ] rollback сценарий проверен

---

## 10. Ownership & Access

- Только admin может:
  - включать marketplace-флаги
  - применять миграции
  - восстанавливать backup

- Все операции:
  - документируются
  - воспроизводимы
  - логируются

---
