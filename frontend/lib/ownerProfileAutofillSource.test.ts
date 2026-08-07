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

test("owner profile inputs use deterministic autocomplete metadata", () => {
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
    'name: "sharmar-owner-country"',
    'autoComplete: "off"',
  ];

  for (const marker of expectedMarkers) {
    assert.ok(source.includes(marker), `${marker} missing`);
  }
});

test("country input is isolated from browser identity autofill", () => {
  const match = source.match(
    /\{\s*key:\s*"country",[\s\S]*?\n\s*\},/
  );

  assert.ok(match, "country metadata block missing");

  const countryBlock = match[0];

  assert.ok(
    countryBlock.includes('name: "sharmar-owner-country"')
  );
  assert.ok(
    countryBlock.includes('autoComplete: "off"')
  );
  assert.ok(
    countryBlock.includes('inputMode: "text"')
  );

  assert.doesNotMatch(
    countryBlock,
    /name:\s*"country-name"/i
  );

  assert.doesNotMatch(
    countryBlock,
    /autoComplete:\s*"country-name"/i
  );

  assert.doesNotMatch(
    countryBlock,
    /autoComplete:\s*"email"/i
  );
});

test("country values containing email syntax are sanitized", () => {
  assert.ok(
    source.includes(
      'function sanitizeCountryValue(value: string | null | undefined): string'
    )
  );

  assert.ok(
    source.includes('return raw.includes("@") ? "" : raw;')
  );

  assert.ok(
    source.includes(
      'country: sanitizeCountryValue(profile?.country)'
    )
  );

  assert.ok(
    source.includes(
      'country: sanitizeCountryValue(form.country)'
    )
  );

  assert.ok(
    source.includes(
      'key === "country"'
    )
  );

  assert.ok(
    source.includes(
      'sanitizeCountryValue(event.target.value)'
    )
  );
});

test("rendered owner profile input receives semantic attributes", () => {
  assert.ok(source.includes("name={name}"));
  assert.ok(source.includes("autoComplete={autoComplete}"));
  assert.ok(source.includes("inputMode={inputMode}"));
});
