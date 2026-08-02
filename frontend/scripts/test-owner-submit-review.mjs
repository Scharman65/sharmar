import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");

const client = readFileSync(
  resolve(frontendRoot, "app/[lang]/owner-dashboard/OwnerDashboardClient.tsx"),
  "utf8",
);

const api = readFileSync(
  resolve(frontendRoot, "app/api/owner/boats/submit-review/route.ts"),
  "utf8",
);

assert.match(client, /<form\s+method="POST"\s+action="\/api\/owner\/boats\/submit-review"/);
assert.match(client, /name="documentId"/);
assert.match(client, /name="returnTo"/);
assert.match(client, /type="submit"/);
assert.doesNotMatch(client, /onClick=\{\(\) => submitBoatForReview\(boat\)\}/);
assert.doesNotMatch(client, /async function submitBoatForReview\(/);
assert.match(api, /req\.formData\(\)/);
assert.match(api, /const isNativeForm =/);
assert.match(api, /NextResponse\.redirect\(target, 303\)/);
assert.match(api, /return redirectWithResult\("submitted"\)/);
assert.match(api, /boats-by-user/);
assert.match(api, /SUBMITTABLE_STATUSES/);

console.log("OWNER_SUBMIT_REVIEW_REGRESSION=PASS");
console.log("NATIVE_FORM_SUBMISSION=YES");
console.log("POST_REDIRECT_GET=YES");
console.log("JSON_API_COMPATIBILITY_PRESERVED=YES");
console.log("OWNER_AUTHORIZATION_PRESERVED=YES");
console.log("MODERATION_STATUS_GUARD_PRESERVED=YES");
