Короткий вывод: наиболее вероятно, что `/ru/boats` и `/en/boats` падают не из-за сборки, а из-за runtime-запроса к Strapi. Страница напрямую вызывает `fetchBoats()`, а тот без защитного слоя падает на любом `500/HTML/non-JSON` ответе API. Локальная сборка проходит, потому что эти страницы `force-dynamic` и не обязаны выполнять production fetch во время build.

Я ничего не менял. Production HTTP проверить из sandbox не удалось: DNS не резолвит `sharmar.me` и `api.sharmar.me`, поэтому вывод по production основан на вашей диагностике и чтении кода.

**Критические Проблемы**

1. **Падение `/[lang]/boats` при любом сбое Strapi**
   - Файл: [frontend/app/[lang]/boats/page.tsx](/Users/rs/Projects/sharmar/frontend/app/[lang]/boats/page.tsx:27)
   - Участок: `const boats = await fetchBoats(lang);`
   - Риск: нет `try/catch`; если `/api/boats` вернул `500`, HTML, nginx error page или невалидный JSON, весь server render падает с digest.
   - Проверка: посмотреть Next/Vercel/server logs по digest `2806737908`; отдельно выполнить `curl -i --globoff 'https://api.sharmar.me/api/boats?populate=*&pagination[pageSize]=20&locale=ru'`.
   - Исправлять потом: сделать безопасный wrapper `getSafeBoats`, логировать ошибку, показывать fallback empty/error state, не валить всю страницу.

2. **`fetchBoats` не устойчив к non-JSON ответу**
   - Файл: [frontend/lib/strapi.ts](/Users/rs/Projects/sharmar/frontend/lib/strapi.ts:50)
   - Участок: `strapiFetch`, `strapiFetchWithFallback`, `fetchBoats`
   - Риск: `strapiFetch` бросает на `!res.ok`, а `res.json()` бросит на HTML/non-JSON даже при `200`. Ваш `python3 -m json.tool` уже показал, что production API вернул не JSON.
   - Проверка: `curl -i` и проверить `status`, `content-type`, первые 500 байт body.
   - Исправлять потом: читать `text`, парсить JSON в `try/catch`, возвращать typed error; fallback на `[]` для public listing pages.

3. **Strapi source не содержит production-critical endpoints**
   - Файл: `cms/src/api/*`
   - Участок: отсутствуют `/api/hold`, `/api/payments/intent`, `/api/payments/webhook`, `/api/bookings`, `/api/availability/:boatId`, `/api/owner/boats-by-user`, `/api/boats-owner-contact-by-slug`.
   - Риск: production поведение, особенно booking/payment/anti-double-booking, не воспроизводится из репозитория. Это опасный дрейф source от production.
   - Проверка: сравнить production container filesystem/commit с текущей веткой; `find cms/src/api -maxdepth 2 -type d`.
   - Исправлять потом: зафиксировать реальные Strapi custom controllers/routes/schemas в ветке, без миграций, сначала staging.

4. **Схема `boat` не совпадает с owner create payload**
   - Файл: [frontend/app/api/owner/boats/route.ts](/Users/rs/Projects/sharmar/frontend/app/api/owner/boats/route.ts:304), [cms/src/api/boat/content-types/boat/schema.json](/Users/rs/Projects/sharmar/cms/src/api/boat/content-types/boat/schema.json:273)
   - Участок: frontend пишет `owner_email`, `owner_user_email`, `booking_enabled`, `instant_booking`, но schema содержит только `owner_phone/whatsapp/viber`, `contacts_visible`, flags/prices.
   - Риск: create/update может падать в production или держаться на ручных DB-колонках вне schema.
   - Проверка: POST тест в staging с минимальным owner payload; сравнить Strapi content-type schema с DB columns.
   - Исправлять потом: привести schema и frontend contract к одному источнику правды.

