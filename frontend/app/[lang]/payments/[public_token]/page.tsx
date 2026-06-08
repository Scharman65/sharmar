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


function errorToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

type IntentResp =
  | {
      client_secret?: string | null;
      checkout_url?: string | null;
      payment_id: number | string;
      booking_request_id?: number | string | null;
      status?: string | null;
      provider: string;
      provider_intent_id?: string | null;
      session_id?: string | null;
    }
  | {
      error: string;
      message?: string;
    };

function CheckoutForm({
  lang,
  publicToken,
}: {
  lang: string;
  publicToken: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!stripe || !elements) {
      setSubmitError('Payment form is not ready yet.');
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
      setSubmitError(result.error.message || 'Payment confirmation failed.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <PaymentElement />

        {submitError ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: '1px solid #f2b8b8',
              borderRadius: 8,
            }}
          >
            <b>Payment failed</b>
            <div style={{ marginTop: 6 }}>{submitError}</div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '46px',
            padding: '0 18px',
            borderRadius: '12px',
            border: 'none',
            background: !stripe || !elements || submitting ? '#9ca3af' : '#111827',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: !stripe || !elements || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Processing…' : 'Pay now'}
        </button>
      </div>
    </form>
  );
}

export default function PaymentPage() {
  const params = useParams<{ lang?: string; public_token?: string }>();

  const lang = typeof params?.lang === 'string' ? params.lang : 'en';
  const publicToken =
    typeof params?.public_token === 'string' ? params.public_token : '';

  const [clientSecret, setClientSecret] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr('');

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
            (j as any)?.message ||
            (j as any)?.error ||
            `HTTP ${r.status}`;
          const msg =
            typeof rawMsg === "string"
              ? rawMsg
              : JSON.stringify(rawMsg, null, 2);
          throw new Error(msg);
        }

        const detectedProvider =
          typeof (j as any)?.provider === 'string'
            ? String((j as any).provider).toLowerCase()
            : '';

        const dodoUrl = (j as any)?.checkout_url;
        if (typeof dodoUrl === 'string' && dodoUrl.startsWith('http')) {
          if (!cancelled) {
            setProvider(detectedProvider || 'dodo');
            setCheckoutUrl(dodoUrl);
          }
          return;
        }

        const cs = (j as any)?.client_secret;
        if (typeof cs !== 'string' || cs.length < 10) {
          throw new Error('missing_payment_redirect_or_client_secret');
        }

        if (!cancelled) {
          setProvider(detectedProvider || 'stripe');
          setClientSecret(cs);
        }
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return undefined;

    return {
      clientSecret,
      locale: 'en' as const,
      appearance: {
        theme: 'stripe' as const,
      },
    };
  }, [clientSecret]);

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>
        {lang === 'ru' ? 'Оплата бронирования' : lang === 'me' ? 'Plaćanje rezervacije' : 'Booking payment'}
      </h1>

      <p style={{ marginBottom: 12 }}>
        {lang === 'ru' ? 'Номер бронирования' : lang === 'me' ? 'Referenca rezervacije' : 'Booking reference'}: <b>{publicToken || '—'}</b>
      </p>

      {loading && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          {lang === 'ru' ? 'Подготовка оплаты…' : lang === 'me' ? 'Priprema plaćanja…' : 'Preparing payment…'}
        </div>
      )}

      {!loading && err && (
        <div style={{ padding: 12, border: '1px solid #f2b8b8', borderRadius: 8 }}>
          <b>{lang === 'ru' ? 'Не удалось подготовить оплату' : lang === 'me' ? 'Plaćanje nije pripremljeno' : 'Payment init failed'}</b>
          <div style={{ marginTop: 6 }}>{err}</div>
        </div>
      )}

      {!loading && !err && !clientSecret && (
        <div style={{ padding: 12, border: '1px solid #f2b8b8', borderRadius: 8 }}>
          <b>{lang === 'ru' ? 'Не удалось подготовить оплату' : lang === 'me' ? 'Plaćanje nije pripremljeno' : 'Payment init failed'}</b>
          <div style={{ marginTop: 6 }}>missing_client_secret</div>
        </div>
      )}

      {!loading && !err && checkoutUrl && (
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <p style={{ marginTop: 0 }}>
            {lang === 'ru'
              ? 'Оплата будет открыта на защищённой странице платёжного провайдера.'
              : lang === 'me'
                ? 'Plaćanje će se otvoriti na sigurnoj stranici platnog provajdera.'
                : 'Payment will open on the secure payment provider page.'}
          </p>
          <a
            href={checkoutUrl}
            style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '46px',
              padding: '0 18px',
              borderRadius: '12px',
              border: 'none',
              background: '#111827',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {lang === 'ru' ? 'Перейти к оплате' : lang === 'me' ? 'Idi na plaćanje' : 'Continue to payment'}
          </a>
        </div>
      )}

      {!loading && !err && clientSecret && elementsOptions && (
        <Elements stripe={stripePromise} options={elementsOptions}>
          <CheckoutForm lang={lang} publicToken={publicToken} />
        </Elements>
      )}
    </main>
  );
}
