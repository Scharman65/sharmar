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
const serverBookingPricing = source(
  "frontend/lib/serverBookingPricing.ts"
);
const strapi = source(
  "frontend/lib/strapi.ts"
);

test(
  "calendar uses route-first selection state instead of boat minimum duration state",
  () => {
    assert.match(
      calendar,
      /const \[selectedRouteId, setSelectedRouteId\]/
    );

    assert.match(
      calendar,
      /buildBookingSelectionSummary/
    );

    assert.match(
      calendar,
      /selectRoute\(route/
    );
  }
);

test(
  "calendar filters starts through duration interval logic",
  () => {
    assert.match(
      calendar,
      /getValidStartSlotsForDuration/
    );

    assert.match(
      calendar,
      /buildSlotRangeForDuration/
    );

    assert.doesNotMatch(
      calendar,
      /00:00/
    );
  }
);

test(
  "invalid short ranges cannot create a booking link",
  () => {
    assert.match(
      calendar,
      /const canContinue = Boolean\(selectionSummary && guests > 0\)/
    );

    assert.match(
      calendar,
      /canContinue && selectionSummary && selectedRoute && slotRange/
    );

    assert.match(
      calendar,
      /className="booking-primary is-disabled"/
    );
  }
);

test(
  "route cards and summary display marketplace fee breakdown",
  () => {
    assert.match(
      calendar,
      /getRoutePriceBreakdown/
    );

    assert.match(
      calendar,
      /copy\.bookingFee/
    );

    assert.match(
      calendar,
      /selectionSummary\?\.customerTotal/
    );
  }
);

test(
  "booking flow layout keeps route cards inside a shrinkable selection column",
  () => {
    const bookingGridBlock =
      calendar.match(/\.booking-grid\s*\{[^}]*\}/)?.[0] ?? "";

    assert.match(
      calendar,
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(340px,\s*380px\)/
    );

    assert.match(
      calendar,
      /\.booking-steps,[\s\S]*?\.booking-summary\s*\{[\s\S]*?min-width:\s*0/
    );

    assert.match(
      calendar,
      /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*210px\),\s*1fr\)\)/
    );

    assert.match(
      calendar,
      /\.route-card\s*\{[\s\S]*?width:\s*100%[\s\S]*?overflow-wrap:\s*anywhere/
    );

    assert.match(
      calendar,
      /\.route-image\s*\{[\s\S]*?width:\s*100%[\s\S]*?max-width:\s*100%/
    );

    assert.match(
      calendar,
      /@media \(max-width:\s*980px\)\s*\{[\s\S]*?\.booking-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/
    );

    assert.doesNotMatch(
      bookingGridBlock,
      /width:\s*100vw/
    );

    assert.doesNotMatch(
      bookingGridBlock,
      /position:\s*(?:absolute|fixed)/
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
  "request API uses shared route pricing resolver before create side effects",
  () => {
    assert.match(
      requestApi,
      /resolveBookingPricing/
    );

    assert.match(
      requestApi,
      /pricing\.routeId \? \{ experience: pricing\.routeId \} : \{\}/
    );

    assert.doesNotMatch(
      requestApi,
      /Minimum route duration is/
    );
  }
);

test(
  "shared pricing preserves generic boat minimum and daily price",
  () => {
    assert.match(
      serverBookingPricing,
      /Math\.abs\(requestedHours - boatPricing\.minRentalHours\)/
    );

    assert.match(
      serverBookingPricing,
      /boatPricing\.minRentalHours === 8[\s\S]*boatPricing\.pricePerDay/
    );

    assert.match(
      serverBookingPricing,
      /calculateMarketplaceBreakdown\(ownerAmount\)/
    );
  }
);

const requestPage = source(
  "frontend/app/[lang]/request/page.tsx"
);

test(
  "calendar passes route identifiers, duration, slot, and guests to the request page",
  () => {
    assert.match(
      calendar,
      /buildBookingRequestParams/
    );

    assert.match(
      calendar,
      /guests/
    );
  }
);

test(
  "request page gets server-calculated quote instead of URL price",
  () => {
    assert.match(
      requestPage,
      /\/api\/request\/quote/
    );

    assert.match(
      requestPage,
      /setQuote\(json\)/
    );

    assert.doesNotMatch(
      requestPage,
      /sp\.get\("experiencePrice"\)/
    );
  }
);

test(
  "request page blocks submit until quote is valid",
  () => {
    assert.match(
      requestPage,
      /Boolean\(quote\)/
    );

    assert.match(
      requestPage,
      /!quoteLoading/
    );

    assert.match(
      requestPage,
      /!quoteError/
    );
  }
);

test(
  "request page maps quote errors to route-specific recovery copy",
  () => {
    assert.match(
      requestPage,
      /function quoteErrorMessage/
    );

    assert.match(
      requestPage,
      /experience_not_found/
    );

    assert.match(
      requestPage,
      /experience_boat_mismatch/
    );

    assert.match(
      requestPage,
      /invalid_experience_identifier/
    );
  }
);

test(
  "request page locks selected slot fields after route quote context",
  () => {
    assert.match(
      requestPage,
      /readOnly=\{hasHoldSlot\}/
    );

    assert.match(
      requestPage,
      /if \(hasHoldSlot\) return;/
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
      /formatDuration\(selectedDuration, lang\)/
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
  "route-first terminology replaces fixed rental selector terminology",
  () => {
    assert.match(
      calendar,
      /Выберите маршрут/
    );

    assert.match(
      calendar,
      /Choose route/
    );

    assert.match(
      calendar,
      /Step 1/
    );

    assert.doesNotMatch(
      calendar,
      /Аренда на/
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
  "direct request link does not pass trusted price inputs",
  () => {
    assert.doesNotMatch(
      publicBoatPage,
      /requestParams\.set\(\s*"minRentalHours"/
    );

    assert.doesNotMatch(
      publicBoatPage,
      /requestParams\.set\(\s*"ppd"/
    );

    assert.doesNotMatch(
      publicBoatPage,
      /requestParams\.set\(\s*"pph"/
    );
  }
);

test(
  "request page displays route quote owner rate",
  () => {
    assert.match(
      requestPage,
      /money\(\s*ownerAmount/
    );

    assert.doesNotMatch(
      requestPage,
      /PRICE_PER_DAY/
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
