'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  formatPaymentAmount,
  paymentCtaLabel,
  paymentSplitCopy,
  validatePaymentSplit,
  type PaymentSplitLang,
  type PaymentSplitValidation,
} from '@/lib/paymentSplit';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

type PaymentIntentSuccess = {
  client_secret?: string | null;
  checkout_url?: string | null;
  payment_id: number | string | null;
  booking_request_id?: number | string | null;
  status?: string | null;
  provider: string;
  provider_intent_id?: string | null;
  session_id?: string | null;
  amount_cents?: number | string | null;
  currency?: string | null;
  pricing?: {
    owner_amount?: number | string | null;
    marketplace_fee_amount?: number | string | null;
    customer_total_amount?: number | string | null;
    currency?: string | null;
  } | null;
  booking_request?: {
    id?: number | string | null;
    public_token?: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    boat?: {
      id?: number | string | null;
      title?: string | null;
      slug?: string | null;
    } | null;
    experience?: {
      title?: string | null;
      slug?: string | null;
      duration_hours?: number | string | null;
    } | null;
  } | null;
  payment_consistency?: {
    ok?: boolean;
    expected_amount_cents?: number | string | null;
    actual_amount_cents?: number | string | null;
  } | null;
};

type PaymentIntentError = {
  error: string;
  message?: string;
  payment_consistency?: PaymentIntentSuccess['payment_consistency'];
};

type IntentResp = PaymentIntentSuccess | PaymentIntentError;

const pageCopy = {
  en: {
    heading: 'Booking fee payment',
    reference: 'Request reference',
    tripDetails: 'Trip details',
    boat: 'Boat',
    route: 'Route',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    preparing: 'Preparing secure fee payment...',
    failedTitle: 'Payment is not ready',
    missingData: 'Payment details are incomplete. Please contact Sharmar support before paying.',
    mismatch:
      'The online payment amount does not match the booking fee. Payment is disabled until Sharmar checks this request.',
    noCheckout: 'The payment provider link is not available yet.',
    secureProvider:
      'Dodo will open to charge only the online booking fee. The trip price is not charged through this button.',
    stripeProvider:
      'The secure card form charges only the online booking fee. The trip price is not charged through this form.',
    payNowHint: 'Current online charge',
    ownerHint: 'Direct payment to owner',
    processing: 'Processing...',
    paymentFormNotReady: 'Payment form is not ready yet.',
    paymentFailed: 'Payment failed',
  },
  ru: {
    heading: 'Оплата комиссии за бронирование',
    reference: 'Номер заявки',
    tripDetails: 'Детали поездки',
    boat: 'Лодка',
    route: 'Маршрут',
    date: 'Дата',
    time: 'Время',
    duration: 'Длительность',
    preparing: 'Подготовка безопасной оплаты комиссии...',
    failedTitle: 'Оплата недоступна',
    missingData: 'Данные оплаты неполные. Свяжитесь с поддержкой Sharmar перед оплатой.',
    mismatch:
      'Сумма онлайн-платежа не совпадает с комиссией за бронирование. Оплата отключена, пока Sharmar не проверит эту заявку.',
    noCheckout: 'Ссылка платёжного провайдера пока недоступна.',
    secureProvider:
      'Dodo откроется для оплаты только комиссии за онлайн-бронирование. Стоимость поездки не списывается через эту кнопку.',
    stripeProvider:
      'Защищённая карточная форма списывает только комиссию за онлайн-бронирование. Стоимость поездки не списывается через эту форму.',
    payNowHint: 'Текущее онлайн-списание',
    ownerHint: 'Прямая оплата владельцу',
    processing: 'Обработка...',
    paymentFormNotReady: 'Платёжная форма ещё не готова.',
    paymentFailed: 'Платёж не прошёл',
  },
  me: {
    heading: 'Plaćanje naknade za rezervaciju',
    reference: 'Referenca zahtjeva',
    tripDetails: 'Detalji vožnje',
    boat: 'Brod',
    route: 'Ruta',
    date: 'Datum',
    time: 'Vrijeme',
    duration: 'Trajanje',
    preparing: 'Priprema sigurne uplate naknade...',
    failedTitle: 'Plaćanje nije dostupno',
    missingData: 'Detalji plaćanja nijesu potpuni. Kontaktirajte Sharmar podršku prije plaćanja.',
    mismatch:
      'Iznos online plaćanja se ne poklapa sa naknadom za rezervaciju. Plaćanje je onemogućeno dok Sharmar ne provjeri ovaj zahtjev.',
    noCheckout: 'Link platnog provajdera još nije dostupan.',
    secureProvider:
      'Dodo će se otvoriti za plaćanje samo naknade za online rezervaciju. Cijena vožnje se ne naplaćuje preko ovog dugmeta.',
    stripeProvider:
      'Sigurna kartična forma naplaćuje samo naknadu za online rezervaciju. Cijena vožnje se ne naplaćuje preko ove forme.',
    payNowHint: 'Trenutna online naplata',
    ownerHint: 'Direktno plaćanje vlasniku',
    processing: 'Obrada...',
    paymentFormNotReady: 'Forma za plaćanje još nije spremna.',
    paymentFailed: 'Plaćanje nije uspjelo',
  },
} as const;

