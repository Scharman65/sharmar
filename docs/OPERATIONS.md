# Sharmar — Operations Runbook (Prod-safe)

This document is the single source of truth for safe operational changes.
Priority order: Uptime > Data integrity > Security > SEO/i18n > Features.

## 0) Golden rules (non-negotiable)

- Never apply changes to production without a rollback plan.
- Always take a fresh backup before any risky operation (DB or uploads or schema/data fixes).
- One change at a time. Validate. Then proceed.
- Never paste secrets/tokens into chats or commit them to git.
- Prefer additive changes; avoid destructive changes unless explicitly planned and backed up.
- For Strapi content/data fixes: validate relations and media links.

## 1) Environments

- Local dev: macOS workstation
- Production: Hetzner VM (Docker Compose)
- Edge: Cloudflare
- Reverse proxy: Nginx

## 2) Standard pre-flight checklist (before any change)

1. Confirm current status:
   - Site pages open (public)
   - Strapi API responds
   - Containers healthy
2. Confirm you can rollback:
   - Latest backup exists and is readable
   - You know the exact command to restore
3. Confirm scope:
   - What exactly changes?
   - Which services affected? (frontend / strapi / db / nginx)
   - Any SEO/i18n impact?

## 3) Backups (required)

Use repo scripts.

- Full backup:
  - scripts/backup.sh
- Verify backup artifacts:
  - DB dump file exists and non-empty
  - uploads archive exists (even if empty)

## 4) Restore (rollback path)

Use repo scripts.

- Full restore:
  - scripts/restore.sh
- Post-restore validation:
  - Strapi boots
  - Public pages load
  - A known boat page renders in each locale

## 5) Health checks (after each step)

- scripts/healthcheck.sh

Additionally validate:
- Strapi API for boats list in each locale
- One boat card renders on web
- Filters render (marina/location) where applicable

## 6) Change types and safe procedure

### A) Frontend change (Next.js)
1. Create local branch.
2. Typecheck:
   - npx tsc --noEmit
3. Build locally if needed.
4. Deploy with your standard flow.
5. Verify pages and SEO-critical routes.
6. If broken: rollback immediately.

### B) Strapi content change (Admin UI)
1. Backup first if change is mass-edit / delete.
2. Prefer draft edits + publish.
3. Validate locales and media relations.
4. Verify API output in each locale.

### C) Strapi schema / code change
1. Backup (DB + uploads).
2. Apply change in small increments.
3. Run migrations (if any) with transaction where possible.
4. Restart containers.
5. Healthcheck + smoke tests.
6. Rollback if any errors.

### D) Database data fix (SQL)
1. Backup.
2. Run read-only diagnostics first.
3. Apply changes inside a transaction where possible.
4. Validate counts and key relations.
5. Commit only after verification.
6. Document the operation in docs/ADR.

## 7) SEO / i18n invariants

- Slugs must be stable. If a slug changes, ensure redirects.
- hreflang must remain correct across locales.
- Avoid creating indexable duplicate pages.
- Do not break canonical URLs.

## 8) Incident response (quick)

1. Stop the bleeding:
   - If deploy broke production: rollback immediately.
2. Capture evidence:
   - container logs
   - last deploy commit hash
3. Restore last known good backup if data corruption suspected.
4. Write a short ADR entry with root cause and fix.

## 9) ADR requirement

Any of these MUST produce a new ADR note in docs/ADR:
- Mass data delete/update
- Schema changes
- i18n model changes
- SEO routing changes
- Nginx/Cloudflare changes
