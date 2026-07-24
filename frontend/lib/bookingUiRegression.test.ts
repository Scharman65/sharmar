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

const requestPage = source(
  "frontend/app/[lang]/request/page.tsx"
);

test(
  "calendar passes the boat minimum duration to the request page",
  () => {
    assert.match(
      calendar,
      /params\.set\(\s*"minRentalHours"/
    );
  }
);

test(
  "request page uses daily owner price for an eight-hour rental",
  () => {
    assert.match(
      requestPage,
      /const pricePerDayFromUrl = Number\(sp\.get\("ppd"\)\)/
    );

    assert.match(
      requestPage,
      /hours === 8 && PRICE_PER_DAY > 0/
    );

    assert.match(
      requestPage,
      /return PRICE_PER_DAY/
    );
  }
);

test(
  "request page rejects manual duration below boat minimum",
  () => {
    assert.match(
      requestPage,
      /sp\.get\("minRentalHours"\)/
    );

    assert.match(
      requestPage,
      /hours < MINIMUM_RENTAL_HOURS/
    );

    assert.match(
      requestPage,
      /copy\.minimumDuration/
    );
  }
);

const publicBoatPage = source(
  "frontend/app/[lang]/boats/[slug]/page.tsx"
);

test(
  "availability removes past slots and calendar keeps only complete starts",
  () => {
    assert.match(
      availability,
      /startMs > nowMs/
    );

    assert.match(
      calendar,
      /length >= minimumRentalHours/
    );

    assert.match(
      calendar,
      /activeGroup\.startSlots\.map/
    );
  }
);

test(
  "availability fetch is not cached across passing time",
  () => {
    assert.match(
      availability,
      /cache: "no-store"/
    );

    assert.doesNotMatch(
      availability,
      /revalidate: 300/
    );
  }
);

test(
  "eight hours is displayed as an exact duration",
  () => {
    assert.doesNotMatch(
      calendar,
      /if \(slotCount === 8\) return copy\.fullDay/
    );

    assert.match(
      calendar,
      /return `\$\{hours\} \$\{noun\}`/
    );
  }
);

test(
  "calendar counter counts valid starts instead of raw hourly slots",
  () => {
    assert.match(
      calendar,
      /group\.startSlots\.length/
    );

    assert.match(
      calendar,
      /sum \+ group\.startSlots\.length/
    );
  }
);

test(
  "fixed rental terminology replaces hourly rental terminology",
  () => {
    assert.match(
      calendar,
      /Аренда на/
    );

    assert.match(
      calendar,
      /Najam na/
    );

    assert.match(
      calendar,
      /-hour rental/
    );

    assert.doesNotMatch(
      calendar,
      />Hourly rental</
    );
  }
);

test(
  "public boat page localizes motorboat and minimum duration",
  () => {
    assert.match(
      publicBoatPage,
      /Моторная яхта/
    );

    assert.match(
      publicBoatPage,
      /Motorna jahta/
    );

    assert.match(
      publicBoatPage,
      /Минимальная продолжительность аренды/
    );

    assert.match(
      publicBoatPage,
      /Minimalno trajanje najma/
    );
  }
);

test(
  "direct request link passes daily price and minimum duration",
  () => {
    assert.match(
      publicBoatPage,
      /requestParams\.set\(\s*"minRentalHours"/
    );

    assert.match(
      publicBoatPage,
      /requestParams\.set\(\s*"ppd"/
    );
  }
);

test(
  "request page displays fixed eight-hour owner rate",
  () => {
    assert.match(
      requestPage,
      /fixedBoatRate: "8-hour boat rate"/
    );

    assert.match(
      requestPage,
      /hours === 8/
    );

    assert.match(
      requestPage,
      /money\(\s*ownerAmount/
    );

    assert.doesNotMatch(
      requestPage,
      new RegExp(
        "hasExperience\\s*\\?\\s*" +
          "money\\(ownerAmount,\\s*currency\\)\\s*" +
          ":\\s*`\\$\\{money\\(PRICE_PER_HOUR"
      )
    );
  }
);

test(
  "date cards count valid start slots instead of raw hourly slots",
  () => {
    assert.match(
      calendar,
      /\{group\.startSlots\.length\}/
    );

    assert.doesNotMatch(
      calendar,
      /\{group\.slots\.length\}/
    );
  }
);

test(
  "top boat metadata uses localized vessel type",
  () => {
    assert.match(
      publicBoatPage,
      /localizedBoatType\(\s*boat\.boat_type \?\? boat\.vesselType/
    );

    assert.doesNotMatch(
      publicBoatPage,
      /boat\.boat_type \?\? "—"/
    );
  }
);

test(
  "daily price is presented as an eight-hour price",
  () => {
    assert.match(
      publicBoatPage,
      /Цена за 8 часов/
    );

    assert.match(
      publicBoatPage,
      /Cijena za 8 sati/
    );

    assert.match(
      publicBoatPage,
      /Price for 8 hours/
    );
  }
);

const langLayout = source(
  "frontend/app/[lang]/layout.tsx"
);

test(
  "footer uses the automatic current year",
  () => {
    assert.match(
      langLayout,
      /new Date\(\)\.getFullYear\(\)/
    );

    assert.match(
      langLayout,
      /© \{currentYear\} Sharmar Boats/
    );

    assert.doesNotMatch(
      langLayout,
      /© 2025 Sharmar Boats/
    );
  }
);
