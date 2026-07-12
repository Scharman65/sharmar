export const MARKETPLACE_FEE_RATE = 0.10;
export const MARKETPLACE_MINIMUM_FEE_AMOUNT = 1;
export const MARKETPLACE_MINIMUM_FEE_OWNER_THRESHOLD =
  MARKETPLACE_MINIMUM_FEE_AMOUNT / MARKETPLACE_FEE_RATE;

export type MarketplaceBreakdown = {
  ownerAmount: number;
  marketplaceFeeAmount: number;
  customerTotalAmount: number;
};

export function toPriceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function applyMarketplaceFee(value: unknown): number | null {
  const breakdown = calculateMarketplaceBreakdown(value);
  return breakdown ? breakdown.customerTotalAmount : null;
}

export function calculateMarketplaceBreakdown(ownerAmountValue: unknown): MarketplaceBreakdown | null {
  const rawOwnerAmount = toPriceNumber(ownerAmountValue);
  if (rawOwnerAmount === null || rawOwnerAmount < 0) return null;

  const ownerAmount = roundMoney(rawOwnerAmount);
  if (ownerAmount === 0) {
    return {
      ownerAmount,
      marketplaceFeeAmount: 0,
      customerTotalAmount: 0,
    };
  }

  const marketplaceFeeAmount = Math.max(
    roundMoney(ownerAmount * MARKETPLACE_FEE_RATE),
    MARKETPLACE_MINIMUM_FEE_AMOUNT
  );

  return {
    ownerAmount,
    marketplaceFeeAmount,
    customerTotalAmount: roundMoney(ownerAmount + marketplaceFeeAmount),
  };
}

export function calculateMarketplaceBreakdownFromCustomerTotal(
  customerTotalValue: unknown
): MarketplaceBreakdown | null {
  const rawCustomerTotalAmount = toPriceNumber(customerTotalValue);
  if (rawCustomerTotalAmount === null || rawCustomerTotalAmount < 0) return null;

  const customerTotalAmount = roundMoney(rawCustomerTotalAmount);
  if (customerTotalAmount === 0) {
    return {
      ownerAmount: 0,
      marketplaceFeeAmount: 0,
      customerTotalAmount,
    };
  }

  if (customerTotalAmount <= MARKETPLACE_MINIMUM_FEE_AMOUNT) return null;

  const minimumFeeTotalThreshold = roundMoney(
    MARKETPLACE_MINIMUM_FEE_OWNER_THRESHOLD + MARKETPLACE_MINIMUM_FEE_AMOUNT
  );
  const ownerAmount =
    customerTotalAmount <= minimumFeeTotalThreshold
      ? roundMoney(customerTotalAmount - MARKETPLACE_MINIMUM_FEE_AMOUNT)
      : roundMoney(customerTotalAmount / (1 + MARKETPLACE_FEE_RATE));

  return calculateMarketplaceBreakdown(ownerAmount);
}
