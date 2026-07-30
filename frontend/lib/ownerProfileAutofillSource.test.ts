import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(
  join(frontendRoot, "app/[lang]/owner-dashboard/OwnerDashboardClient.tsx"),
  "utf8"
);

test("owner profile inputs use semantic autocomplete metadata", () => {
  const expectedMarkers = [
    'key: "firstName"',
    'name: "given-name"',
    'autoComplete: "given-name"',
    'key: "lastName"',
    'name: "family-name"',
    'autoComplete: "family-name"',
    'key: "companyName"',
    'name: "organization"',
    'autoComplete: "organization"',
    'key: "phone"',
    'name: "tel"',
    'autoComplete: "tel"',
    'key: "whatsappNumber"',
    'name: "whatsapp-number"',
    'key: "country"',
    'name: "country-name"',
    'autoComplete: "country-name"',
  ];

  for (const marker of expectedMarkers) {
    assert.ok(source.includes(marker), `${marker} missing`);
  }
});

test("country metadata cannot be interpreted as email autocomplete", () => {
  const match = source.match(/\{\s*key:\s*"country",[\s\S]*?\n\s*\},/);
  assert.ok(match, "country metadata block missing");

  const countryBlock = match[0];
  assert.ok(countryBlock.includes('name: "country-name"'));
  assert.ok(countryBlock.includes('autoComplete: "country-name"'));
  assert.ok(countryBlock.includes('inputMode: "text"'));
  assert.doesNotMatch(countryBlock, /autoComplete:\s*"email"/i);
});

test("rendered owner profile input receives semantic attributes", () => {
  assert.ok(source.includes("name={name}"));
  assert.ok(source.includes("autoComplete={autoComplete}"));
  assert.ok(source.includes("inputMode={inputMode}"));
});
