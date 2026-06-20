# Sharmar Marketplace — Owner Verification Implementation Task

Mode:
Prepare code changes locally only.

Do not deploy.
Do not touch production server.
Do not modify Dodo.
Do not modify webhook.
Do not modify payment intent.
Do not modify hold logic.
Do not modify booking_requests.
Do not modify calendar.
Do not modify boat schema.
Do not modify existing boat image upload route:
- frontend/app/api/owner/uploads/route.ts

Current safe branch:
owner-registration-phase-1

Known safe commits:
- 7249943 Add owner self registration flow
- 73bdad8 Add Codex planning documents

Goal:
Implement owner document upload foundation safely.

Required final architecture:
Owner dashboard
→ Next.js POST /api/owner/documents
→ Strapi Upload POST /api/upload
→ receive uploaded file id
→ Strapi POST /api/owner/profile-document-attach
→ attach file id to owner_profile document media field
→ set verification_status = documents_uploaded
→ dashboard reloads profile-by-user

Important production facts:
1. Production Strapi source is cms_green on server.
2. Local repo may not contain cms_green owner-profile files.
3. Server owner-profile route structure currently has:
   - cms_green/src/api/owner-profile/routes/owner-profile-by-user.ts
   - cms_green/src/api/owner-profile/controllers/owner-profile-by-user.ts
   - cms_green/src/api/owner-profile/routes/owner-profile-create-for-user.ts
   - cms_green/src/api/owner-profile/controllers/owner-profile-create-for-user.ts
4. Working Strapi route:
   POST /api/owner/profile-create-for-user
5. Working route file format:
   export default { routes: [{ method: "POST", path: "/owner/profile-create-for-user", handler: "owner-profile-create-for-user.create", config: { auth: false } }] };
6. owner_profile relation to user is named user.
7. owner_profile document fields on server:
   - passport_document
   - identity_document
   - license_document
8. Strapi media relation table:
   - files_related_mph
9. Previous random route attempt returned 405 and was removed.
10. Do not repeat random route creation.

Local frontend implementation required:

Create:
- frontend/app/api/owner/documents/route.ts

Modify:
- frontend/app/[lang]/owner-dashboard/OwnerDashboardClient.tsx
- frontend/app/api/owner/dashboard/route.ts only if needed to pass through normalized document status

Reference only:
- frontend/app/api/owner/uploads/route.ts
- frontend/app/api/auth/owner-session/cookies.ts
- frontend/app/api/auth/owner-register/route.ts

Do not change:
- frontend/app/api/owner/uploads/route.ts

Next.js route /api/owner/documents requirements:
1. Accept multipart/form-data.
2. Fields:
   - document_type: passport | identity | license
   - file: one file
3. Use existing owner session cookie/auth helper.
4. Verify owner with Strapi /api/users/me.
5. Allow MIME:
   - application/pdf
   - image/jpeg
   - image/png
   - image/webp
6. Max size: 8 MB.
7. Upload file to Strapi /api/upload using STRAPI_WRITE_TOKEN or STRAPI_TOKEN.
8. Extract uploaded file id.
9. Call Strapi:
   POST /api/owner/profile-document-attach
   with server token header and JSON:
   {
     "user_id": authenticatedUserId,
     "document_type": "passport",
     "file_id": uploadedFileId
   }
10. Return:
   {
     "ok": true,
     "document_type": "passport",
     "file": { id, url, name, mime, size },
     "verification_status": "documents_uploaded"
   }

Strapi server files to prepare as patch/documentation, not deploy automatically:
- cms_green/src/api/owner-profile/routes/owner-profile-document-attach.ts
- cms_green/src/api/owner-profile/controllers/owner-profile-document-attach.ts

Strapi route requirements:
1. Use exact route style from owner-profile-create-for-user.
2. Path:
   /owner/profile-document-attach
3. Handler:
   owner-profile-document-attach.attach
4. auth: false
5. Require server token header:
   x-owner-api-token
6. Validate body:
   - user_id
   - file_id
   - document_type
7. document_type mapping:
   - passport -> passport_document
   - identity -> identity_document
   - license -> license_document
8. Find owner_profile by owner_profiles_user_lnk.user_id.
9. Verify uploaded file exists in public.files.
10. Attach by Strapi-safe SQL to files_related_mph only if this is how existing media relations work in production.
11. Set:
   - verification_status = documents_uploaded
   - documents_uploaded_at = coalesce(documents_uploaded_at, now())
   - updated_at = now()
12. Do not set approved.
13. Do not set verified_at.
14. Do not publish boats.
15. Do not alter contacts_visible.
16. Do not alter any payment/booking tables.

Dashboard UI requirements:
1. Add section “My documents”.
2. Localize ru/en/me.
3. Show:
   - Passport: uploaded / not uploaded
   - Identity document: uploaded / not uploaded
   - License: uploaded / optional
4. Allow upload one file per document type.
5. Show success/error per document type.
6. After success call existing dashboard refresh.
7. Show verification_status.

Testing required locally:
- npm --prefix frontend run build
- Existing owner login page compiles.
- Existing owner registration route compiles.
- Existing /api/owner/uploads route unchanged.

Required output from Codex:
1. Files changed.
2. Code summary.
3. Exact Strapi server patch files prepared.
4. Tests run.
5. Risks.
6. Manual production deployment steps.
7. Rollback steps.

