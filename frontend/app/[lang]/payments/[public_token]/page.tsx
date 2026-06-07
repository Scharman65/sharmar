'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type IntentResp =
  | {
      provider?: string;
      payment_id?: number | string | null;
      provider_intent_id?: string | null;
      session_id?: string | null;
      checkout_url?: string | null;
      amount_cents?: number;
      currency?: string;
      status?: string;
      booking_request_id?: number | string;
    }
  | {
      error: string;
      message?: string;
    };

export default function PaymentPage() {
  const params = useParams<{ lang?: string; public_token?: string }>();

  const publicToken =
    typeof params?.public_token === 'string' ? params.public_token : '';

  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function startPayment() {
      try {
        setLoading(true);
        setErr('');
        setCheckoutUrl('');

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
            typeof rawMsg === 'string'
              ? rawMsg
              : JSON.stringify(rawMsg, null, 2);
          throw new Error(msg);
        }

        const url = (j as any)?.checkout_url;

        if (typeof url !== 'string' || !url.startsWith('http')) {
          throw new Error('missing_checkout_url');
        }

        if (!cancelled) {
          setCheckoutUrl(url);
          window.location.assign(url);
        }
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    startPayment();

    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Payment</h1>

      <p style={{ marginBottom: 12 }}>
        Booking reference: <b>{publicToken || '—'}</b>
      </p>

      {loading && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          Preparing secure payment…
        </div>
      )}

      {!loading && err && (
        <div style={{ padding: 12, border: '1px solid #f2b8b8', borderRadius: 8 }}>
          <b>Payment init failed</b>
          <div style={{ marginTop: 6 }}>{err}</div>
        </div>
      )}

      {!loading && !err && checkoutUrl && (
        <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          Redirecting to secure payment page…
          <div style={{ marginTop: 12 }}>
            <a href={checkoutUrl}>Continue to payment</a>
          </div>
        </div>
      )}
    </main>
  );
}
