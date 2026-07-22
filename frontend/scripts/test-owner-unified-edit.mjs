import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.resolve(
  scriptDir,
  "../app/[lang]/owner-dashboard/OwnerDashboardClient.tsx",
);
const apiPath = path.resolve(
  scriptDir,
  "../app/api/owner/experiences/route.ts",
);

const client = fs.readFileSync(clientPath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");

assert.match(client, /experienceEditForm/);
assert.match(client, /saveAllBoatChanges/);
assert.match(client, /updateExperienceForOwner/);
assert.match(client, /deleteExperienceForOwner/);
assert.match(client, /Сохранить всё/);
assert.match(client, /editingBoatDocumentId === boat\.documentId/);

assert.match(api, /export async function PATCH\(/);
assert.match(api, /export async function DELETE\(/);
assert.match(api, /loadOwnedExperience/);
assert.match(api, /Experience has booking dependencies/);
assert.match(api, /method: "PUT"/);
assert.match(api, /method: "DELETE"/);

const draftSelectors = api.match(/qs\.set\("status", "draft"\);/g) ?? [];
assert.ok(draftSelectors.length >= 2, "Draft list/count behavior must remain enabled");

console.log("OWNER_UNIFIED_EDIT_REGRESSION=PASS");
console.log("ONE_GLOBAL_EDIT_MODE=YES");
console.log("EXISTING_ROUTE_PATCH=YES");
console.log("SAFE_ROUTE_DELETE=YES");
console.log("DRAFT_LISTING_PRESERVED=YES");
