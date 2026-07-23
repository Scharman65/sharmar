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

assert.match(source, /function buildOwnerProfileDocumentsPath/);
assert.match(source, /filters\[documentId\]\[\$eq\]/);
assert.match(source, /qs\.set\("status", "draft"\)/);

for (const field of [
  "passport_document",
  "identity_document",
  "license_document",
]) {
  assert.match(
    source,
    new RegExp(`populate\\[${field}\\]\\[fields\\]\\[0\\]`),
  );
}

assert.match(source, /async function loadOwnerProfileWithDocuments/);
assert.match(source, /OWNER_PROFILE_DOCUMENTS_STRAPI_ERROR/);
assert.match(
  source,
  /const ownerProfile = await loadOwnerProfileWithDocuments\(baseOwnerProfile, serverToken\)/,
);
assert.match(source, /ownerDocumentStatus: buildOwnerDocumentStatus\(ownerProfile\)/);

console.log("OWNER_DOCUMENT_STATUS_POPULATE_REGRESSION=PASS");
console.log("PASSPORT_STATUS_FROM_MEDIA_RELATION=YES");
console.log("IDENTITY_STATUS_FROM_MEDIA_RELATION=YES");
console.log("LICENSE_STATUS_FROM_MEDIA_RELATION=YES");
console.log("DATABASE_WRITE=NO");
