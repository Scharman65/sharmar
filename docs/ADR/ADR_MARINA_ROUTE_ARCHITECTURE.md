# ADR — Marina Route Architecture

## Status
Accepted

## Goal

Create a scalable marina-centered route architecture for the Sharmar marketplace.

This architecture must support:

- multilingual SEO
- Mediterranean expansion
- marina discovery
- regional landing pages
- organic traffic scaling
- future owner acquisition funnels

without changing the stable booking/payment system.

---

# Existing Stable Production Foundation

Production already includes:

- Stripe authorization flow
- anti-double-booking logic
- booking request lifecycle
- owner approval flow
- multilingual routes
- localized boat pages
- premium mobile UX
- premium reservation request flow

These systems are considered protected production infrastructure.

---

# Route Philosophy

Sharmar is evolving toward:

- marina-first marketplace discovery
- Mediterranean regional marketplace structure
- premium yacht booking platform

NOT:
- generic boat classifieds
- random unstructured listings

---

# Primary Marina Routes

Main marina route:

/[lang]/marina/[slug]

Examples:

/en/marina/porto-montenegro
/en/marina/budva-marina
/en/marina/tivat-marina
/ru/marina/porto-montenegro
/me/marina/budva-marina

---

# Regional Rental Routes

Examples:

/[lang]/rent/motor/[marina]
/[lang]/rent/catamaran/[marina]
/[lang]/rent/sail/[marina]

Real examples:

/en/rent/motor/tivat
/en/rent/catamaran/budva
/en/rent/sail/kotor

---

# Regional Sale Routes

Examples:

/[lang]/sale/motor/[marina]
/[lang]/sale/catamaran/[marina]
/[lang]/sale/sail/[marina]

---

# SEO Rules

Every marina page must include:

- unique title
- unique meta description
- marina intro copy
- internal links
- localized text
- canonical support
- indexable structure

Avoid:

- empty pages
- duplicate pages
- AI spam content
- thin content

---

# Internal Linking Strategy

Marina pages should internally link to:

- boat pages
- regional rent pages
- regional sale pages
- related marinas
- vessel type categories

This creates strong SEO graph structure.

---

# Future Metadata Strategy

Potential future metadata:

- marina country
- marina city
- vessel counts
- charter counts
- premium/luxury classification
- daily vs weekly charter
- skipper availability

---

# Technical Constraints

This phase must NOT modify:

- Stripe flow
- payment lifecycle
- hold logic
- booking APIs
- DB schema
- reservation locking
- owner confirmation lifecycle

Frontend additive architecture only.

---

# Future Scaling Possibilities

Future phases MAY include:

- marina CMS blocks
- marina hero images
- Google Maps integration
- AI localized descriptions
- SEO sitemap automation
- Mediterranean country hubs
- owner onboarding funnels
- review systems
- trust scoring
- analytics dashboards

---

# Business Impact

This architecture increases:

- SEO scalability
- Google index depth
- marketplace discoverability
- owner acquisition potential
- Mediterranean expansion readiness
- investor confidence
- marketplace valuation

