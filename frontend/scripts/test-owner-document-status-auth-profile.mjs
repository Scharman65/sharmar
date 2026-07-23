import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.resolve(
  scriptDir,
  "../app/api/owner/dashboard/route.ts",
);
const source = fs.readFileSync(routePath, "utf8");

assert.doesNotMatch(
  source,
  /const ownerProfileResponse = await strapiJson\(\s*`\/api\/owner\/profile-by-user/,
);

assert.match(
  source,
  /const ownerProfile = await loadOwnerProfileWithDocuments\(\s*ownerAuth\.auth\.ownerProfile,\s*serverToken\s*\)/,
);

assert.match(source, /function buildOwnerProfileDocumentsPath/);
assert.match(source, /populate\[passport_document\]/);
assert.match(source, /populate\[identity_document\]/);
assert.match(source, /populate\[license_document\]/);
assert.match(source, /ownerDocumentStatus: buildOwnerDocumentStatus\(ownerProfile\)/);

console.log("OWNER_DOCUMENT_STATUS_AUTH_PROFILE_REGRESSION=PASS");
console.log("REDUNDANT_PROFILE_BY_USER_REQUEST_REMOVED=YES");
console.log("AUTHENTICATED_PROFILE_REUSED=YES");
console.log("DOCUMENT_MEDIA_POPULATE_RETAINED=YES");
console.log("DATABASE_WRITE=NO");
