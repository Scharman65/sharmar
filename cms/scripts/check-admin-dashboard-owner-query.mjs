import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptFile);
const cmsRoot = path.resolve(scriptDirectory, "..");

const controllerPath = path.join(
  cmsRoot,
  "src",
  "api",
  "admin-dashboard",
  "controllers",
  "admin-dashboard.ts",
);

if (!fs.existsSync(controllerPath)) {
  console.error(`OWNER_QUERY_CONTROLLER_NOT_FOUND=${controllerPath}`);
  process.exit(1);
}

const source = fs.readFileSync(controllerPath, "utf8");

const forbiddenDirectColumnReferences = [
  /\bu\.email\b/,
  /\bu\.username\b/,
  /\bu\.confirmed\b/,
  /\bu\.blocked\b/,
];

const requiredOwnerListExpressions = [
  "nullif(to_jsonb(u) ->> 'email', '') as email",
  "nullif(to_jsonb(u) ->> 'username', '') as username",
  "nullif(to_jsonb(u) ->> 'confirmed', '')::boolean as confirmed",
  "nullif(to_jsonb(u) ->> 'blocked', '')::boolean as blocked",
];

const requiredBoatOwnerLinkExpressions = [
  "nullif(to_jsonb(u) ->> 'email', '') as owner_email",
  "nullif(to_jsonb(u) ->> 'username', '') as owner_username",
  "nullif(to_jsonb(u) ->> 'confirmed', '')::boolean as owner_confirmed",
  "nullif(to_jsonb(u) ->> 'blocked', '')::boolean as owner_blocked",
];

const forbiddenMatches = forbiddenDirectColumnReferences
  .filter((pattern) => pattern.test(source))
  .map((pattern) => pattern.toString());

const missingOwnerListExpressions = requiredOwnerListExpressions.filter(
  (expression) => !source.includes(expression),
);

const missingBoatOwnerLinkExpressions =
  requiredBoatOwnerLinkExpressions.filter(
    (expression) => !source.includes(expression),
  );

if (forbiddenMatches.length > 0) {
  console.error("DIRECT_UP_USERS_COLUMN_REFERENCES_PRESENT=YES");

  for (const pattern of forbiddenMatches) {
    console.error(`FORBIDDEN_PATTERN=${pattern}`);
  }

  process.exit(1);
}

if (missingOwnerListExpressions.length > 0) {
  console.error("OWNER_LIST_SCHEMA_TOLERANCE_MISSING=YES");

  for (const expression of missingOwnerListExpressions) {
    console.error(`MISSING_EXPRESSION=${expression}`);
  }

  process.exit(1);
}

if (missingBoatOwnerLinkExpressions.length > 0) {
  console.error("BOAT_OWNER_LINK_SCHEMA_TOLERANCE_MISSING=YES");

  for (const expression of missingBoatOwnerLinkExpressions) {
    console.error(`MISSING_EXPRESSION=${expression}`);
  }

  process.exit(1);
}

console.log("ADMIN_OWNER_QUERY_REGRESSION=PASS");
console.log("OWNER_LIST_MINIMAL_SCHEMA_TOLERATED=YES");
console.log("BOAT_OWNER_LINK_MINIMAL_SCHEMA_TOLERATED=YES");
console.log("MISSING_UP_USERS_COLUMNS_TOLERATED=YES");
console.log("CONTROLLER_PATH_RESOLUTION=CWD_INDEPENDENT");
