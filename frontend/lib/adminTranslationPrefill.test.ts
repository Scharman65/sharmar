import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(
  dirname(fileURLToPath(import.meta.url))
);

const page = readFileSync(
  join(
    frontendRoot,
    "app/[lang]/admin/translations/preview/page.tsx"
  ),
  "utf8"
);

const client = readFileSync(
  join(
    frontendRoot,
    "app/[lang]/admin/translations/preview/AdminTranslationPreviewClient.tsx"
  ),
  "utf8"
);

test("translation preview reads query parameters", () => {
  assert.ok(page.includes("searchParams: Promise"));
  assert.ok(page.includes("query.boatDocumentId"));
  assert.ok(page.includes("query.sourceLocale"));
  assert.ok(page.includes(': "en";'));
  assert.ok(page.includes("initialBoatDocumentId="));
  assert.ok(page.includes("initialSourceLocale="));
});

test("translation client uses initial values", () => {
  assert.ok(client.includes("initialBoatDocumentId: string"));
  assert.ok(client.includes("initialSourceLocale: StrapiLocale"));
  assert.ok(client.includes("initialBoatDocumentId\n  );"));
  assert.ok(client.includes("initialSourceLocale\n  );"));
  assert.doesNotMatch(
    client,
    /useState<StrapiLocale>\("ru"\)/
  );
});
