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
    public_token?: string | null;
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    people_count?: number | string | null;
    need_skipper?: boolean | null;
    notes?: string | null;
    owner_amount?: number | string | null;
    marketplace_fee_amount?: number | string | null;
    customer_total_amount?: number | string | null;
    currency?: string | null;
    decided_at?: string | null;
    approved_at?: string | null;
    decision_note?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    boat?: {
      id?: number | string;
      document_id?: string | null;
      title?: string | null;
      slug?: string | null;
    } | null;
    experience?: {
      id?: number | string;
      document_id?: string | null;
      title?: string | null;
      slug?: string | null;
      duration_hours?: number | string | null;
      price?: number | string | null;
      currency?: string | null;
    } | null;
  } | null;
  payment?: {
    id?: number | string;
    provider?: string | null;
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
    if (s === "deposit_paid") return "Сбор за бронирование оплачен";
    if (s === "confirmed") return "Подтверждено";
    if (s === "declined") return "Отклонено";
    if (s === "approved") return "Одобрено";
    if (s === "pending") return "В обработке";
    if (s === "new") return "Новая заявка";
    if (s === "succeeded") return "Сбор за бронирование получен";
    if (s === "canceled") return "Платёж отменён";
    if (s === "requires_capture") return "Ожидает списания";
    return s || "Неизвестно";
  }

  if (lang === "me") {
    if (s === "paid_pending_owner") return "Čeka odluku vlasnika";
    if (s === "deposit_paid") return "Naknada za rezervaciju plaćena";
    if (s === "confirmed") return "Potvrđeno";
    if (s === "declined") return "Odbijeno";
    if (s === "approved") return "Odobreno";
    if (s === "pending") return "U obradi";
    if (s === "new") return "Novi zahtjev";
    if (s === "succeeded") return "Naknada za rezervaciju primljena";
    if (s === "canceled") return "Plaćanje otkazano";
    if (s === "requires_capture") return "Čeka naplatu";
    return s || "Nepoznato";
  }

  if (s === "paid_pending_owner") return "Waiting for owner decision";
  if (s === "deposit_paid") return "Booking fee paid";
  if (s === "confirmed") return "Confirmed";
  if (s === "declined") return "Declined";
  if (s === "approved") return "Approved";
  if (s === "pending") return "Pending";
  if (s === "new") return "New request";
  if (s === "succeeded") return "Booking fee received";
  if (s === "canceled") return "Payment canceled";
  if (s === "requires_capture") return "Awaiting capture";
  return s || "Unknown";
}

function copy(lang: Lang) {
  if (lang === "ru") {
    return {
      paidNote: "Сбор за бронирование оплачен Sharmar. Остаток оплачивается напрямую владельцу.",
      unpaidNote: "Заявка создана. Сбор за бронирование пока не оплачен. Подтвердите доступность, чтобы клиент мог перейти к следующему шагу.",
      requestDetails: "Детали заявки",
      boat: "Лодка",
      route: "Маршрут",
      customerName: "Имя клиента",
      customerPhone: "Телефон клиента",
      customerEmail: "Email клиента",
      dateTime: "Дата и время",
      people: "Гости",
      skipper: "Шкипер",
      yes: "Да",
      no: "Нет",
      ownerAmount: "Сумма владельцу",
      bookingFee: "Сбор Sharmar",
      totalAmount: "Итого для клиента",
      notes: "Комментарий",
      notProvided: "Не указано",
    };
  }

  if (lang === "me") {
    return {
      paidNote: "Naknada za rezervaciju je plaćena Sharmaru. Preostali iznos plaća se direktno vlasniku.",
      unpaidNote: "Zahtjev je kreiran. Naknada za rezervaciju još nije plaćena. Potvrdite dostupnost kako bi gost mogao preći na sljedeći korak.",
      requestDetails: "Detalji zahtjeva",
      boat: "Plovilo",
      route: "Ruta",
      customerName: "Ime gosta",
      customerPhone: "Telefon gosta",
      customerEmail: "Email gosta",
      dateTime: "Datum i vrijeme",
      people: "Gosti",
      skipper: "Skiper",
      yes: "Da",
      no: "Ne",
      ownerAmount: "Iznos za vlasnika",
      bookingFee: "Sharmar naknada",
      totalAmount: "Ukupno za gosta",
      notes: "Napomena",
      notProvided: "Nije navedeno",
    };
  }

  return {
    paidNote: "Booking fee has been paid to Sharmar. The remaining amount is paid directly to the owner.",
    unpaidNote: "The request has been created. The booking fee has not been paid yet. Confirm availability so the guest can proceed to the next step.",
    requestDetails: "Request details",
    boat: "Boat",
    route: "Route",
    customerName: "Guest name",
    customerPhone: "Guest phone",
    customerEmail: "Guest email",
    dateTime: "Date and time",
    people: "People",
    skipper: "Skipper",
    yes: "Yes",
    no: "No",
    ownerAmount: "Owner amount",
    bookingFee: "Sharmar booking fee",
    totalAmount: "Guest total",
    notes: "Notes",
    notProvided: "Not provided",
  };
}

