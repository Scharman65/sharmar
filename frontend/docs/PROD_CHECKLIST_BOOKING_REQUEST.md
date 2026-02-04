# PROD CHECKLIST — Booking Request Flow (Next.js → Strapi → Postgres)

Date: 2026-02-01  
Scope: Next.js `/api/request` → Strapi `POST /api/booking-requests-idempotent` → Postgres `public.booking_requests`  
Goal: strict idempotency via `public_token` (same token never creates duplicates; returns same id)

---

## 0) Preconditions (do not skip)
- Backups exist on prod:
  - `/root/backups/sharmar/schema_20260201_162126.sql`
  - `/root/backups/sharmar/OPS_NOTES_idempotency_fix_20260201_163456.md`
- DB has:
  - `booking_requests.public_token` (nullable)
  - unique partial index on `public_token` where not null
  - columns `fingerprint`, `source_ip`, `user_agent` exist (nullable)

---

## 1) Local preflight (frontend)
From: `~/Projects/sharmar/frontend`

1. Ensure secrets are not tracked:
   - `.env.local` must not be committed.
2. Typecheck:
   - `npx tsc --noEmit`
3. Working tree clean:
   - `git status`

Expected:
- no `.env.local` in git
- typecheck passes
- clean working tree

---

## 2) Prod preflight (read-only sanity)
From your laptop:

1) Admin is reachable:
- `curl -sS -I https://api.sharmar.me/admin | sed -n '1,20p'`

Expected: HTTP 200

2) Idempotent endpoint works (same token twice):
- Use a single `public_token` and POST twice to:
  - `POST https://api.sharmar.me/api/booking-requests-idempotent`

Expected:
- first call: 201 Created (or 200 OK) with `id`
- second call: 200 OK with the same `id`

---

## 3) DB verification (prod)
On prod server:

A) No duplicate tokens:
- `SELECT public_token, count(*) FROM booking_requests GROUP BY 1 HAVING count(*) > 1;`

Expected: 0 rows

B) For a chosen sanity token `TOKEN`, exactly one row:
- `SELECT public_token, count(*) FROM booking_requests WHERE public_token = '<TOKEN>' GROUP BY 1;`

Expected: count = 1

---

## 4) Frontend prod verification (after deploy)
1) Open request page:
- `/en/request?slug=<boat>&title=<title>`

2) Submit request once:
Expected:
- navigates to `/en/thanks`
- no retry spam
- server returns `{ ok:true, id, token }`

3) Retry scenario (refresh/second submit for same slot):
Expected:
- does NOT create a second row
- returns same `id` for same `public_token`

---

## 5) Rollback plan
Frontend:
- rollback to previous Vercel deployment (known-good commit)

Backend/DB:
- No rollback required (additive changes), but schema dump exists if needed.

### Verify production is on the expected commit (cache-bust)
Static `public/version.txt` can be CDN-cached. Always verify with a cache-busting query param:

```bash
set -euo pipefail
curl -sS "https://www.sharmar.me/version.txt?ts=$(date +%s)"


# Expected:
# - short=<expected_commit>
# - utc is recent

```

