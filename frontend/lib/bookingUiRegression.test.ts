import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(
    resolve(process.cwd(), path),
    "utf8"
  );
}

const calendar = source(
  "frontend/components/boat/AvailabilityCalendar.tsx"
);
const availability = source(
  "frontend/lib/availability.ts"
);
const requestApi = source(
  "frontend/app/api/request/route.ts"
);
const strapi = source(
  "frontend/lib/strapi.ts"
);

test(
  "calendar derives the initial duration from min_rental_hours",
  () => {
    assert.match(
      calendar,
      /Math\.ceil\(Number\(boat\.min_rental_hours \?\? 1\)\)/
    );

    assert.match(
      calendar,
      /useState\(minimumRentalHours\)/
    );

    assert.doesNotMatch(
      calendar,
      /useState\(1\);\s*const \[selectedExperienceId/
    );
  }
);

test(
  "calendar no longer hardcodes one-to-four-hour rental options",
  () => {
    assert.doesNotMatch(
      calendar,
      /\{ label: "1h", slotCount: 1/
    );

    assert.doesNotMatch(
      calendar,
      /\{ label: "2h", slotCount: 2/
    );

    assert.doesNotMatch(
      calendar,
      /\{ label: "3h", slotCount: 3/
    );

    assert.doesNotMatch(
      calendar,
      /\{ label: "4h", slotCount: 4/
    );

    assert.match(
      calendar,
      /hours >= safeMinimum/
    );
  }
);

test(
  "invalid short ranges cannot create a booking link",
  () => {
    assert.match(
      calendar,
      /consecutive\.length < safeSlotCount\) return null/
    );

    assert.match(
      calendar,
      /const requestSlotRange = selectedDurationIsValid/
    );

    assert.match(
      calendar,
      /\{requestSlotRange \? \(/
    );
  }
);

test(
  "route cards display the customer total with marketplace fee",
  () => {
    assert.match(
      calendar,
      /import \{ applyMarketplaceFee \} from "@\/lib\/pricing"/
    );

    assert.match(
      calendar,
      /const customerPrice =\s*applyMarketplaceFee\(price\)/
    );

    assert.match(
      calendar,
      /customerPrice > 0/
    );
  }
);

test(
  "availability covers exactly fourteen inclusive calendar dates",
  () => {
    assert.match(
      availability,
      /addDaysUTC\(today, 13\)/
    );

    assert.doesNotMatch(
      availability,
      /addDaysUTC\(today, 14\)/
    );
  }
);

test(
  "past availability slots are removed before rendering",
  () => {
    assert.match(
      availability,
      /const nowMs = Date\.now\(\)/
    );

    assert.match(
      availability,
      /startMs > nowMs/
    );
  }
);

test(
  "experience fallback prefers the requested locale instead of locale all",
  () => {
    assert.match(
      strapi,
      /preferredLocale,\s*"en",\s*"ru",\s*"sr-Latn-ME"/
    );

    assert.match(
      strapi,
      /locale=\$\{encodeURIComponent\(locale\)\}/
    );

    assert.doesNotMatch(
      strapi,
      /"locale=all"/
    );
  }
);

test(
  "request API loads and enforces minimum rental duration",
  () => {
    assert.match(
      requestApi,
      /fields\[4\]", "min_rental_hours"/
    );

    assert.match(
      requestApi,
      /hours < boatPricing\.minRentalHours/
    );

    assert.match(
      requestApi,
      /Minimum rental duration is/
    );
  }
);

test(
  "eight-hour rental can use the configured daily owner price",
  () => {
    assert.match(
      requestApi,
      /hours === 8/
    );

    assert.match(
      requestApi,
      /ownerAmount = roundMoney\(boatPricing\.pricePerDay\)/
    );

    assert.match(
      requestApi,
      /calculateMarketplaceBreakdown\(ownerAmount\)/
    );
  }
);
