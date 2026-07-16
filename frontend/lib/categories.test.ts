import assert from "node:assert/strict";
import test from "node:test";

import { CATEGORIES } from "./categories.ts";

test("catamaran public categories use legacy boat_type filter for old-row compatibility", () => {
  assert.deepEqual(CATEGORIES["rent/catamaran"], {
    key: "rent/catamaran",
    listingType: "rent",
    boatType: "Catamaran",
  });

  assert.deepEqual(CATEGORIES["sale/catamaran"], {
    key: "sale/catamaran",
    listingType: "sale",
    boatType: "Catamaran",
  });
});

test("motor and sail public categories stay vessel-type specific", () => {
  assert.equal(CATEGORIES["rent/motor"].vesselType, "motorboat");
  assert.equal(CATEGORIES["sale/motor"].vesselType, "motorboat");
  assert.equal(CATEGORIES["rent/sail"].vesselType, "sailboat");
  assert.equal(CATEGORIES["sale/sail"].vesselType, "sailboat");
  assert.notEqual(CATEGORIES["rent/sail"].boatType, "Catamaran");
  assert.notEqual(CATEGORIES["sale/sail"].boatType, "Catamaran");
});
