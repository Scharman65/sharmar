# Sharmar Marketplace — Owner Verification Diagnostic Only

Mode:
READ ONLY DIAGNOSTIC.

Do not modify files.
Do not create files.
Do not delete files.
Do not run deploy.
Do not change database.
Do not change Dodo, webhook, hold, bookings, calendar, payments, or boat publication logic.

Project context:
Sharmar is a production marketplace.
Frontend: Next.js 16.
Backend: Strapi v5.
Production backend on server uses cms_green.
Local repository may not contain all server runtime changes.

Current safe local branch:
owner-registration-phase-1

Recent safe commits:
- 7249943 Add owner self registration flow
- 73bdad8 Add Codex planning documents

Current production/server findings:
1. owner_profile exists in cms_green.
2. owner_profile relation to user is named user.
3. owner_profile already has:
   - email_verified
   - whatsapp_verified
   - verification_status
   - documents_uploaded_at
   - verified_at
   - rejected_at
   - rejection_reason
   - notes
4. We added on server:
   - passport_document
   - identity_document
   - license_document
5. Strapi stores media relations in:
   - public.files_related_mph
6. Custom route works:
   - GET /api/owner/profile-by-user?user_id=1
7. New route attempt did not work:
   - POST /api/owner-profile/document-attach returned 405
   - POST /api/owner/profile-document-attach returned 405
8. Broken route was removed from server.
9. Do not repeat random route creation.

Task:
Diagnose the correct and safest architecture for owner document verification.

Inspect these local files:
- frontend/app/api/owner/uploads/route.ts
- frontend/app/api/owner/dashboard/route.ts
- frontend/app/[lang]/owner-dashboard
- frontend/app/api/auth/owner-session/cookies.ts
- frontend/app/api/auth/owner-register/route.ts
- frontend/app/api/owner/boats
- frontend/app/api/owner/my-boats
- docs/codex/codex_owner_verification_phase_1_20260618_231006.md if present

Questions to answer:

1. How does frontend/app/api/owner/uploads/route.ts currently upload files?
2. Does it already upload to Strapi Upload plugin?
3. What authentication/session does it use?
4. What does it return after upload?
5. Can it safely support document upload without breaking boat image upload?
6. What is the safest place to attach uploaded file_id to owner_profile?
7. Should document attach be implemented in:
   - existing Next.js API route,
   - existing Strapi custom route,
   - new Strapi route,
   - or direct SQL from Next.js should be avoided?
8. How should profile-by-user return document status to dashboard?
9. What exact files should be changed in final implementation?
10. What files must not be changed?
11. What test plan is needed before deployment?
12. What rollback plan is needed?

Important production rule:
The final implementation must not affect:
- Dodo
- webhook
- payment intent
- hold logic
- booking_requests
- calendar
- boat schema
- existing owner login
- existing owner registration

Required output:
Return a clear diagnostic report only.

Format:
1. Current architecture
2. Risks found
3. Recommended implementation path
4. Exact files to change later
5. Exact files not to touch
6. Server changes needed
7. Local changes needed
8. Test plan
9. Rollback plan
10. Final recommendation

Do not edit anything.
Do not run build unless only as read-only verification.
