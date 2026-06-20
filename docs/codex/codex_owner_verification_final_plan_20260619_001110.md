# Sharmar Marketplace — Owner Verification Final Plan Only

Mode:
PLANNING ONLY.

Do not modify files.
Do not create files.
Do not delete files.
Do not run deploy.
Do not change database.
Do not change server.
Do not implement code yet.

Goal:
Prepare the final safe implementation plan for owner document verification.

Production rule:
Do not break:
- Dodo
- webhook
- payment intent
- hold logic
- booking_requests
- calendar
- boat schema
- owner login
- owner registration
- boat image upload

Known production facts:
1. Registration owner flow is committed and working.
2. Owner dashboard works.
3. Strapi production runtime uses cms_green.
4. owner_profile has user relation named user.
5. owner_profile has verification fields.
6. Server already added document media fields:
   - passport_document
   - identity_document
   - license_document
7. Strapi media relations are stored in files_related_mph.
8. GET /api/owner/profile-by-user works.
9. POST /api/owner/profile-create-for-user works.
10. A previous new route attempt returned 405 and was removed.
11. Do not create random routes.

Required final architecture:
Owner dashboard
→ Next.js route /api/owner/documents
→ Strapi Upload /api/upload
→ receive file_id
→ Strapi route POST /api/owner/profile-document-attach
→ attach file to owner_profile
→ set verification_status = documents_uploaded
→ dashboard reloads profile-by-user

Inspect local files:
- frontend/app/api/owner/uploads/route.ts
- frontend/app/api/owner/dashboard/route.ts
- frontend/app/[lang]/owner-dashboard/OwnerDashboardClient.tsx
- frontend/app/api/auth/owner-session/cookies.ts
- frontend/app/api/auth/owner-register/route.ts
- frontend/app/api/owner/boats
- frontend/app/api/owner/my-boats
- docs/codex/codex_owner_verification_diagnostic_20260618_235447.md

Use the existing /api/owner/uploads route only as a reference.
Do not change it in the final plan unless there is no safer alternative.

Plan must include:

1. Exact server files to create or modify in cms_green.
2. Exact local frontend files to create or modify.
3. Exact request/response contract for /api/owner/documents.
4. Exact request/response contract for Strapi /api/owner/profile-document-attach.
5. Token/authentication design.
6. MIME and file size rules.
7. How dashboard should show:
   - uploaded passport status
   - uploaded identity document status
   - optional license status
   - verification_status
8. How admin manually approves owner in Strapi.
9. What must be tested after each step.
10. Rollback plan for each step.
11. Deployment order.
12. Final checklist before touching boat publication restrictions.

Important:
The plan must be production-safe and step-by-step.
No code implementation.
No commands that modify files.
No deployment commands.
Only the plan.

Output format:
- Short conclusion first.
- Then numbered implementation plan.
- Then risks.
- Then rollback.
- Then test checklist.
