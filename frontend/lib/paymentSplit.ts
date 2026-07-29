export type PaymentSplitLang = "en" | "ru" | "me";

export type PaymentSplitAmounts = {
  ownerAmount: number | string | null | undefined;
  marketplaceFeeAmount: number | string | null | undefined;
  customerTotalAmount: number | string | null | undefined;
  paymentAmountCents: number | string | null | undefined;
  currency: string | null | undefined;
};

export type PaymentSplitValidation =
  | {
      ok: true;
      ownerAmount: number;
      marketplaceFeeAmount: number;
      customerTotalAmount: number;
      paymentAmount: number;
      currency: string;
    }
  | {
      ok: false;
      error: "missing_breakdown" | "missing_payment_amount" | "payment_fee_mismatch";
    };

export const paymentSplitCopy = {
  en: {
    tripPrice: "Trip price",
    onlineBookingFee: "Online booking fee",
    totalCost: "Total cost",
    payOnlineNow: "Pay online now",
    payOwnerDuringTrip: "Pay the owner during the trip",
    mainExplanation:
      "You are paying only the Sharmar online booking fee now. The trip price is paid directly to the owner during the trip.",
    button: "Pay booking fee {amount}",
  },
  ru: {
    tripPrice: "Стоимость поездки",
    onlineBookingFee: "Комиссия за онлайн-бронирование",
    totalCost: "Общая стоимость",
    payOnlineNow: "Оплатить сейчас онлайн",
    payOwnerDuringTrip: "Оплатить владельцу во время поездки",
    mainExplanation:
      "Сейчас вы оплачиваете только комиссию Sharmar за онлайн-бронирование. Стоимость поездки оплачивается непосредственно владельцу во время поездки.",
    button: "Оплатить комиссию {amount}",
  },
  me: {
    tripPrice: "Cijena vožnje",
    onlineBookingFee: "Naknada za online rezervaciju",
    totalCost: "Ukupna cijena",
    payOnlineNow: "Platite sada online",
    payOwnerDuringTrip: "Platite vlasniku tokom vožnje",
    mainExplanation:
      "Sada plaćate samo Sharmar naknadu za online rezervaciju. Cijena vožnje plaća se direktno vlasniku tokom vožnje.",
    button: "Platite naknadu {amount}",
  },
} as const;

export function toPaymentNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundPaymentAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountFromCents(value: unknown): number | null {
  const cents = toPaymentNumber(value);
  if (cents === null) return null;
  return roundPaymentAmount(cents / 100);
}

export function formatPaymentAmount(
  value: unknown,
  currency: string | null | undefined,
  lang: PaymentSplitLang = "en"
): string {
  const n = toPaymentNumber(value);
  const cur = String(currency || "EUR").trim().toUpperCase() || "EUR";
  if (n === null) return `— ${cur}`;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(roundPaymentAmount(n));

  return `${amount} ${cur}`;
}

export function validatePaymentSplit(input: PaymentSplitAmounts): PaymentSplitValidation {
  const ownerAmount = toPaymentNumber(input.ownerAmount);
  const marketplaceFeeAmount = toPaymentNumber(input.marketplaceFeeAmount);
  const customerTotalAmount = toPaymentNumber(input.customerTotalAmount);
  const paymentAmount = amountFromCents(input.paymentAmountCents);
  const currency = String(input.currency || "").trim().toUpperCase();

  if (
    ownerAmount === null ||
    marketplaceFeeAmount === null ||
    customerTotalAmount === null ||
    !currency ||
    ownerAmount <= 0 ||
    marketplaceFeeAmount <= 0 ||
    customerTotalAmount <= 0
  ) {
    return { ok: false, error: "missing_breakdown" };
  }

  if (paymentAmount === null || paymentAmount <= 0) {
    return { ok: false, error: "missing_payment_amount" };
  }

  if (roundPaymentAmount(paymentAmount) !== roundPaymentAmount(marketplaceFeeAmount)) {
    return { ok: false, error: "payment_fee_mismatch" };
  }

  return {
    ok: true,
    ownerAmount: roundPaymentAmount(ownerAmount),
    marketplaceFeeAmount: roundPaymentAmount(marketplaceFeeAmount),
    customerTotalAmount: roundPaymentAmount(customerTotalAmount),
    paymentAmount: roundPaymentAmount(paymentAmount),
    currency,
  };
}

export function paymentCtaLabel(
  lang: PaymentSplitLang,
  marketplaceFeeAmount: number,
  currency: string
): string {
  return paymentSplitCopy[lang].button.replace(
    "{amount}",
    formatPaymentAmount(marketplaceFeeAmount, currency, lang)
  );
}
