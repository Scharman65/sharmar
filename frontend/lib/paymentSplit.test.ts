import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  formatPaymentAmount,
  paymentCtaLabel,
  paymentSplitCopy,
  validatePaymentSplit,
} from "./paymentSplit.ts";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Petrovac payment split validates 500/50/550 and CTA contains 50", () => {
  const split = validatePaymentSplit({
    ownerAmount: 500,
    marketplaceFeeAmount: 50,
    customerTotalAmount: 550,
    paymentAmountCents: 5000,
    currency: "EUR",
  });

  assert.equal(split.ok, true);
  assert.equal(split.ok && split.ownerAmount, 500);
  assert.equal(split.ok && split.marketplaceFeeAmount, 50);
  assert.equal(split.ok && split.customerTotalAmount, 550);
  assert.equal(split.ok && split.paymentAmount, 50);
  assert.equal(split.ok && paymentCtaLabel("ru", split.marketplaceFeeAmount, split.currency), "Оплатить комиссию 50 EUR");
});

test("Sveti Stefan payment split validates 650/65/715 and CTA contains 65", () => {
  const split = validatePaymentSplit({
    ownerAmount: 650,
    marketplaceFeeAmount: 65,
    customerTotalAmount: 715,
    paymentAmountCents: 6500,
    currency: "EUR",
  });

  assert.equal(split.ok, true);
  assert.equal(split.ok && split.ownerAmount, 650);
  assert.equal(split.ok && split.marketplaceFeeAmount, 65);
  assert.equal(split.ok && split.customerTotalAmount, 715);
  assert.equal(split.ok && split.paymentAmount, 65);
  assert.equal(split.ok && paymentCtaLabel("en", split.marketplaceFeeAmount, split.currency), "Pay booking fee 65 EUR");
});

test("RU EN ME copy uses approved labels without mixed-language fallbacks", () => {
  assert.equal(paymentSplitCopy.ru.tripPrice, "Стоимость поездки");
  assert.equal(paymentSplitCopy.ru.payOnlineNow, "Оплатить сейчас онлайн");
  assert.equal(paymentCtaLabel("ru", 50, "EUR"), "Оплатить комиссию 50 EUR");

  assert.equal(paymentSplitCopy.en.tripPrice, "Trip price");
  assert.equal(paymentSplitCopy.en.payOwnerDuringTrip, "Pay the owner during the trip");
  assert.equal(paymentCtaLabel("en", 65, "EUR"), "Pay booking fee 65 EUR");

  assert.equal(paymentSplitCopy.me.tripPrice, "Cijena vožnje");
  assert.equal(paymentSplitCopy.me.payOnlineNow, "Platite sada online");
  assert.equal(paymentCtaLabel("me", 65, "EUR"), "Platite naknadu 65 EUR");

  assert.equal(formatPaymentAmount(715, "EUR", "me"), "715 EUR");
});

test("payment mismatch and missing breakdown fail closed", () => {
  const mismatch = validatePaymentSplit({
    ownerAmount: 500,
    marketplaceFeeAmount: 50,
    customerTotalAmount: 550,
    paymentAmountCents: 55000,
    currency: "EUR",
  });

  assert.deepEqual(mismatch, { ok: false, error: "payment_fee_mismatch" });

  const missing = validatePaymentSplit({
    ownerAmount: null,
    marketplaceFeeAmount: 50,
    customerTotalAmount: 550,
    paymentAmountCents: 5000,
    currency: "EUR",
  });

  assert.deepEqual(missing, { ok: false, error: "missing_breakdown" });
});

test("payment page ignores URL amounts and disables active CTA on invalid split", () => {
  const paymentPage = source("frontend/app/[lang]/payments/[public_token]/page.tsx");

  assert.doesNotMatch(paymentPage, /useSearchParams/);
  assert.doesNotMatch(paymentPage, /searchParams/);
  assert.match(paymentPage, /validatePaymentSplit/);
  assert.match(paymentPage, /!validation\?\.ok/);
  assert.match(paymentPage, /payment_fee_mismatch/);
  assert.match(paymentPage, /paymentCtaLabel/);
  assert.doesNotMatch(paymentPage, /Перейти к оплате/);
  assert.doesNotMatch(paymentPage, /Continue to payment/);
});

test("request page shows pay-now and pay-owner split from quote amounts", () => {
  const requestPage = source("frontend/app/[lang]/request/page.tsx");

  assert.match(requestPage, /payOnlineNow/);
  assert.match(requestPage, /payOwnerDuringTrip/);
  assert.match(requestPage, /summary-payment-split/);
  assert.match(requestPage, /formatPaymentAmount\(marketplaceFeeAmount/);
  assert.match(requestPage, /formatPaymentAmount\(ownerAmount/);
});

test("Dodo checkout amount remains marketplace fee and missing breakdown fails closed", () => {
  const paymentController = source("cms/src/api/payment/controllers/payment.ts");

  assert.match(paymentController, /const chargeAmount = marketplaceFeeAmount/);
  assert.match(paymentController, /amount:\s*amountCents/);
  assert.match(paymentController, /amount_source:\s*amountSource/);
  assert.match(paymentController, /payment_breakdown_not_configured/);
  assert.match(paymentController, /payment_fee_mismatch/);
  assert.doesNotMatch(paymentController, /const chargeAmount =[\s\S]*: deposit/);
});
