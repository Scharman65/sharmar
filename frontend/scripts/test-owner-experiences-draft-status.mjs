import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.resolve(
  scriptDir,
  "../app/api/owner/experiences/route.ts",
);
const source = fs.readFileSync(routePath, "utf8");

const countFunctionStart = source.indexOf(
  "async function countBoatExperiences(",
);
const getHandlerStart = source.indexOf(
  "export async function GET(req: NextRequest)",
);
const postHandlerStart = source.indexOf(
  "export async function POST(req: NextRequest)",
);

assert.ok(countFunctionStart >= 0, "countBoatExperiences function is missing");
assert.ok(getHandlerStart > countFunctionStart, "GET handler is missing");
assert.ok(postHandlerStart > getHandlerStart, "POST handler is missing");

const countFunction = source.slice(countFunctionStart, getHandlerStart);
const getHandler = source.slice(getHandlerStart, postHandlerStart);

assert.match(
  countFunction,
  /qs\.set\("status", "draft"\);/,
  "Experience count must explicitly query draft records",
);

assert.match(
  getHandler,
  /qs\.set\("status", "draft"\);/,
  "Owner experience list must explicitly query draft records",
);

const allDraftSelectors =
  source.match(/qs\.set\("status", "draft"\);/g) ?? [];

assert.equal(
  allDraftSelectors.length,
  2,
  "Exactly two owner experience draft selectors are expected",
);

assert.match(
  source,
  /method: "POST"[\s\S]*publicationState: "draft"/,
  "Experience creation must remain a draft workflow",
);

console.log("OWNER_EXPERIENCE_DRAFT_STATUS_REGRESSION=PASS");
console.log("COUNT_QUERY_STATUS_DRAFT=YES");
console.log("LIST_QUERY_STATUS_DRAFT=YES");
console.log("CREATE_WORKFLOW_REMAINS_DRAFT=YES");
