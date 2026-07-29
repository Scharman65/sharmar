import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("request page uses route quote instead of fixed-duration URL pricing", () => {
  const requestPage = source("frontend/app/[lang]/request/page.tsx");

  assert.match(
    requestPage,
    /const \[timeTo, setTimeTo\] = useState\(slotParts\?\.timeTo \?\? "18:00"\);/
  );
  assert.match(
    requestPage,
    /\/api\/request\/quote/
  );
  assert.match(
    requestPage,
    /Boolean\(quote\)/
  );
  assert.match(
    requestPage,
    /ownerAmount > 0[\s\S]*marketplaceFeeAmount > 0[\s\S]*customerTotalAmount > 0/
  );

  assert.doesNotMatch(requestPage, /sp\.get\("ppd"\)/);
  assert.doesNotMatch(requestPage, /sp\.get\("minRentalHours"\)/);
  assert.doesNotMatch(requestPage, /sp\.get\("experiencePrice"\)/);
  assert.doesNotMatch(requestPage, /const PRICE_PER_HOUR\s*=/);
  assert.doesNotMatch(requestPage, /const pricePerHourFromUrl\s*=/);
  assert.doesNotMatch(requestPage, /process\.env\.NEXT_PUBLIC_PRICE_PER_HOUR/);
  assert.doesNotMatch(requestPage, /hours\s*\*\s*PRICE_PER_HOUR/);
  assert.doesNotMatch(requestPage, /PRICE_PER_HOUR/);
  assert.doesNotMatch(requestPage, /PRICE_PER_DAY/);
});

test("request API enforces eight hours and server-side daily price", () => {
  const requestApi = source("frontend/app/api/request/route.ts");
  const serverBookingPricing = source("frontend/lib/serverBookingPricing.ts");

  assert.match(
    requestApi,
    /const tt = p\.timeTo && isValidTime\(p\.timeTo\) \? p\.timeTo : "18:00";/
  );
  assert.match(
    requestApi,
    /resolveBookingPricing/
  );
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
    /boat_fixed_duration_price_missing/
  );
  assert.match(serverBookingPricing, /selectedExperience\.durationHours/);
  assert.doesNotMatch(requestApi, /Minimum route duration is/);

  assert.doesNotMatch(
    serverBookingPricing,
    /hours\s*\*\s*boatPricing\.pricePerHour/
  );
  assert.doesNotMatch(
    serverBookingPricing,
    /Boat hourly price is not configured/
  );
});
