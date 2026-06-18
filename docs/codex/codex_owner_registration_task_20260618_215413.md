# Sharmar Owner Registration Phase 1

## Context

Project: Sharmar Marketplace production frontend/backend integration.

Current branch:
owner-registration-phase-1

Current stable commit:
4d83b90 Prepare owner profile dashboard foundation

Existing owner flow:
- Owner login page exists: frontend/app/[lang]/owner-login
- Owner dashboard exists: frontend/app/[lang]/owner-dashboard
- Owner session route exists: frontend/app/api/auth/owner-session/route.ts
- Owner dashboard API exists: frontend/app/api/owner/dashboard/route.ts
- Owner profile is already connected to dashboard as ownerProfile
- Strapi has internal route: /api/owner/profile-by-user?user_id=...
- Production uses languages: en, ru, me

Goal:
Implement owner self-registration safely without breaking existing owner login/dashboard.

## Do not modify

Do not modify:
- payment logic
- booking logic
- Dodo logic
- boat creation API
- Strapi schemas
- existing owner login behavior except adding a link to registration if safe
- geography data
- unrelated pages

## Required implementation

Create a minimal owner registration flow:

1. New page:
frontend/app/[lang]/owner-register/page.tsx

2. New client form:
frontend/app/[lang]/owner-register/OwnerRegisterForm.tsx

3. New API route:
frontend/app/api/auth/owner-register/route.ts

4. Registration fields:
- first_name
- last_name
- email
- whatsapp_number
- password
- confirm_password
- preferred_language inferred from URL lang
- accept_terms checkbox

5. API behavior:
- validate required fields
- validate email format
- validate password length >= 8
- confirm password match
- require accept_terms true
- call Strapi /api/auth/local/register
- create owner_profile linked to new user using an internal Strapi owner-profile route only if such route already exists
- if owner_profile creation is not possible without new Strapi code, return success with clear TODO comment and do not break registration
- create owner session cookie using same cookie behavior as existing owner-session route if registration succeeds
- return JSON errors with stable codes

6. UI behavior:
- fully localized in en, ru, me
- after successful registration redirect to /[lang]/owner-dashboard
- add a link from owner-login to owner-register
- add a link from owner-register back to owner-login
- show clear validation errors

7. Security:
- do not expose STRAPI_TOKEN to browser
- use server-side API route only
- no logging passwords
- do not store password anywhere except Strapi registration call
- keep existing owner login working

8. Build must pass:
npm --prefix frontend run build

## After implementation

Print:
- files changed
- commands run
- any TODOs
- whether owner_profile auto-creation is implemented or pending
