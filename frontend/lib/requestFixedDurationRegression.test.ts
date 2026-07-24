import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("request page enforces the fixed eight-hour rental", () => {
  const requestPage = source("frontend/app/[lang]/request/page.tsx");

  assert.match(
    requestPage,
    /const \[timeTo, setTimeTo\] = useState\(slotParts\?\.timeTo \?\? "18:00"\);/
  );
  assert.match(
    requestPage,
    /Math\.abs\(hours - MINIMUM_RENTAL_HOURS\) <= 1 \/ 60/
  );
  assert.match(
    requestPage,
    /if \(hours === 8 && PRICE_PER_DAY > 0\)/
  );
  assert.match(
    requestPage,
    /ownerAmount > 0[\s\S]*marketplaceFeeAmount > 0[\s\S]*customerTotalAmount > 0/
  );

  assert.doesNotMatch(requestPage, /const PRICE_PER_HOUR\s*=/);
  assert.doesNotMatch(requestPage, /const pricePerHourFromUrl\s*=/);
  assert.doesNotMatch(requestPage, /process\.env\.NEXT_PUBLIC_PRICE_PER_HOUR/);
  assert.doesNotMatch(requestPage, /hours\s*\*\s*PRICE_PER_HOUR/);
  assert.doesNotMatch(requestPage, /PRICE_PER_HOUR/);
});

test("request API enforces eight hours and server-side daily price", () => {
  const requestApi = source("frontend/app/api/request/route.ts");

  assert.match(
    requestApi,
    /const tt = p\.timeTo && isValidTime\(p\.timeTo\) \? p\.timeTo : "18:00";/
  );
  assert.match(
    requestApi,
    /Math\.abs\(hours - boatPricing\.minRentalHours\) > 1 \/ 60/
  );
  assert.match(requestApi, /Rental duration must be exactly/);
  assert.match(
    requestApi,
    /hours === 8[\s\S]*boatPricing\.pricePerDay/
  );
  assert.match(
    requestApi,
    /ownerAmount = roundMoney\(boatPricing\.pricePerDay\);/
  );
  assert.match(
    requestApi,
    /Boat fixed-duration price is not configured\./
  );
  assert.match(requestApi, /getExperiencePricingForBoat/);
  assert.match(requestApi, /selectedExperience\.durationHours/);

  assert.doesNotMatch(
    requestApi,
    /hours\s*\*\s*boatPricing\.pricePerHour/
  );
  assert.doesNotMatch(
    requestApi,
    /Boat hourly price is not configured/
  );
});
