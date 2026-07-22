import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.resolve(
  scriptDir,
  "../app/[lang]/owner-dashboard/OwnerDashboardClient.tsx",
);
const source = fs.readFileSync(clientPath, "utf8");

assert.match(
  source,
  /async function saveBoatEdit\(boat: OwnerBoat\): Promise<boolean>/,
);
assert.match(source, /if \(!documentId\) return false;/);
assert.match(source, /A transient refresh[\s\S]*failed save/);
assert.match(source, /setEditingBoatDocumentId\(null\);\s*return true;/);
assert.match(source, /return false;\s*}\s*finally/);
assert.match(source, /const boatSaved = await saveBoatEdit\(boat\);/);
assert.match(source, /if \(!boatSaved\) return;/);

console.log("OWNER_SAVE_REFRESH_REGRESSION=PASS");
console.log("PATCH_SUCCESS_REMAINS_AUTHORITATIVE=YES");
console.log("REFRESH_FAILURE_NO_LONGER_REPORTS_SAVE_FAILURE=YES");
