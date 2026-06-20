# Sharmar Marketplace — Owner Verification Phase 1

Main rule:
Do not break existing booking, Dodo payment, webhook, hold, calendar, or listing publication logic.

Current branch:
owner-registration-phase-1

Current goal:
Implement owner verification foundation safely.

Do not change:
- payment logic
- Dodo
- webhook
- hold logic
- booking_requests
- existing boat schema
- existing owner login
- existing owner registration flow

Task:
Create safe code changes for owner document upload and owner verification display.

Required result:
1. Add owner document upload support without touching boat publication.
2. Add “My documents” section to owner dashboard.
3. Allow owner to upload passport, identity document, and optional license document.
4. Store documents on owner_profile using Strapi media fields.
5. After successful upload, set owner_profile.verification_status to documents_uploaded.
6. Do not auto-approve owners.
7. Do not publish boats automatically.
8. Admin approval remains manual in Strapi Admin for now.
9. Add frontend localization for ru/en/me.
10. Keep build passing.

Before editing, inspect:
- cms_green/src/api/owner-profile/content-types/owner-profile/schema.json
- frontend/app/[lang]/owner-dashboard
- frontend/app/api/owner/dashboard
- frontend/app/api/owner/uploads
- frontend/app/api/auth/owner-session/cookies.ts

Important:
Create backups of every file before modifying it.
Use minimal changes.
Do not delete existing code.
Do not rename existing routes.
Do not modify production payment code.

After changes, run:
npm --prefix frontend run build

At the end, report:
- files changed
- backups created
- what was implemented
- what admin does manually now
- remaining next step