5. **Booking request schema не совпадает с booking flow**
   - Файл: [frontend/app/api/request/route.ts](/Users/rs/Projects/sharmar/frontend/app/api/request/route.ts:605), [cms/src/api/booking-request/content-types/booking-request/schema.json](/Users/rs/Projects/sharmar/cms/src/api/booking-request/content-types/booking-request/schema.json:44)
   - Участок: frontend отправляет `public_token`, суммы, fingerprint, source_ip, user_agent; schema их не описывает.
   - Риск: idempotency/status/payment reconciliation не гарантированы репозиторием.
   - Проверка: в staging создать request и проверить, какие поля реально сохраняются.
   - Исправлять потом: добавить schema/migrations только после backup и staging verification.

6. **Payment route раскрывает внутренние детали при ошибке**
   - Файл: [frontend/app/api/payments/intent/route.ts](/Users/rs/Projects/sharmar/frontend/app/api/payments/intent/route.ts:85)
   - Участок: response содержит `STRAPI_BASE` и `detail` со stack/message.
   - Риск: утечка внутренней архитектуры и потенциально секретных деталей.
   - Проверка: искусственно сломать upstream в staging.
   - Исправлять потом: клиенту отдавать generic error, детали только в server logs.

7. **Owner image ownership не проверяется**
   - Файл: [frontend/app/api/owner/uploads/route.ts](/Users/rs/Projects/sharmar/frontend/app/api/owner/uploads/route.ts:176), [frontend/app/api/owner/boats/route.ts](/Users/rs/Projects/sharmar/frontend/app/api/owner/boats/route.ts:356)
   - Участок: upload через server token, create принимает любые `imageIds`.
   - Риск: владелец может подставить чужой media ID.
   - Проверка: owner A upload, owner B attach same media id в staging.
   - Исправлять потом: привязывать uploaded media к owner/session и проверять ownership перед attach.

**Средние Проблемы**

1. **Owner login и BoatForm используют разные хранилища токена**
   - Файл: [frontend/app/[lang]/owner-login/OwnerLoginForm.tsx](/Users/rs/Projects/sharmar/frontend/app/[lang]/owner-login/OwnerLoginForm.tsx:95), [frontend/components/boat-form/BoatForm.tsx](/Users/rs/Projects/sharmar/frontend/components/boat-form/BoatForm.tsx:400)
   - Риск: login ставит httpOnly cookie, форма ищет `localStorage.owner_jwt`; upload/save может не работать.
   - Проверка: войти owner, открыть list-your-boat, попробовать upload/save.
   - Исправлять потом: API routes должны полагаться на cookie; убрать обязательный localStorage token.

2. **`apiPayload` не зависит от `uploadedImages`**
   - Файл: [frontend/components/boat-form/BoatForm.tsx](/Users/rs/Projects/sharmar/frontend/components/boat-form/BoatForm.tsx:352)
   - Риск: `imageIds` может быть stale из-за отсутствия `uploadedImages` в dependency list.
   - Проверка: загрузить фото и сразу сохранить; проверить payload.
   - Исправлять потом: добавить зависимость и/или формировать payload прямо в `onSubmit`.

3. **`populate=*` на public listing**
   - Файл: [frontend/lib/strapi.ts](/Users/rs/Projects/sharmar/frontend/lib/strapi.ts:197)
   - Риск: тяжелый запрос, тянет лишние relations/media, сильнее падает от битых связей и прав доступа.
   - Проверка: сравнить `populate=*` с явным `populate[cover]`, `populate[purposes]`, `populate[home_marina]`.
   - Исправлять потом: перейти на явный populate и fields.

4. **Detail page тоже падает от fetch errors**
   - Файл: [frontend/app/[lang]/boats/[slug]/page.tsx](/Users/rs/Projects/sharmar/frontend/app/[lang]/boats/[slug]/page.tsx:154)
   - Риск: `generateMetadata` и page вызывают `fetchBoatBySlug`; API сбой валит страницу до fallback “Boat not found”.
   - Проверка: временно получить 500 от Strapi в staging.
   - Исправлять потом: safe fetch для metadata/page; `notFound` только для валидного empty result.

