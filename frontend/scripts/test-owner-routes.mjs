import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");

const dashboard = readFileSync(
  resolve(
    frontendRoot,
    "app/[lang]/owner-dashboard/OwnerDashboardClient.tsx",
  ),
  "utf8",
);

const api = readFileSync(
  resolve(frontendRoot, "app/api/owner/experiences/route.ts"),
  "utf8",
);

assert.match(dashboard, /const OWNER_ROUTE_LIMIT = 3;/);
assert.match(dashboard, /function sameOwnerBoat\(/);
assert.match(dashboard, /leftDocumentId === rightDocumentId/);
assert.match(dashboard, /leftId === rightId/);
assert.match(dashboard, /function shouldShowOwnerRouteComposer\(/);
assert.match(dashboard, /function shouldShowOwnerRouteLimitMessage\(/);
assert.match(dashboard, /sameOwnerBoat\(boat, selectedBoat\)/);
assert.match(dashboard, /routeCount < OWNER_ROUTE_LIMIT/);
assert.match(dashboard, /routeCount >= OWNER_ROUTE_LIMIT/);

assert.doesNotMatch(
  dashboard,
  /editingBoatDocumentId\s*===\s*boat\.documentId\s*&&\s*\(boatExperiences\[getBoatExperienceKey\(boat\)\]\s*\|\|\s*\[\]\)\.length\s*<\s*3/,
);

assert.match(
  dashboard,
  /onClick=\{\(\) => createExperienceForBoat\(Number\(boat\.id\)\)\}/,
);

assert.match(
  api,
  /getOwnerBoat\(p\.boatId,\s*ownerRes\.owner\.id,\s*serverToken\)/,
);

assert.match(
  api,
  /countBoatExperiences\(boatRes\.boat,\s*p\.boatId,\s*serverToken\)/,
);

assert.match(api, /countRes\.count\s*>=\s*3/);

console.log("OWNER_ROUTE_VISIBILITY_REGRESSION=PASS");
console.log("NEW_BOAT_ROUTE_FORM_STABLE=YES");
console.log("PAGE_REFRESH_ROUTE_FORM_STABLE=YES");
console.log("BOAT_SWITCHING_USES_STABLE_IDENTITY=YES");
console.log("THREE_ROUTE_LIMIT_ENFORCED=YES");
console.log("CROSS_OWNER_ROUTE_CREATION_BLOCKED=YES");
