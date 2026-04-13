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

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

type IntentResp =
  | {
      client_secret: string;
      payment_id: number | string;
      booking_request_id: number | string;
      status: string;
      provider: string;
      provider_intent_id: string;
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
          const msg =
            (j as any)?.message ||
            (j as any)?.error ||
            `HTTP ${r.status}`;
          throw new Error(msg);
        }

        const cs = (j as any)?.client_secret;
        if (typeof cs !== 'string' || cs.length < 10) {
          throw new Error('invalid_client_secret');
        }

        if (!cancelled) setClientSecret(cs);
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
      appearance: {
        theme: 'stripe' as const,
      },
    };
  }, [clientSecret]);

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Payment</h1>

      <p style={{ marginBottom: 12 }}>
        Booking reference: <b>{publicToken || '—'}</b>
      </p>

      {loading && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          Loading payment…
        </div>
      )}

      {!loading && err && (
        <div style={{ padding: 12, border: '1px solid #f2b8b8', borderRadius: 8 }}>
          <b>Payment init failed</b>
          <div style={{ marginTop: 6 }}>{err}</div>
        </div>
      )}

      {!loading && !err && !clientSecret && (
        <div style={{ padding: 12, border: '1px solid #f2b8b8', borderRadius: 8 }}>
          <b>Payment init failed</b>
          <div style={{ marginTop: 6 }}>missing_client_secret</div>
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
