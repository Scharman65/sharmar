# Sharmar — GPT Workflows (Fast & Exact)

This document defines how we use ChatGPT (and any GPT from Explore GPTs) for Sharmar.
Goal: fast, production-safe, step-by-step execution with minimal risk.

## 1) Operating modes

### A) ARCHITECT MODE
Use when planning features, data model, SEO/i18n, infrastructure changes.
Output must include:
1) Plan
2) Risks / side effects
3) Safest approach
4) Step-by-step execution (one operation per step)
5) Verification checklist

### B) IMPLEMENT MODE
Use when writing code or making edits.
Rules:
- One operation per step.
- Provide exact file contents when changing files (no partial snippets) if requested.
- Always include a verification command after each change.

### C) OPS MODE
Use for production operations (deploy/rollback/migrations).
Rules:
- Must reference docs/OPERATIONS.md and follow it.
- Always require a fresh backup before risky operations.
- Prefer reversible operations and incremental rollout.

## 2) Default constraints (non-negotiable)

- Never break production uptime.
- Always consider backups, migrations, i18n, SEO, scalability.
- If risk exists: explicitly label it and propose a safer alternative.
- Avoid destructive changes unless explicitly planned and backed up.
- Never request secrets to be pasted in chat; use env vars or local files.

## 3) “Paste-at-start” context block (for new chats)

Paste this block at the start of a new chat:

PROJECT: Sharmar (Next.js frontend + Strapi backend + Postgres, Docker, Hetzner, Nginx, Cloudflare).
REQUIREMENTS: production-safe, 24/7 uptime, backup-first, step-by-step, one operation per step, avoid breaking working systems.
LOCALES: multilingual (en/ru/sr-Latn-ME). SEO is critical.
RULES: Follow docs/OPERATIONS.md for any ops change. Use ADR for risky changes.

## 4) Standard prompts (copy/paste)

### 4.1 Architecture / planning
"Act in ARCHITECT MODE. We need: <goal>. Provide: plan, risks, safest approach, step-by-step, verification. Consider backups/migrations/i18n/SEO/scale."

### 4.2 Implement a code change (frontend/backend)
"Act in IMPLEMENT MODE. Change: <goal>. Provide exactly one step. Include exact command(s) to run and what output to paste back."

### 4.3 Strapi data operation (safe)
"Act in OPS MODE. Task: <data change>. First: diagnostics queries only. Then propose a transaction-safe plan. Require backup. Provide one step at a time."

### 4.4 SQL change with integrity checks
"Act in OPS MODE. Need SQL for: <change>. Must: BEGIN; diagnostics; apply; validation queries; ROLLBACK plan. Consider relations and media tables."

### 4.5 SEO routing change
"Act in ARCHITECT MODE. SEO change: <routes/slugs>. Provide canonical/hreflang impacts, redirect plan, rollout/rollback, and verification steps."

### 4.6 i18n / localization change
"Act in ARCHITECT MODE. i18n change: <fields/locales>. Provide data model impact, migration/backfill plan, and how to validate each locale output."

### 4.7 Incident response
"Act in OPS MODE. Incident: <symptoms>. First: stop-the-bleeding steps. Then: evidence capture commands. Then: rollback/restore plan. One operation per step."

## 5) Verification templates

### Frontend
- npx tsc --noEmit
- build command (project standard)
- curl/rg checks for key routes

### Backend
- container healthcheck
- Strapi API smoke checks per locale

### Database
- counts before/after
- relation integrity spot-checks
- transaction safety when possible
