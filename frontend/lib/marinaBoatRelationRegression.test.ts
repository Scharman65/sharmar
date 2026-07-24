import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("marina page filters boats through the production relation", () => {
  const page = source(
    "frontend/app/[lang]/marina/[slug]/page.tsx",
  );

  assert.match(
    page,
    /fetchBoats\(lang,\s*\{\s*homeMarinaSlug:\s*marina\.slug/,
  );

  assert.doesNotMatch(
    page,
    /fetchBoats\(lang\)\.catch/,
  );

  assert.doesNotMatch(
    page,
    /\.filter\(\(boat\) => boatMatchesMarina\(boat, marina\)\)/,
  );
});
