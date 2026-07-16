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

### C.1) Production CMS green deployment and runtime secrets

Production Strapi green uses an external runtime env file:

- `/opt/sharmar/app/shared/cms_green.env`

This file exists only on production. It is created during bootstrap from the
existing protected runtime env file, with the same secret values, restrictive
permissions, and checksum verification. Secret values are never stored in Git.

The green Compose file may keep the absolute `env_file` path, but it must never
contain secret values. It must also keep the payments env file reference:

- `/opt/sharmar/app/shared/cms_green.env`
- `.env.strapi_green_payments`

Local `shared/*.env` files are intentionally blocked by the root `.gitignore`.
Do not use `git add -f` for any env file. Before every deployment commit, run a
staged secret scan and verify that no `.env`, `cms_green.env`, backup env, or
archive with secrets is staged.

Dry-run is the default and performs local validation plus read-only production
baseline only:

```bash
scripts/deploy-cms-green.sh \
  --server root@91.98.125.132 \
  --commit <full-sha> \
  --dry-run
```

Production apply requires both `--apply` and the explicit confirmation marker:

```bash
SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES \
scripts/deploy-cms-green.sh \
  --server root@91.98.125.132 \
  --commit <full-sha> \
  --apply
```

Bootstrap of `/opt/sharmar/app/shared/cms_green.env` is separate and must not be
used for ordinary deployments. Use it only when the external env file is missing
and the existing protected runtime env is still present in the active CMS source:

```bash
SHARMAR_PRODUCTION_DEPLOY_CONFIRM=YES \
scripts/deploy-cms-green.sh \
  --server root@91.98.125.132 \
  --commit <full-sha> \
  --apply \
  --bootstrap-external-env
```

For production CMS source swaps, the tracked deployment flow is:

1. Create and verify backups for PostgreSQL, uploads, active CMS source, Compose,
   and the protected env file.
2. Ensure `/opt/sharmar/app/shared/cms_green.env` already exists for ordinary
   deployment, is owned by root, is mode `600` or `400`, is readable by the CMS
   service, and has required non-empty Strapi secret keys.
3. Check required secret keys by name and non-empty status only. Never print
   values.
4. Use tracked `docker-compose.green.yml` as source of truth. Validate that it
   contains the absolute external env path and preserves `.env.strapi_green_payments`.
5. Build the staged CMS source from a local `git archive` of the exact Git
   commit; do not rely on the production server having that commit.
6. Run the pre-switch secret, health, Compose, backup, and database-count gates
   before source swap.
7. Preserve the previous source, switch to the staged source, recreate only
   `sharmar_strapi_green`, then verify health, schema, and database counts.
8. Automatically roll back if any post-switch gate fails: recreate failure,
   restart loop, health timeout, local/public API failure, schema failure, or
   database count mismatch. Rollback restores the previous CMS source, restores
   the previous Compose if this run changed it, recreates only
   `sharmar_strapi_green`, and keeps the failed source and backups for diagnosis.

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