function normalizeLang(value: unknown): PaymentSplitLang {
  return value === 'ru' || value === 'me' || value === 'en' ? value : 'en';
}

function errorToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function textValue(value: unknown): string {
  return typeof value === 'string' && value.trim().length ? value.trim() : '';
}

function formatDate(lang: PaymentSplitLang, value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  return new Intl.DateTimeFormat(lang === 'me' ? 'sr-Latn-ME' : lang, {
    dateStyle: 'medium',
    timeZone: 'Europe/Podgorica',
  }).format(date);
}

function formatTimeRange(lang: PaymentSplitLang, start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return '';

  const formatter = new Intl.DateTimeFormat(lang === 'me' ? 'sr-Latn-ME' : lang, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Podgorica',
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function formatDuration(lang: PaymentSplitLang, hours: unknown): string {
  const n = typeof hours === 'number' ? hours : Number(hours);
  if (!Number.isFinite(n) || n <= 0) return '';

  if (lang === 'ru') return `${n} ${n === 1 ? 'час' : 'часов'}`;
  if (lang === 'me') return `${n} ${n === 1 ? 'sat' : 'sati'}`;
  return `${n} ${n === 1 ? 'hour' : 'hours'}`;
}

function validationMessage(lang: PaymentSplitLang, validation: PaymentSplitValidation | null): string {
  const c = pageCopy[lang];
  if (!validation || validation.ok) return '';
  return validation.error === 'payment_fee_mismatch' ? c.mismatch : c.missingData;
}

function CheckoutForm({
  lang,
  publicToken,
  ctaLabel,
}: {
  lang: PaymentSplitLang;
  publicToken: string;
  ctaLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const copy = pageCopy[lang];

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!stripe || !elements) {
      setSubmitError(copy.paymentFormNotReady);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const returnUrl = `${window.location.origin}/${lang}/thanks?payment=success&token=${encodeURIComponent(publicToken)}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (result.error) {
      setSubmitError(result.error.message || copy.paymentFailed);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="stripe-form">
      <PaymentElement />

      {submitError ? (
        <div className="payment-alert">
          <b>{copy.paymentFailed}</b>
          <div>{submitError}</div>
        </div>
      ) : null}

      <button className="payment-cta" type="submit" disabled={!stripe || !elements || submitting}>
        {submitting ? copy.processing : ctaLabel}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const params = useParams<{ lang?: string; public_token?: string }>();

  const lang = normalizeLang(params?.lang);
  const copy = pageCopy[lang];
  const splitCopy = paymentSplitCopy[lang];
  const publicToken =
    typeof params?.public_token === 'string' ? params.public_token : '';

  const [intent, setIntent] = useState<PaymentIntentSuccess | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr('');
        setIntent(null);

        if (!publicToken) {
          throw new Error('missing_public_token');
        }

        const r = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        });

        const j = (await r.json()) as IntentResp;

        if (!r.ok) {
          const rawMsg =
            (j as PaymentIntentError)?.message ||
            (j as PaymentIntentError)?.error ||
            `HTTP ${r.status}`;
          throw new Error(typeof rawMsg === 'string' ? rawMsg : errorToText(rawMsg));
        }

        if (!cancelled) setIntent(j as PaymentIntentSuccess);
      } catch (e: unknown) {
        if (!cancelled) setErr(errorToText(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const validation = useMemo(() => {
    if (!intent) return null;
    return validatePaymentSplit({
      ownerAmount: intent.pricing?.owner_amount,
      marketplaceFeeAmount: intent.pricing?.marketplace_fee_amount,
      customerTotalAmount: intent.pricing?.customer_total_amount,
      paymentAmountCents: intent.amount_cents,
      currency: intent.pricing?.currency || intent.currency,
    });
  }, [intent]);

  const elementsOptions = useMemo(() => {
    if (!intent?.client_secret || !validation?.ok) return undefined;

    return {
      clientSecret: intent.client_secret,
      locale: 'en' as const,
      appearance: {
        theme: 'night' as const,
      },
    };
  }, [intent?.client_secret, validation]);

  const checkoutUrl =
    typeof intent?.checkout_url === 'string' && intent.checkout_url.startsWith('http')
      ? intent.checkout_url
      : '';
  const clientSecret =
    typeof intent?.client_secret === 'string' && intent.client_secret.length >= 10
      ? intent.client_secret
      : '';
  const showPaymentUi = Boolean(intent && validation?.ok);
  const ctaLabel = validation?.ok
    ? paymentCtaLabel(lang, validation.marketplaceFeeAmount, validation.currency)
    : paymentCtaLabel(lang, 0, intent?.pricing?.currency || intent?.currency || 'EUR');

  const tripRows = [
    { label: copy.boat, value: textValue(intent?.booking_request?.boat?.title) || textValue(intent?.booking_request?.boat?.slug) },
    { label: copy.route, value: textValue(intent?.booking_request?.experience?.title) || textValue(intent?.booking_request?.experience?.slug) },
    { label: copy.date, value: formatDate(lang, intent?.booking_request?.start_datetime) },
    { label: copy.time, value: formatTimeRange(lang, intent?.booking_request?.start_datetime, intent?.booking_request?.end_datetime) },
    { label: copy.duration, value: formatDuration(lang, intent?.booking_request?.experience?.duration_hours) },
  ].filter((row) => row.value);

  return (
    <main className="payment-shell">
      <section className="payment-panel" aria-labelledby="payment-title">
        <div className="payment-heading">
          <div>
            <p className="payment-eyebrow">Sharmar Marketplace</p>
            <h1 id="payment-title">{copy.heading}</h1>
          </div>
          <div className="payment-reference">
            <span>{copy.reference}</span>
            <b>{publicToken || '—'}</b>
          </div>
        </div>

        {loading ? (
          <div className="payment-state">{copy.preparing}</div>
        ) : null}

        {!loading && err ? (
          <div className="payment-alert">
            <b>{copy.failedTitle}</b>
            <div>{err}</div>
          </div>
        ) : null}

        {!loading && !err && intent ? (
          <>
            {tripRows.length ? (
              <section className="trip-section" aria-label={copy.tripDetails}>
                <h2>{copy.tripDetails}</h2>
                <div className="trip-grid">
                  {tripRows.map((row) => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <b>{row.value}</b>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="breakdown-section" aria-label={splitCopy.totalCost}>
              <div className="breakdown-lines">
                <div>
                  <span>{splitCopy.tripPrice}</span>
                  <b>{formatPaymentAmount(intent.pricing?.owner_amount, intent.pricing?.currency || intent.currency, lang)}</b>
                </div>
                <div>
                  <span>{splitCopy.onlineBookingFee}</span>
                  <b>{formatPaymentAmount(intent.pricing?.marketplace_fee_amount, intent.pricing?.currency || intent.currency, lang)}</b>
                </div>
                <div className="total-line">
                  <span>{splitCopy.totalCost}</span>
                  <b>{formatPaymentAmount(intent.pricing?.customer_total_amount, intent.pricing?.currency || intent.currency, lang)}</b>
                </div>
              </div>
            </section>

            <section className="payment-now" aria-label={splitCopy.payOnlineNow}>
              <div>
                <span>{copy.payNowHint}</span>
                <strong>{splitCopy.payOnlineNow}: {validation?.ok ? formatPaymentAmount(validation.paymentAmount, validation.currency, lang) : '—'}</strong>
              </div>
              <div>
                <span>{copy.ownerHint}</span>
                <strong>{splitCopy.payOwnerDuringTrip}: {validation?.ok ? formatPaymentAmount(validation.ownerAmount, validation.currency, lang) : '—'}</strong>
              </div>
            </section>

            <p className="payment-explanation">{splitCopy.mainExplanation}</p>

            {!validation?.ok ? (
              <div className="payment-alert">
                <b>{copy.failedTitle}</b>
                <div>{validationMessage(lang, validation)}</div>
              </div>
            ) : null}

            {showPaymentUi && checkoutUrl ? (
              <section className="checkout-section">
                <p>{copy.secureProvider}</p>
                <a className="payment-cta" href={checkoutUrl}>
                  {ctaLabel}
                </a>
              </section>
            ) : null}

            {showPaymentUi && !checkoutUrl && clientSecret && elementsOptions ? (
              <section className="checkout-section">
                <p>{copy.stripeProvider}</p>
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <CheckoutForm lang={lang} publicToken={publicToken} ctaLabel={ctaLabel} />
                </Elements>
              </section>
            ) : null}

            {showPaymentUi && !checkoutUrl && !clientSecret ? (
              <div className="payment-alert">
                <b>{copy.failedTitle}</b>
                <div>{copy.noCheckout}</div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <style>{`
        .payment-shell {
          min-height: 100vh;
          padding: 42px 20px;
          background:
            linear-gradient(180deg, rgba(7, 12, 18, 0.96), rgba(14, 19, 25, 0.98)),
            #0b1016;
          color: #f7fafc;
        }

        .payment-panel {
          width: min(100%, 980px);
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .payment-heading {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
        }

        .payment-eyebrow,
        .payment-reference span,
        .trip-grid span,
        .breakdown-lines span,
        .payment-now span {
          display: block;
          color: rgba(247, 250, 252, 0.68);
          font-size: 13px;
        }

        .payment-eyebrow {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 1.04;
          letter-spacing: 0;
        }

        h2 {
          margin: 0 0 12px;
          font-size: 18px;
        }

        .payment-reference {
          min-width: min(100%, 260px);
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          text-align: right;
        }

        .payment-reference b {
          display: block;
          margin-top: 4px;
          overflow-wrap: anywhere;
        }

        .payment-state,
        .trip-section,
        .breakdown-section,
        .checkout-section,
        .payment-alert {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.055);
          padding: 18px;
        }

        .trip-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr));
          gap: 12px;
        }

        .trip-grid b,
        .breakdown-lines b,
        .payment-now strong {
          display: block;
          margin-top: 5px;
          overflow-wrap: anywhere;
        }

        .breakdown-lines {
          display: grid;
          gap: 12px;
        }

        .breakdown-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: baseline;
        }

        .breakdown-lines b {
          text-align: right;
          font-size: 18px;
        }

        .total-line {
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
        }

        .payment-now {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .payment-now > div {
          border: 1px solid rgba(248, 214, 111, 0.28);
          border-radius: 8px;
          background: rgba(248, 214, 111, 0.10);
          padding: 16px;
        }

        .payment-now strong {
          font-size: 22px;
          line-height: 1.2;
        }

        .payment-explanation,
        .checkout-section p {
          margin: 0;
          color: rgba(247, 250, 252, 0.78);
          line-height: 1.6;
        }

        .checkout-section {
          display: grid;
          gap: 16px;
          align-items: start;
        }

        .payment-cta {
          width: fit-content;
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 8px;
          border: 1px solid rgba(248, 214, 111, 0.95);
          background: rgb(248, 214, 111);
          color: rgb(20, 24, 30);
          font-size: 16px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          box-shadow: 0 16px 34px rgba(248, 214, 111, 0.18);
        }

        .payment-cta:hover {
          background: rgb(255, 225, 130);
        }

        .payment-cta:focus-visible {
          outline: 3px solid rgba(255, 255, 255, 0.72);
          outline-offset: 3px;
        }

        .payment-cta:disabled {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.56);
          cursor: not-allowed;
          box-shadow: none;
        }

        .payment-alert {
          border-color: rgba(255, 120, 120, 0.48);
          background: rgba(110, 20, 32, 0.24);
          color: #ffe8e8;
          line-height: 1.55;
        }

        .payment-alert div {
          margin-top: 6px;
        }

        .stripe-form {
          display: grid;
          gap: 14px;
        }

        @media (max-width: 720px) {
          .payment-shell {
            padding: 28px 14px;
          }

          .payment-heading,
          .breakdown-lines > div {
            display: grid;
          }

          .payment-reference,
          .breakdown-lines b {
            text-align: left;
          }

          .payment-now {
            grid-template-columns: 1fr;
          }

          .payment-cta {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
