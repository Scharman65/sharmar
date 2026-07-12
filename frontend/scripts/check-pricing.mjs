import assert from "node:assert/strict";
import { calculateMarketplaceBreakdown } from "../lib/pricing.ts";

const cases = [
  { ownerAmount: 5, marketplaceFeeAmount: 1, customerTotalAmount: 6 },
  { ownerAmount: 10, marketplaceFeeAmount: 1, customerTotalAmount: 11 },
  { ownerAmount: 100, marketplaceFeeAmount: 10, customerTotalAmount: 110 },
];

for (const expected of cases) {
  const actual = calculateMarketplaceBreakdown(expected.ownerAmount);
  assert.deepEqual(actual, expected);
  console.log(
    `${expected.ownerAmount} -> fee ${expected.marketplaceFeeAmount}, total ${expected.customerTotalAmount}`
  );
}
