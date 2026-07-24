import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("Bar static relation matches the production marina slug", () => {
  const geography = source("frontend/data/geography.ts");
  const marinas = source("frontend/data/marinas.ts");

  assert.match(geography, /slug:\s*"bar"[\s\S]*?marinaSlugs:\s*\["bar"\]/);
  assert.doesNotMatch(geography, /slug:\s*"bar"[\s\S]*?marinaSlugs:\s*\["bar-marina"\]/);
  assert.match(marinas, /slug:\s*"bar"[\s\S]*?city:\s*"Bar"/);
  assert.match(marinas, /ru:\s*"Марина в Баре/);
  assert.match(marinas, /me:\s*"Marina u Baru/);
});

test("city rental category loads live localized boats", () => {
  const page = source("frontend/app/[lang]/city/[slug]/rent/[type]/page.tsx");

  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /fetchBoats\(lang,/);
  assert.match(page, /homeMarinaSlug:\s*marina\.slug/);
  assert.match(page, /vesselType:\s*vesselFilter/);
  assert.match(page, /<BoatCardSpecs boat=\{boat\} \/>/);
  assert.match(page, /<Image/);
  assert.match(page, /lang === "ru"/);
  assert.match(page, /lang === "me"/);
  assert.match(page, /Доступные лодки/);
  assert.match(page, /Dostupna plovila/);
  assert.doesNotMatch(page, /connected to this static city rental category page/);
});