5. **Media validation слабая**
   - Файл: [frontend/lib/strapi.ts](/Users/rs/Projects/sharmar/frontend/lib/strapi.ts:164), [frontend/next.config.ts](/Users/rs/Projects/sharmar/frontend/next.config.ts:8)
   - Риск: `cover` schema разрешает files/videos/audios; external host кроме `api.sharmar.me` не разрешен Next Image.
   - Проверка: найти лодки с cover mime не image или URL на другом host.
   - Исправлять потом: фильтровать `mime.startsWith("image/")`, разрешить только ожидаемые hosts.

6. **Payment UI смешивает Stripe и Dodo**
   - Файл: [frontend/app/[lang]/payments/[public_token]/page.tsx](/Users/rs/Projects/sharmar/frontend/app/[lang]/payments/[public_token]/page.tsx:5)
   - Риск: код всё еще грузит Stripe SDK, хотя текущие платежи заявлены как Dodo; выше риск конфигурационных ошибок.
   - Проверка: проверить provider в ответе `/api/payments/intent`.
   - Исправлять потом: разделить Dodo redirect flow и legacy Stripe fallback.

**Слабые Места На Будущее**

- Много `.bak` рядом с production кодом: особенно boats, request, payments, owner routes. Проверка: `find . -name '*.bak*'`. Исправление: вынести в архив вне app/cms или удалить после backup.
- `frontend/src/lib/strapi.ts` дублирует `frontend/lib/strapi.ts` и содержит другой contract с `requiredEnv`. Проверка: `rg "src/lib/strapi"`. Исправление: оставить один модуль.
- Sitemap включает `/[lang]/boats`, но если API упал, SEO ведет на 500. Файл: [frontend/app/sitemap.ts](/Users/rs/Projects/sharmar/frontend/app/sitemap.ts:48). Исправление: listing page должна деградировать до 200 с fallback.
- Robots разрешает всё, включая owner/payment-like публичные страницы. Файл: [frontend/app/robots.ts](/Users/rs/Projects/sharmar/frontend/app/robots.ts:5). Исправление: закрыть приватные/токенизированные маршруты.
- Docker compose описывает только Strapi и DB, frontend/nginx/green-staging assumptions в коде не воспроизводятся. Файл: [docker-compose.yml](/Users/rs/Projects/sharmar/docker-compose.yml:12). Исправление: документировать фактическую production topology.

**Вероятная Причина Падения `/ru/boats` И `/en/boats`**

Самая вероятная цепочка такая: `/[lang]/boats` вызывает `fetchBoats(lang)` → `fetchBoats` идет на `STRAPI_URL/api/boats?populate=*&sort=documentId:asc&locale=ru|en` → production Strapi/nginx возвращает не JSON или ошибочный статус → `strapiFetch` бросает exception → в page нет `try/catch` → Next показывает server-side exception с digest.

Почему главные `/ru` и `/en` работают: homepage использует safe wrapper для featured boats. Файл: [frontend/components/homepage/FeaturedYachts.tsx](/Users/rs/Projects/sharmar/frontend/components/homepage/FeaturedYachts.tsx:53) ловит ошибку и возвращает `[]`, поэтому главная не падает.

**Безопасный План Исправления Без Изменений На Production**

1. Снять read-only диагностику production logs по digest `2806737908`: Next server logs + Strapi logs за тот же timestamp.
2. Выполнить только GET-проверки: `/api/boats` с `locale=ru/en`, с `populate=*`, без populate, с явными populate.
3. В staging воспроизвести текущий production ответ API и проверить, падает ли `/ru/boats`.
4. Подготовить patch только в отдельной ветке: safe `fetchBoats`, явный populate, fallback UI, media validation.
5. Добавить staging smoke: `/ru`, `/en`, `/ru/boats`, `/en/boats`, detail page одной лодки, request/payment/thanks.
6. Отдельно синхронизировать Strapi source с production custom endpoints и DB schema перед любыми миграциями.
7. После staging green: canary/green deploy, проверить `/boats`, затем переключать nginx только по runbook.