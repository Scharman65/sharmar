import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");

const workflow = readFileSync(
  resolve(frontendRoot, "lib/adminUnifiedBoatWorkflow.ts"),
  "utf8",
);

const client = readFileSync(
  resolve(frontendRoot, "app/[lang]/admin/AdminCockpitClient.tsx"),
  "utf8",
);

assert.match(workflow, /export function resolveLogicalBoatSourceLocale\(/);
assert.match(workflow, /if \(boat\.locales\[preferredLocale\]\) return preferredLocale;/);
assert.match(workflow, /const primaryLocale = asText\(boat\.primary\.locale\);/);
assert.match(workflow, /for \(const locale of REQUIRED_ADMIN_LOCALES\)/);
assert.match(client, /resolveLogicalBoatSourceLocale\(boat, preferredLocale\)/);
assert.doesNotMatch(client, /const sourceLocale = strapiLocaleFromLang\(lang\);/);
assert.match(client, /if \(!sourceLocale\)/);
assert.match(client, /REQUIRED_ADMIN_LOCALES\.filter\(\(locale\) => locale !== sourceLocale\)/);

console.log("ADMIN_TRANSLATION_SOURCE_LOCALE_REGRESSION=PASS");
console.log("ADMIN_UI_LANGUAGE_DECOUPLED_FROM_SOURCE=YES");
console.log("EXISTING_BOAT_LOCALE_PREFERRED=YES");
console.log("PRIMARY_LOCALE_FALLBACK=YES");
console.log("ANY_AVAILABLE_LOCALE_FALLBACK=YES");
console.log("FAIL_CLOSED_WITHOUT_SOURCE=YES");
