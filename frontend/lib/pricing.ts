export const MARKETPLACE_FEE_RATE = 0.15;

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
  const ownerAmount = toPriceNumber(value);
  if (ownerAmount === null) return null;
  return roundMoney(ownerAmount * (1 + MARKETPLACE_FEE_RATE));
}

export function calculateMarketplaceBreakdown(ownerAmountValue: unknown): MarketplaceBreakdown | null {
  const ownerAmount = toPriceNumber(ownerAmountValue);
  if (ownerAmount === null) return null;

  const customerTotalAmount = ownerAmount * (1 + MARKETPLACE_FEE_RATE);
  return {
    ownerAmount,
    marketplaceFeeAmount: customerTotalAmount - ownerAmount,
    customerTotalAmount,
  };
}

export function calculateMarketplaceBreakdownFromCustomerTotal(
  customerTotalValue: unknown
): MarketplaceBreakdown | null {
  const customerTotalAmount = toPriceNumber(customerTotalValue);
  if (customerTotalAmount === null) return null;

  const ownerAmount = customerTotalAmount / (1 + MARKETPLACE_FEE_RATE);
  return {
    ownerAmount,
    marketplaceFeeAmount: customerTotalAmount - ownerAmount,
    customerTotalAmount,
  };
}
