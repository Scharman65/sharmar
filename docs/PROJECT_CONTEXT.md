# Project Context — Sharmar

This file is the persistent memory of the project.
It is used when starting a new chat to restore full technical context.

---

## 1) Project identity

Name: Sharmar  
Type: professional marketplace (boat/yacht rental and sale)  
Status: production online, active development

Domains:
- Frontend: Next.js
- Backend: Strapi
- Database: PostgreSQL
- Infra: Docker Compose, Hetzner VM, Nginx, Cloudflare
- Local dev: macOS workstation

Core priorities:
- 24/7 uptime
- data integrity
- SEO-first structure
- multilingual support (en / ru / sr-Latn-ME)
- scalability

---

## 2) Architecture (high level)

- Next.js frontend (SEO pages, marketplace UI)
- Strapi CMS (content + API)
- PostgreSQL (single source of truth)
- Media via Strapi uploads
- Nginx as reverse proxy
- Cloudflare for DNS/CDN/edge
- Docker Compose on Hetzner

Frontend consumes Strapi API directly.

---

## 3) Production rules

- Never change production without rollback path.
- Backup before:
  - mass data changes
  - schema changes
  - media operations
- Any risky operation must follow docs/OPERATIONS.md.
- Any structural decision must be documented in docs/ADR.

---

## 4) Operational assets in repo

- docs/OPERATIONS.md — production runbook
- docs/WORKFLOWS.md — GPT workflows and prompts
- docs/GPT_START.md — start block for new chats
- scripts/backup.sh — backups
- scripts/restore.sh — restore
- scripts/healthcheck.sh — prod health
- scripts/fastcheck.sh — local fast verification

---

## 5) Current confirmed state

- Marketplace is live.
- Strapi + Postgres are running in Docker.
- Frontend builds and typecheck passes.
- fastcheck baseline is green.
- GPT workflows and runbooks are committed.

Baseline commit:
- 6355bfc — GPT workflows, operations runbook, fastcheck.

---

## 6) Non-negotiable constraints

- Do not break SEO routing.
- Do not break locale bindings.
- Do not break Strapi relations and media links.
- Prefer additive changes over destructive ones.
- Avoid downtime.

---

## 7) How new chats must start

Every new chat must begin with:

1) docs/GPT_START.md  
2) this file (PROJECT_CONTEXT.md)  
3) a short handoff of the current task

Then explicitly choose:
ARCHITECT MODE / IMPLEMENT MODE / OPS MODE.
