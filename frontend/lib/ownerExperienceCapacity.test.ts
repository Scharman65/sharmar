import assert from "node:assert/strict";
import test from "node:test";

import { validateRouteGuestLimit } from "./ownerExperienceCapacity.ts";

test("requires maxGuests", () => {
  assert.deepEqual(validateRouteGuestLimit(null, 8), {
    ok: false,
    error: "maxGuests is required",
  });
});

test("requires configured boat capacity", () => {
  assert.deepEqual(validateRouteGuestLimit(3, null), {
    ok: false,
    error: "Boat capacity must be configured before saving routes",
  });
});

test("rejects route limit above boat capacity", () => {
  assert.deepEqual(validateRouteGuestLimit(8, 3), {
    ok: false,
    error: "maxGuests cannot exceed boat capacity (3)",
  });
});

test("accepts route limit equal to boat capacity", () => {
  assert.deepEqual(validateRouteGuestLimit(3, 3), {
    ok: true,
    maxGuests: 3,
    boatCapacity: 3,
  });
});

test("accepts route limit below boat capacity", () => {
  assert.deepEqual(validateRouteGuestLimit("6", "8"), {
    ok: true,
    maxGuests: 6,
    boatCapacity: 8,
  });
});
