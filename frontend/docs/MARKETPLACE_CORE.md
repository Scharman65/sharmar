# MARKETPLACE_CORE — Sharmar

Архитектурный контракт ядра маркетплейса Sharmar.
Определяет подсистемы, границы ответственности, инварианты и стратегию эволюции.

Дата: Jan 2026

---

## 1. Goals

- Эволюция Sharmar от каталога к маркетплейсу без простоя.
- Надёжная модель доступности и бронирований.
- Платёжный контур, готовый к EU-масштабу.
- Строгая SEO-совместимость (категории и карточки).
- Additive-first миграции без ломки текущего продакшна.

---

## 2. Bounded Contexts

### 2.1 Catalog
Сущности: boats, media, marinas/locations, brands, i18n localizations.  
Назначение: SEO-ориентированный каталог и карточки.  
Инварианты:
- slug — единственный публичный идентификатор.
- локали связаны через document_id (Strapi i18n).
- publishedAt управляет публичной видимостью.

### 2.2 Search & Filters
Назначение: нормализация query, контролируемые параметры, масштабируемая фильтрация.
Инварианты:
- разрешён только whitelist параметров.
- порядок параметров фиксирован.
- параметрические URL не индексируются (canonical/noindex policy).

### 2.3 Availability
Назначение: правила доступности + блокировки.
Инварианты:
- нет пересечений занятости по лодке (DB-level guard).
- хранение интервалов в UTC (timestamptz).

### 2.4 Booking
Назначение: заявки и подтверждённые бронирования.
Инварианты:
- BookingRequest может создавать system hold (expires).
- Booking является источником правды “занято” после подтверждения.

### 2.5 Approvals & Audit
Назначение: state machine, audit, уведомления.
Инварианты:
- все переходы статусов только через backend команды.
- все важные действия логируются в audit trail.
- уведомления идут через outbox (надёжность).

### 2.6 Payments
Назначение: заказы/оплаты/выплаты/комиссии/возвраты.
Инварианты:
- деньги живут в Order + LedgerEntry.
- provider webhooks идемпотентны.
- payout отделён от charge (готовность к escrow/hold).

---

## 3. Core Invariants

### 3.1 Time
- В базе: UTC timestamptz.
- Для каждой лодки хранится IANA timezone (например Europe/Podgorica).
- UI конвертирует в локальную TZ лодки/пользователя, но конфликты считаются в UTC.

### 3.2 Overlaps
- Запрещены пересечения для:
  - confirmed/active bookings
  - system holds
  - owner/admin blocks
- Реализация: PostgreSQL range (tstzrange) + GIST + транзакции.

### 3.3 Money
- Order = коммерческий источник правды.
- LedgerEntry = учёт всех денежных событий.
- Webhook events обрабатываются идемпотентно, повторная доставка допустима.

### 3.4 SEO
- Индексируются только:
  - категории (фиксированные маршруты)
  - карточки лодок (slug)
- Фильтры с query params:
  - canonical на категорию или noindex (политикой)

---

## 4. Evolution Strategy (Additive-first)

Порядок внедрения:
1) Filters hardening (индексы, SEO policy, нормализация)
2) Availability + Blocks (owner blocks, публичное чтение)
3) BookingRequests + Approvals (state machine + outbox)
4) Orders/Payments (canary) + ledger + webhooks
5) Payouts/escrow policies + масштабирование

Принципы:
- новые сущности добавляются без изменения существующих.
- фича-флаги управляют включением UI и API.
- любой рискованный шаг имеет backup reference.

---

## 5. Production Safety Rules

- никаких schema-breaking изменений без крайней необходимости.
- любые миграции только после бэкапа.
- включение Payments — только canary rollout.
- отключение по флагу должно возвращать систему к режиму “каталог + заявки” без простоя.

---
