import Link from "next/link";
import { isLang, t, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ payment?: string; token?: string }>;
};

type StatusPayload = {
  ok?: boolean;
  public_token?: string;
  booking_request?: {
    id?: number | string;
    status?: string | null;
    decided_at?: string | null;
    approved_at?: string | null;
    decision_note?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  payment?: {
    id?: number | string;
    provider_intent_id?: string | null;
    status?: string | null;
    booking_id?: number | string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  booking?: {
    id?: number | string;
    status?: string | null;
    payment_intent_id?: string | null;
    refund_id?: string | null;
    created_at?: string | null;
  } | null;
};

function statusLabel(lang: Lang, status: string | null | undefined): string {
  const s = String(status || "").trim();

  if (lang === "ru") {
    if (s === "paid_pending_owner") return "Ожидает подтверждения владельца";
    if (s === "confirmed") return "Подтверждено";
    if (s === "declined") return "Отклонено";
    if (s === "approved") return "Одобрено";
    if (s === "pending") return "В обработке";
    if (s === "new") return "Новая заявка";
    if (s === "succeeded") return "Платёж выполнен";
    if (s === "canceled") return "Платёж отменён";
    if (s === "requires_capture") return "Ожидает списания";
    return s || "Неизвестно";
  }

  if (lang === "me") {
    if (s === "paid_pending_owner") return "Čeka potvrdu vlasnika";
    if (s === "confirmed") return "Potvrđeno";
    if (s === "declined") return "Odbijeno";
    if (s === "approved") return "Odobreno";
    if (s === "pending") return "U obradi";
    if (s === "new") return "Novi zahtjev";
    if (s === "succeeded") return "Plaćanje uspješno";
    if (s === "canceled") return "Plaćanje otkazano";
    if (s === "requires_capture") return "Čeka naplatu";
    return s || "Nepoznato";
  }

  if (s === "paid_pending_owner") return "Waiting for owner confirmation";
  if (s === "confirmed") return "Confirmed";
  if (s === "declined") return "Declined";
  if (s === "approved") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "new") return "New request";
  if (s === "succeeded") return "Payment succeeded";
  if (s === "canceled") return "Payment canceled";
  if (s === "requires_capture") return "Awaiting capture";
  return s || "Unknown";
}

async function loadBookingStatus(token: string): Promise<StatusPayload | null> {
  const cleanToken = token.trim();
  if (!cleanToken) return null;

  const base =
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    process.env.STRAPI_URL ||
    "https://api.sharmar.me";

  const url = `${String(base).replace(/\/+$/, "")}/api/booking-requests/${encodeURIComponent(cleanToken)}/status`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as StatusPayload;
    if (!json || json.ok !== true) return null;

    return json;
  } catch {
    return null;
  }
}

export default async function ThanksPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  const sp = (await searchParams) ?? {};
  const paymentStatus = typeof sp.payment === "string" ? sp.payment.trim() : "";
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  const isPaymentSuccess = paymentStatus === "success";
  const statusData = token ? await loadBookingStatus(token) : null;

  const bookingRequestStatus = statusData?.booking_request?.status ?? null;
  const paymentBackendStatus = statusData?.payment?.status ?? null;
  const bookingStatus = statusData?.booking?.status ?? null;

  const title = isPaymentSuccess
    ? lang === "ru"
      ? "Платёж авторизован"
      : lang === "me"
        ? "Plaćanje je autorizovano"
        : "Payment authorized"
    : tr.booking.sentTitle;

  const text = isPaymentSuccess
    ? lang === "ru"
      ? "Средства на карте были авторизованы, но ещё не списаны окончательно. Мы отправили запрос владельцу лодки. После подтверждения владельцем бронирование будет подтверждено, а платёж завершён."
      : lang === "me"
        ? "Sredstva na kartici su autorizovana, ali još nijesu konačno naplaćena. Poslali smo zahtjev vlasniku broda. Nakon potvrde vlasnika, rezervacija će biti potvrđena, a plaćanje završeno."
        : "Your card has been authorized, but the payment has not been captured yet. We have sent the request to the boat owner. After the owner confirms, the booking will be confirmed and the payment will be completed."
    : tr.booking.sentText;

  const referenceLabel =
    lang === "ru"
      ? "Референс бронирования"
      : lang === "me"
        ? "Referenca rezervacije"
        : "Booking reference";

  const bookingRequestStatusLabel =
    lang === "ru"
      ? "Статус заявки"
      : lang === "me"
        ? "Status zahtjeva"
        : "Request status";

  const paymentStatusLabel =
    lang === "ru"
      ? "Статус платежа"
      : lang === "me"
        ? "Status plaćanja"
        : "Payment status";

  const bookingStatusLabel =
    lang === "ru"
      ? "Статус бронирования"
      : lang === "me"
        ? "Status rezervacije"
        : "Booking status";

  return (
    <main className="main">
      <div className="container">
        <h1 className="h1">{title}</h1>

        <p className="kicker" style={{ marginTop: 12 }}>
          {text}
        </p>

        {isPaymentSuccess && token ? (
          <p className="kicker" style={{ marginTop: 12 }}>
            {referenceLabel}: <b>{token}</b>
          </p>
        ) : null}

        {statusData ? (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div className="kicker">{bookingRequestStatusLabel}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>
              {statusLabel(lang, bookingRequestStatus)}
            </div>

            {paymentBackendStatus ? (
              <>
                <div className="kicker" style={{ marginTop: 14 }}>
                  {paymentStatusLabel}
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {statusLabel(lang, paymentBackendStatus)}
                </div>
              </>
            ) : null}

            {bookingStatus ? (
              <>
                <div className="kicker" style={{ marginTop: 14 }}>
                  {bookingStatusLabel}
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {statusLabel(lang, bookingStatus)}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="button" href={`/${lang}/boats`}>
            {tr.boat.back_to_list}
          </Link>
        </div>
      </div>
    </main>
  );
}