function formatMoney(value: unknown, currency: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} ${currency || "EUR"}`;
}

function formatDateTime(lang: Lang, value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat(lang === "me" ? "sr-Latn-ME" : lang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Podgorica",
  }).format(date);
}

function formatRange(lang: Lang, start: string | null | undefined, end: string | null | undefined): string {
  const startText = formatDateTime(lang, start);
  const endText = formatDateTime(lang, end);
  if (startText === "—" && endText === "—") return "—";
  return `${startText} - ${endText}`;
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isPaidPayment(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toLowerCase();
  return ["succeeded", "deposit_paid", "paid_pending_owner", "confirmed"].includes(s);
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
  const br = statusData?.booking_request ?? null;
  const c = copy(lang);
  const currency = br?.currency || br?.experience?.currency || "EUR";
  const boatTitle = textValue(br?.boat?.title) || textValue(br?.boat?.slug);
  const routeTitle = textValue(br?.experience?.title) || textValue(br?.experience?.slug);
  const feeNote = statusData?.payment && isPaidPayment(paymentStatus) ? c.paidNote : c.unpaidNote;
  const detailRows = [
    { label: c.boat, value: boatTitle, visible: Boolean(boatTitle) },
    { label: c.route, value: routeTitle, visible: Boolean(routeTitle) },
    { label: c.customerName, value: textValue(br?.full_name), visible: true },
    { label: c.customerPhone, value: textValue(br?.phone), visible: true },
    { label: c.customerEmail, value: textValue(br?.email), visible: Boolean(textValue(br?.email)) },
    { label: c.dateTime, value: formatRange(lang, br?.start_datetime, br?.end_datetime), visible: true },
    { label: c.people, value: textValue(br?.people_count), visible: br?.people_count !== null && br?.people_count !== undefined },
    {
      label: c.skipper,
      value: br?.need_skipper === true ? c.yes : br?.need_skipper === false ? c.no : "",
      visible: br?.need_skipper !== null && br?.need_skipper !== undefined,
    },
    { label: c.ownerAmount, value: formatMoney(br?.owner_amount, currency), visible: br?.owner_amount !== null && br?.owner_amount !== undefined },
    { label: c.bookingFee, value: formatMoney(br?.marketplace_fee_amount, currency), visible: br?.marketplace_fee_amount !== null && br?.marketplace_fee_amount !== undefined },
    { label: c.totalAmount, value: formatMoney(br?.customer_total_amount, currency), visible: br?.customer_total_amount !== null && br?.customer_total_amount !== undefined },
    { label: c.notes, value: textValue(br?.notes), visible: Boolean(textValue(br?.notes)) },
  ];

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

        <p className="kicker" style={{ marginTop: 8 }}>
          {feeNote}
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

            <section
              aria-label={c.requestDetails}
              style={{
                marginTop: 18,
                borderTop: "1px solid rgba(255,255,255,0.12)",
                paddingTop: 18,
              }}
            >
              <div className="kicker">{c.requestDetails}</div>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {detailRows.filter((row) => row.visible).map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(140px, 0.45fr) minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.66)" }}>{row.label}</span>
                    <b style={{ overflowWrap: "anywhere" }}>{row.value || c.notProvided}</b>
                  </div>
                ))}
              </div>
            </section>

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
