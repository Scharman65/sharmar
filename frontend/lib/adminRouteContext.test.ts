import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeFiles = [
  "../app/api/admin/boats/[documentId]/dependencies/route.ts",
  "../app/api/admin/boats/[documentId]/route.ts",
  "../app/api/admin/documents/[id]/route.ts",
  "../app/api/admin/booking-requests/[id]/external-refund/route.ts",
  "../app/api/admin/experiences/[documentId]/dependencies/route.ts",
  "../app/api/admin/experiences/[documentId]/route.ts",
  "../app/api/admin/media/[id]/route.ts",
  "../app/api/admin/owners/[documentId]/dependencies/route.ts",
  "../app/api/admin/owners/[documentId]/route.ts",
];

const routeSources = routeFiles
  .map((relativePath) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  )
  .join("\n");

test("Next.js 16 admin route contexts use promised params without object unions", () => {
  assert.doesNotMatch(
    routeSources,
    /params:\s*Promise<\{[^{}]*\}>\s*\|\s*\{[^{}]*\}/,
  );

  assert.equal(
    (routeSources.match(/params:\s*Promise<\{/g) ?? []).length,
    19,
  );
});
