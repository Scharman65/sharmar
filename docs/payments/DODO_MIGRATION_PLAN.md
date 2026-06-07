# Sharmar Dodo Migration Plan

## Цель

Перейти с Stripe capture-flow на Dodo instant-booking flow.

---

# Новая логика

calendar free
→ hold
→ Dodo payment
→ webhook
→ confirmed

---

# Основные правила

- Stripe не удаляется
- Stripe скрывается как legacy fallback
- Dodo становится основным provider
- Owner НЕ подтверждает бронь вручную
- Календарь = источник правды
- Клиент оплачивает только комиссию Sharmar
- Остальная сумма оплачивается owner напрямую
- Контакты владельца открываются клиенту только после успешной оплаты комиссии Sharmar
- Контакты клиента открываются владельцу только после успешной оплаты комиссии Sharmar

---

# Этапы

## Stage 1
Диагностика текущего payment flow

## Stage 2
Добавление PAYMENT_PROVIDER=dodo

## Stage 3
Создание Dodo checkout endpoint

## Stage 4
Frontend redirect на Dodo

## Stage 5
Webhook подтверждения оплаты

## Stage 6
hold → confirmed

## Stage 7
Production testing

## Stage 8
Скрытие Stripe UI

---

# Важные ограничения

- Не ломать текущий Stripe flow
- Не менять production DB schema резко
- Не удалять старые statuses
- Все изменения через feature flags
- Все изменения сначала локально



---

# Contact Unlock Security

- Старый endpoint /boats-owner-contact-by-slug/:slug сейчас публичный
- Старый endpoint нельзя использовать для post-payment доступа
- Новый endpoint должен работать только через public_token
- Контакты owner/client открываются только при confirmed booking
- Проверка доступа должна идти через public.bookings
- Dodo webhook должен переводить booking в confirmed
- Только после confirmed разрешается выдача owner contacts


---

# Dodo Checkout Requirements

- Correct Dodo endpoint: POST /checkouts
- Backend must return checkout_url to frontend
- Checkout requires product_cart
- product_cart requires product_id from Dodo Dashboard
- For Sharmar variable booking commission, use one Dodo one-time product with Pay What You Want enabled
- Send marketplace fee as product_cart amount in minor units, for example 1500 = 15.00 EUR
- Store Dodo session_id/payment_id in public.payments.provider_intent_id or metadata
- Store public_token, booking_request_id, boat_id, marketplace_fee_amount in metadata
- Frontend redirects customer to checkout_url
- Dodo webhook later confirms payment and changes booking to confirmed
