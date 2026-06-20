# ADR — Marina SEO Scaling Architecture

## Status
Accepted

## Goal

Scale Sharmar from:
- individual boat pages

to:
- marina marketplace architecture across the Mediterranean.

This phase is SEO-first and conversion-safe.

No booking/payment logic changes are allowed in this phase.

---

# Current Stable Foundation

Production already includes:

- booking request flow
- Stripe authorization flow
- anti-double-booking foundation
- owner approval flow
- multilingual routing
- localized boat pages
- duration booking UX
- mobile conversion layer
- premium reservation request UX

These systems are considered stable.

---

# Marina SEO Strategy

Sharmar will scale using:

- marina landing pages
- regional category pages
- multilingual indexed routes
- localized marina content
- internal linking architecture
- SEO-safe expansion

Examples:

/en/marina/porto-montenegro
/en/marina/budva-marina
/en/marina/tivat
/en/rent/motor/tivat
/en/rent/catamaran/budva

Future locales:

/ru/marina/porto-montenegro
/me/marina/porto-montenegro
/de/marina/porto-montenegro
/it/marina/porto-montenegro

---

# Marketplace Positioning

Sharmar is evolving toward:

- Mediterranean yacht marketplace
- premium charter discovery platform
- marina-centered booking ecosystem

NOT:
- generic classifieds
- low-trust listing directory

---

# SEO Rules

All marina pages must include:

- unique metadata
- unique H1
- unique intro copy
- structured internal links
- canonical handling
- localized metadata
- schema-ready structure

Avoid:
- duplicate thin pages
- auto-generated spam pages
- empty marina routes

---

# Technical Constraints

This phase must NOT modify:

- Stripe flow
- booking APIs
- hold system
- payment lifecycle
- owner confirmation flow
- database schema
- reservation locking logic

Frontend additive changes only.

---

# Planned Marina Structure

Examples:

/[lang]/marina/[slug]
/[lang]/rent/[type]/[marina]
/[lang]/sale/[type]/[marina]

Potential future filters:

- skipper included
- luxury
- family
- fishing
- daily charter
- weekly charter

---

# Future Scaling

Future phases MAY include:

- marina CMS blocks
- AI-generated localized descriptions
- owner onboarding funnels
- marina analytics
- SEO sitemap automation
- review aggregation
- Google Maps integration
- dynamic regional landing pages

---

# Business Impact

This phase increases:

- Google index coverage
- organic traffic
- owner acquisition
- investor perception
- marketplace valuation
- Mediterranean scalability

