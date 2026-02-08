'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

type IntentResp =
  | {
      client_secret: string;
      payment_id: number;
      booking_request_id: number;
      status: string;
      provider: string;
      provider_intent_id: string;
    }
  | {
      error: string;
      message?: string;
    };

export default function PaymentPage({
  params,
}: {
  params: { lang: string; public_token: string };
}) {
  const { public_token } = params;

  const [clientSecret, setClientSecret] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr('');

        const r = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token }),
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
  }, [public_token]);

  const elementsOptions = useMemo(() => {
    return clientSecret ? { clientSecret } : undefined;
  }, [clientSecret]);

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Payment</h1>

      <p style={{ marginBottom: 12 }}>
        Booking reference: <b>{public_token}</b>
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
          <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
            <PaymentElement />
            <div style={{ marginTop: 12, color: '#666' }}>
              Next step: add “Pay” button (confirmPayment).
            </div>
          </div>
        </Elements>
      )}
    </main>
  );
}
