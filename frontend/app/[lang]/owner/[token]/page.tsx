import Link from "next/link";
import OwnerActions from "./OwnerActions";
import { isLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string; token: string }>;
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
    if (s === "paid_pending_owner") return "Ожидает решения владельца";
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
    if (s === "paid_pending_owner") return "Čeka odluku vlasnika";
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

  if (s === "paid_pending_owner") return "Waiting for owner decision";
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
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
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

export default async function OwnerPage({ params }: Props) {
  const { lang: rawLang, token } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";

  const statusData = await loadBookingStatus(token);

  const bookingRequestStatus = statusData?.booking_request?.status ?? null;
  const paymentStatus = statusData?.payment?.status ?? null;
  const bookingStatus = statusData?.booking?.status ?? null;

  const title =
    lang === "ru"
      ? "Решение владельца по заявке"
      : lang === "me"
        ? "Odluka vlasnika o zahtjevu"
        : "Owner decision for booking request";

  const intro =
    lang === "ru"
      ? "Страница владельца лодки. Здесь отображается текущий статус заявки, платежа и бронирования."
      : lang === "me"
        ? "Stranica za vlasnika broda. Ovdje je prikazan trenutni status zahtjeva, plaćanja i rezervacije."
        : "Boat owner page. This page shows the current request, payment, and booking status.";

  const refLabel =
    lang === "ru"
      ? "Референс заявки"
      : lang === "me"
        ? "Referenca zahtjeva"
        : "Request reference";

  const requestLabel =
    lang === "ru"
      ? "Статус заявки"
      : lang === "me"
        ? "Status zahtjeva"
        : "Request status";

  const paymentLabel =
    lang === "ru"
      ? "Статус платежа"
      : lang === "me"
        ? "Status plaćanja"
        : "Payment status";

  const bookingLabel =
    lang === "ru"
      ? "Статус бронирования"
      : lang === "me"
        ? "Status rezervacije"
        : "Booking status";

  const notFoundText =
    lang === "ru"
      ? "Не удалось загрузить статус по этому токену."
      : lang === "me"
        ? "Nije moguće učitati status za ovaj token."
        : "Could not load status for this token.";

  const backLabel =
    lang === "ru"
      ? "К списку лодок"
      : lang === "me"
        ? "Nazad na listu brodova"
        : "Back to boats";

  return (
    <main className="main">
      <div className="container">
        <h1 className="h1">{title}</h1>

        <p className="kicker" style={{ marginTop: 12 }}>
          {intro}
        </p>

        <p className="kicker" style={{ marginTop: 12 }}>
          {refLabel}: <b>{token}</b>
        </p>

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
            <div className="kicker">{requestLabel}</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>
              {statusLabel(lang, bookingRequestStatus)}
            </div>

            {paymentStatus ? (
              <>
                <div className="kicker" style={{ marginTop: 14 }}>
                  {paymentLabel}
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {statusLabel(lang, paymentStatus)}
                </div>
              </>
            ) : null}

            {bookingStatus ? (
              <>
                <div className="kicker" style={{ marginTop: 14 }}>
                  {bookingLabel}
                </div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {statusLabel(lang, bookingStatus)}
                </div>
              </>
            ) : null}

            <OwnerActions
              lang={lang}
              token={token}
              requestStatus={bookingRequestStatus}
              paymentStatus={paymentStatus}
              bookingStatus={bookingStatus}
            />
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ fontWeight: 700 }}>{notFoundText}</div>
          </div>
        )}

        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="button" href={`/${lang}/boats`}>
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
