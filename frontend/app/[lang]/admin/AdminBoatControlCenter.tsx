"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import {
  REQUIRED_ADMIN_LOCALES,
  localeLabel,
  strapiLocaleFromLang,
  asNumber,
  asText,
  type LogicalBoat,
  type JsonRecord,
} from "@/lib/adminUnifiedBoatWorkflow";
import {
  buildAdminMarketplaceControlCenter,
  type AdminMarketplaceBoatRow,
  type AdminMarketplaceBookingHealth,
  type AdminMarketplaceMarinaGroup,
  type AdminMarketplacePeriod,
  type AdminMarketplaceSystemHealth,
  type AdminMarketplaceMoneyTotals,
  type AdminMarketplacePreviewCompleteness,
} from "@/lib/adminMarketplaceControlCenter";
import AdminCrudManager from "./AdminCrudManager";

type Props = {
  lang: Lang;
  logicalBoats: LogicalBoat[];
  rawBoats: JsonRecord[];
  bookingRequests: JsonRecord[];
  payments: JsonRecord[];
  collectionCompleteness?: JsonRecord | null;
  owners: JsonRecord[];
  boatMessages: Record<string, string>;
  pendingBoatAction: string | null;
  onTranslateAndReview: (boat: LogicalBoat) => void | Promise<void>;
  onPublish: (boat: LogicalBoat) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

type ServerAnalyticsSummary = {
  bookingRequests?: number;
  confirmedBookings?: number;
  paidBookings?: number;
  pendingPaymentAttempts?: number;
  failedPaymentAttempts?: number;
  cancellations?: number;
  paymentsNeedingReview?: number;
  externalRefundRequired?: number;
  externalRefundCompleted?: number;
};

type ServerAnalyticsBoat = {
  documentId?: string | null;
  summary?: ServerAnalyticsSummary;
};

type ServerAnalytics = {
  ok?: boolean;
  summary?: ServerAnalyticsSummary;
  boats?: ServerAnalyticsBoat[];
  financialByCurrency?: Record<string, Record<string, string | null>>;
};

const LOGICAL_BOAT_PAGE_SIZE = 25;

const missing = {
  ru: "Нет данных",
  en: "No data",
  me: "Nema podataka",
} satisfies Record<Lang, string>;

const copy = {
  ru: {
    title: "Центр управления лодками",
    period: "Период",
    search: "Поиск",
    marina: "Марина",
    state: "Состояние",
    all: "Все",
    allTime: "Всё время",
    missingMarina: "Марина не указана",
    logicalBoats: "Логические лодки",
    requests: "Запросы",
    confirmed: "Подтверждённые",
    paid: "Оплаченные",
    pendingPayment: "Ожидание оплаты",
    cancelledRefunded: "Отмены",
    paymentErrors: "Ошибки оплаты",
    reviewPayments: "Платежи на проверке",
    externalRefundRequired: "Нужен внешний возврат",
    externalRefundCompleted: "Внешний возврат завершён",
    externalRefundNone: "Внешний возврат не нужен",
    previewUnavailable: "Предпросмотр неполный",
    bookingPreviewUnavailable: "Данные бронирований в предпросмотре неполные",
    paymentPreviewUnavailable: "Данные платежей в предпросмотре неполные",
    financialPreviewUnavailable: "Финансовые данные недоступны: предпросмотр неполный",
    analyticsLoading: "Загрузка аналитики...",
    analyticsError: "Аналитика недоступна",
    financial: "Суммы",
    fee: "Комиссия Sharmar",
    payout: "Выплаты владельцам",
    moderation: "Модерация",
    routes: "Маршруты",
    bookings: "Брони",
    paidAmount: "Оплачено",
    photos: "Фотографии",
    characteristics: "Характеристики",
    blockers: "Блокеры",
    locales: "Языковые версии",
    linkedRoutes: "Связанные маршруты",
    payments: "Бронирования и оплаты",
    latestRequests: "Последние запросы",
    owner: "Владелец",
    ownerStatus: "Статус владельца",
    paymentRecords: "Платёжные записи",
    provider: "Провайдер",
    providerTransaction: "ID транзакции/intent",
    paymentStatus: "Статус платежа",
    amount: "Сумма",
    currency: "Валюта",
    webhookReceivedAt: "Webhook получен",
    createdAt: "Создано",
    updatedAt: "Обновлено",
    needsReview: "Нужна проверка",
    email: "Email",
    phone: "Телефон",
    whatsapp: "WhatsApp",
    viber: "Viber",
    translateReview: "Перевести и проверить",
    publish: "Опубликовать",
    fullEditor: "Полный редактор переводов",
    loading: "Загрузка...",
    technical: "Техническое обслуживание лодок",
    technicalNote: "Сырые строки Strapi и опасные сервисные действия доступны только здесь.",
    systemLegend: "Состояние системы",
    bookingLegend: "Состояние бронирования/оплаты",
    boat: "Лодка",
    empty: "Нет данных для отображения.",
    pagination: "Страницы лодок",
    previous: "Назад",
    next: "Вперёд",
    page: "Страница",
    of: "из",
    total: "всего",
  },
  en: {
    title: "Boat control center",
    period: "Period",
    search: "Search",
    marina: "Marina",
    state: "State",
    all: "All",
    allTime: "All time",
    missingMarina: "Marina not specified",
    logicalBoats: "Logical boats",
    requests: "Requests",
    confirmed: "Confirmed",
    paid: "Paid",
    pendingPayment: "Pending payment",
    cancelledRefunded: "Cancellations",
    paymentErrors: "Payment errors",
    reviewPayments: "Payments needing review",
    externalRefundRequired: "External refund required",
    externalRefundCompleted: "External refund completed",
    externalRefundNone: "No external refund",
    previewUnavailable: "Preview data incomplete",
    bookingPreviewUnavailable: "Booking preview data is incomplete",
    paymentPreviewUnavailable: "Payment preview data is incomplete",
    financialPreviewUnavailable: "Financial data unavailable: preview data incomplete",
    analyticsLoading: "Loading analytics...",
    analyticsError: "Analytics unavailable",
    financial: "Amounts",
    fee: "Sharmar fee",
    payout: "Owner payouts",
    moderation: "Moderation",
    routes: "Routes",
    bookings: "Bookings",
    paidAmount: "Paid amount",
    photos: "Photos",
    characteristics: "Characteristics",
    blockers: "Blockers",
    locales: "Language versions",
    linkedRoutes: "Linked routes",
    payments: "Bookings and payments",
    latestRequests: "Latest requests",
    owner: "Owner",
    ownerStatus: "Owner status",
    paymentRecords: "Payment records",
    provider: "Provider",
    providerTransaction: "Transaction/intent ID",
    paymentStatus: "Payment status",
    amount: "Amount",
    currency: "Currency",
    webhookReceivedAt: "Webhook received",
    createdAt: "Created",
    updatedAt: "Updated",
    needsReview: "Needs review",
    email: "Email",
    phone: "Phone",
    whatsapp: "WhatsApp",
    viber: "Viber",
    translateReview: "Translate and review",
    publish: "Publish",
    fullEditor: "Full translation editor",
    loading: "Loading...",
    technical: "Technical boat maintenance",
    technicalNote: "Raw Strapi rows and dangerous service actions are available only here.",
    systemLegend: "System state",
    bookingLegend: "Booking/payment state",
    boat: "Boat",
    empty: "No data to show.",
    pagination: "Boat pages",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    total: "total",
  },
  me: {
    title: "Centar za upravljanje plovilima",
    period: "Period",
    search: "Pretraga",
    marina: "Marina",
    state: "Stanje",
    all: "Sve",
    allTime: "Sve vrijeme",
    missingMarina: "Marina nije navedena",
    logicalBoats: "Logička plovila",
    requests: "Zahtjevi",
    confirmed: "Potvrđeno",
    paid: "Plaćeno",
    pendingPayment: "Čeka plaćanje",
    cancelledRefunded: "Otkazano",
    paymentErrors: "Greške plaćanja",
    reviewPayments: "Plaćanja za provjeru",
    externalRefundRequired: "Potreban spoljašnji povrat",
    externalRefundCompleted: "Spoljašnji povrat završen",
    externalRefundNone: "Spoljašnji povrat nije potreban",
    previewUnavailable: "Podaci pregleda nijesu potpuni",
    bookingPreviewUnavailable: "Podaci bukiranja u pregledu nijesu potpuni",
    paymentPreviewUnavailable: "Podaci plaćanja u pregledu nijesu potpuni",
    financialPreviewUnavailable: "Finansijski podaci nijesu dostupni: pregled nije potpun",
    analyticsLoading: "Učitavanje analitike...",
    analyticsError: "Analitika nije dostupna",
    financial: "Iznosi",
    fee: "Sharmar provizija",
    payout: "Isplate vlasnicima",
    moderation: "Moderacija",
    routes: "Rute",
    bookings: "Bukiranja",
    paidAmount: "Plaćeni iznos",
    photos: "Fotografije",
    characteristics: "Karakteristike",
    blockers: "Blokatori",
    locales: "Jezičke verzije",
    linkedRoutes: "Povezane rute",
    payments: "Bukiranja i plaćanja",
    latestRequests: "Posljednji zahtjevi",
    owner: "Vlasnik",
    ownerStatus: "Status vlasnika",
    paymentRecords: "Zapisi plaćanja",
    provider: "Provajder",
    providerTransaction: "ID transakcije/intenta",
    paymentStatus: "Status plaćanja",
    amount: "Iznos",
    currency: "Valuta",
    webhookReceivedAt: "Webhook primljen",
    createdAt: "Kreirano",
    updatedAt: "Ažurirano",
    needsReview: "Potrebna provjera",
    email: "Email",
    phone: "Telefon",
    whatsapp: "WhatsApp",
    viber: "Viber",
    translateReview: "Prevedi i provjeri",
    publish: "Objavi",
    fullEditor: "Puni editor prevoda",
    loading: "Učitavanje...",
    technical: "Tehničko održavanje plovila",
    technicalNote: "Sirovi Strapi redovi i opasne servisne radnje dostupni su samo ovdje.",
    systemLegend: "Stanje sistema",
    bookingLegend: "Stanje bukiranja/plaćanja",
    boat: "Plovilo",
    empty: "Nema podataka za prikaz.",
    pagination: "Stranice plovila",
    previous: "Prethodna",
    next: "Sljedeća",
    page: "Stranica",
    of: "od",
    total: "ukupno",
  },
} satisfies Record<Lang, Record<string, string>>;

const systemLabels: Record<Lang, Record<AdminMarketplaceSystemHealth, string>> = {
  ru: { green: "Система в порядке", yellow: "Есть проблемы данных", red: "Заблокировано", gray: "Нет данных" },
  en: { green: "System OK", yellow: "Data issues", red: "Blocked", gray: "No data" },
  me: { green: "Sistem je u redu", yellow: "Problemi sa podacima", red: "Blokirano", gray: "Nema podataka" },
};

const bookingLabels: Record<Lang, Record<AdminMarketplaceBookingHealth, string>> = {
  ru: { red: "Ошибка/отмена", yellow: "Ожидает действия", green: "Оплачено или подтверждено", blue: "Новый запрос", gray: "Нет активности" },
  en: { red: "Error/cancel", yellow: "Waiting for action", green: "Paid or confirmed", blue: "New request", gray: "No activity" },
  me: { red: "Greška/otkaz", yellow: "Čeka radnju", green: "Plaćeno ili potvrđeno", blue: "Novi zahtjev", gray: "Bez aktivnosti" },
};

function display(value: unknown, lang: Lang): string {
  const text = asText(value);
  if (!text) return missing[lang];
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-GB";
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
    }
  }
  return text;
}

function mediaList(row: JsonRecord): string[] {
  const cover = asText(row.cover_url);
  const images = Array.isArray(row.image_urls) ? row.image_urls.map(asText).filter(Boolean) : [];
  return Array.from(new Set([cover, ...images].filter(Boolean)));
}

function routeMediaList(row: JsonRecord): string[] {
  const cover = asText(row.cover_url);
  const images = Array.isArray(row.gallery_urls) ? row.gallery_urls.map(asText).filter(Boolean) : [];
  return Array.from(new Set([cover, ...images].filter(Boolean)));
}

function amountLines(financialByCurrency: Record<string, AdminMarketplaceMoneyTotals>, field: keyof AdminMarketplaceMoneyTotals): string {
  const lines = Object.values(financialByCurrency)
    .map((totals) => {
      const value = totals[field];
      return typeof value === "number" && value > 0 ? `${value.toFixed(2)} ${totals.currency}` : "";
    })
    .filter(Boolean);
  return lines.length ? lines.join(" · ") : "";
}

function paymentAmountLines(financialByCurrency: Record<string, AdminMarketplaceMoneyTotals>): string {
  const lines = Object.values(financialByCurrency)
    .map((totals) => totals.paymentAmountMajor > 0 ? `${totals.paymentAmountMajor.toFixed(2)} ${totals.currency}` : "")
    .filter(Boolean);
  return lines.length ? lines.join(" · ") : "";
}

function serverAmountLines(
  financialByCurrency: ServerAnalytics["financialByCurrency"] | undefined,
  field: string,
): string {
  if (!financialByCurrency) return "";
  return Object.entries(financialByCurrency)
    .map(([currency, totals]) => {
      const value = totals[field];
      return value && value !== "0" && value !== "0.00" ? `${value} ${currency}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

function serverCentsLines(
  financialByCurrency: ServerAnalytics["financialByCurrency"] | undefined,
  field: string,
): string {
  if (!financialByCurrency) return "";
  return Object.entries(financialByCurrency)
    .map(([currency, totals]) => {
      const value = totals[field];
      return value && value !== "0" ? `${value} ${currency} cents` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

function externalRefundStatus(row: JsonRecord): "none" | "required" | "completed" {
  const status = asText(row.external_refund_status ?? row.externalRefundStatus).toLowerCase();
  if (status === "required" || status === "completed") return status;
  return "none";
}

function paymentProvider(payment: JsonRecord): string {
  return asText(payment.provider);
}

function paymentProviderTransactionId(payment: JsonRecord): string {
  return (
    asText(payment.provider_intent_id ?? payment.providerIntentId) ||
    asText(payment.provider_transaction_id ?? payment.providerTransactionId) ||
    asText(payment.provider_payment_id ?? payment.providerPaymentId) ||
    asText(payment.payment_intent_id ?? payment.paymentIntentId)
  );
}

function paymentStatus(payment: JsonRecord): string {
  return asText(payment.status ?? payment.provider_status ?? payment.providerStatus);
}

function paymentRecordKey(payment: JsonRecord, fallbackIndex: number): string {
  const provider = paymentProvider(payment).toLowerCase() || "payment";
  const transactionId = paymentProviderTransactionId(payment);
  const rowId = asText(payment.id) || String(asNumber(payment.id) ?? "");
  if (transactionId && rowId) return `${provider}:${transactionId}:row:${rowId}`;
  if (transactionId) return `${provider}:${transactionId}:row:${fallbackIndex}`;
  if (rowId) return `${provider}:row:${rowId}`;
  return `${provider}:row:${fallbackIndex}`;
}

function paymentAmountMajor(payment: JsonRecord): string {
  const cents = asNumber(payment.amount_cents) ?? asNumber(payment.amountCents);
  return cents === null ? "" : (Math.trunc(cents) / 100).toFixed(2);
}

function paymentReviewRequired(payment: JsonRecord): boolean {
  const status = paymentStatus(payment).toLowerCase();
  const reviewStatus = asText(payment.review_status ?? payment.reviewStatus).toLowerCase();
  return status === "succeeded_needs_review" || status === "needs_review" || reviewStatus === "needs_review";
}

function paymentDateField(payment: JsonRecord, ui: Record<string, string>) {
  const webhook = asText(payment.webhook_received_at ?? payment.webhookReceivedAt);
  if (webhook) return { label: ui.webhookReceivedAt, value: webhook };
  const created = asText(payment.created_at ?? payment.createdAt);
  if (created) return { label: ui.createdAt, value: created };
  return { label: ui.updatedAt, value: asText(payment.updated_at ?? payment.updatedAt) };
}

function healthDot(label: string, health: AdminMarketplaceSystemHealth | AdminMarketplaceBookingHealth) {
  return (
    <span className={`health-dot ${health}`} title={label} aria-label={label}>
      <span aria-hidden="true" />
      <small>{label}</small>
    </span>
  );
}

function localeStatus(row: JsonRecord | null, lang: Lang): string {
  if (!row) return missing[lang];
  const status = asText(row.moderation_status ?? row.state) || (asText(row.publishedAt) ? "published" : "");
  const titleReady = Boolean(asText(row.title));
  const slugReady = Boolean(asText(row.slug));
  return `${status || missing[lang]} · ${titleReady && slugReady ? "OK" : missing[lang]}`;
}

function ownerKey(row: JsonRecord): string | null {
  const idText = (value: unknown) => {
    const text = asText(value);
    if (text) return text;
    const number = asNumber(value);
    return number === null ? "" : String(number);
  };

  return (
    idText(row.owner_profile_id) ||
    idText(row.profile_id) ||
    idText(row.id) ||
    idText(row.owner_user_id) ||
    idText(row.user_id) ||
    idText(row.created_by_id) ||
    null
  );
}

function findOwner(boat: LogicalBoat, owners: JsonRecord[]): JsonRecord | null {
  const keys = new Set(boat.rows.map(ownerKey).filter(Boolean));
  return owners.find((owner) => {
    const candidates = [
      ownerKey(owner),
    ].filter(Boolean);
    return candidates.some((key) => keys.has(key));
  }) ?? null;
}

function ownerContact(boat: LogicalBoat, owners: JsonRecord[]) {
  const owner = findOwner(boat, owners);
  const rows = [boat.primary, ...boat.rows, owner].filter((row): row is JsonRecord => Boolean(row));
  const first = (...fields: string[]) => {
    for (const row of rows) {
      for (const field of fields) {
        const value = asText(row[field]);
        if (value) return value;
      }
    }
    return "";
  };

  return {
    name: first("owner_display_name", "display_name", "owner_username", "username"),
    email: first("owner_email", "email"),
    phone: first("owner_phone", "phone"),
    whatsapp: first("owner_whatsapp", "whatsapp", "whatsapp_number", "owner_phone", "phone"),
    viber: first("owner_viber", "viber", "viber_number"),
    status: first("owner_status", "verification_status"),
  };
}

function collectionComplete(
  collectionCompleteness: JsonRecord | null | undefined,
  key: keyof AdminMarketplacePreviewCompleteness,
): boolean {
  const collection = collectionCompleteness?.[key];
  return typeof collection === "object" &&
    collection !== null &&
    !Array.isArray(collection) &&
    (collection as JsonRecord).complete === true;
}

function initiallyOpen(row: AdminMarketplaceBoatRow): boolean {
  const statuses = row.boat.rows.map((boatRow) => asText(boatRow.moderation_status ?? boatRow.state).toLowerCase());
  return row.dataQualityIssues.length > 0 || statuses.some((status) => ["submitted", "under_review", "rejected"].includes(status));
}

function paginateMarinaGroups(
  groups: AdminMarketplaceMarinaGroup[],
  page: number,
  pageSize: number,
): AdminMarketplaceMarinaGroup[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  let seen = 0;

  return groups
    .map((group) => {
      const nextBoats = group.boats.filter(() => {
        const visible = seen >= start && seen < end;
        seen += 1;
        return visible;
      });
      return { ...group, boats: nextBoats };
    })
    .filter((group) => group.boats.length > 0);
}

export default function AdminBoatControlCenter({
  lang,
  logicalBoats,
  rawBoats,
  bookingRequests,
  payments,
  collectionCompleteness,
  owners,
  boatMessages,
  pendingBoatAction,
  onTranslateAndReview,
  onPublish,
  onRefresh,
}: Props) {
  const ui = copy[lang];
  const [period, setPeriod] = useState<AdminMarketplacePeriod>(30);
  const [search, setSearch] = useState("");
  const [marina, setMarina] = useState("all");
  const [state, setState] = useState("all");
  const [serverAnalytics, setServerAnalytics] = useState<ServerAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsReload, setAnalyticsReload] = useState(0);
  const [markerPending, setMarkerPending] = useState<string | null>(null);
  const [boatPage, setBoatPage] = useState(1);
  const analyticsRequestRef = useRef(0);
  const previewCompleteness = useMemo<AdminMarketplacePreviewCompleteness>(() => ({
    bookingRequests: collectionComplete(collectionCompleteness, "bookingRequests"),
    payments: collectionComplete(collectionCompleteness, "payments"),
  }), [collectionCompleteness]);
  const view = useMemo(
    () => buildAdminMarketplaceControlCenter(logicalBoats, bookingRequests, payments, {
      period,
      missingMarinaLabel: ui.missingMarina,
      previewCompleteness,
    }),
    [bookingRequests, logicalBoats, payments, period, previewCompleteness, ui.missingMarina],
  );
  const marinaOptions = useMemo(
    () => Array.from(new Set(view.boatRows.map((row) => row.marinaName ?? ui.missingMarina))).sort(),
    [ui.missingMarina, view.boatRows],
  );
  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return view.marinaGroups
      .map((group) => ({
        ...group,
        boats: group.boats.filter((row) => {
          const primary = row.boat.locales[strapiLocaleFromLang(lang)] ?? row.boat.primary;
          const haystack = [
            row.documentId,
            primary.title,
            row.marinaName,
            primary.moderation_status,
            primary.state,
          ].map(asText).join(" ").toLowerCase();
          const matchesSearch = needle ? haystack.includes(needle) : true;
          const matchesMarina = marina === "all" || (row.marinaName ?? ui.missingMarina) === marina;
          const matchesState = state === "all" || row.systemHealth === state || row.bookingHealth === state;
          return matchesSearch && matchesMarina && matchesState;
        }),
      }))
      .filter((group) => group.boats.length > 0);
  }, [lang, marina, search, state, ui.missingMarina, view.marinaGroups]);
  const filteredBoatCount = useMemo(
    () => filteredGroups.reduce((count, group) => count + group.boats.length, 0),
    [filteredGroups],
  );
  const boatPageCount = Math.max(1, Math.ceil(filteredBoatCount / LOGICAL_BOAT_PAGE_SIZE));
  const visibleGroups = useMemo(
    () => paginateMarinaGroups(filteredGroups, boatPage, LOGICAL_BOAT_PAGE_SIZE),
    [boatPage, filteredGroups],
  );
  const pageStatus = `${ui.page} ${Math.min(boatPage, boatPageCount)} ${ui.of} ${boatPageCount} · ${filteredBoatCount} ${ui.total}`;
  const analyticsBoats = useMemo(() => {
    const byDocument = new Map<string, ServerAnalyticsBoat>();
    for (const boat of serverAnalytics?.boats ?? []) {
      if (boat.documentId) byDocument.set(boat.documentId, boat);
    }
    return byDocument;
  }, [serverAnalytics?.boats]);
  const canonicalSummary = serverAnalytics?.summary;
  const canonicalFinancial = serverAnalytics?.financialByCurrency;
  const bookingPreviewComplete = view.previewCompleteness.bookingRequests;
  const paymentPreviewComplete = view.previewCompleteness.payments;
  const financialPreviewComplete = bookingPreviewComplete && paymentPreviewComplete;
  const metric = (
    serverValue: number | undefined,
    previewValue: number,
    previewAvailable: boolean,
    label: string,
    className?: string,
  ) => (
    <span className={className}>
      <b>{serverValue ?? (previewAvailable ? previewValue : "—")}</b>{label}
      {serverValue === undefined && !previewAvailable ? <small>{ui.previewUnavailable}</small> : null}
    </span>
  );
  const aggregateFinancial = {
    paid: canonicalFinancial
      ? serverAmountLines(canonicalFinancial, "paidCustomerTotalMajor") || missing[lang]
      : financialPreviewComplete
        ? amountLines(view.financialByCurrency, "bookingPaid") || missing[lang]
        : ui.financialPreviewUnavailable,
    fee: canonicalFinancial
      ? serverCentsLines(canonicalFinancial, "realizedMarketplaceFeeCents") || missing[lang]
      : financialPreviewComplete
        ? amountLines(view.financialByCurrency, "marketplaceFee") || missing[lang]
        : ui.financialPreviewUnavailable,
    payout: canonicalFinancial
      ? serverAmountLines(canonicalFinancial, "ownerPayoutMajor") || missing[lang]
      : financialPreviewComplete
        ? amountLines(view.financialByCurrency, "ownerPayout") || missing[lang]
        : ui.financialPreviewUnavailable,
  };

  useEffect(() => {
    const requestId = analyticsRequestRef.current + 1;
    analyticsRequestRef.current = requestId;
    const controller = new AbortController();

    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setServerAnalytics(null);
    void fetch(`/api/admin/marketplace-analytics?period=${encodeURIComponent(String(period))}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (analyticsRequestRef.current !== requestId) return;
        if (!response.ok || !json || typeof json !== "object" || (json as ServerAnalytics).ok !== true) {
          setAnalyticsError(ui.analyticsError);
          return;
        }
        setServerAnalytics(json as ServerAnalytics);
      })
      .catch(() => {
        if (!controller.signal.aborted && analyticsRequestRef.current === requestId) {
          setAnalyticsError(ui.analyticsError);
        }
      })
      .finally(() => {
        if (analyticsRequestRef.current === requestId) setAnalyticsLoading(false);
      });

    return () => controller.abort();
  }, [analyticsReload, period, ui.analyticsError]);

  useEffect(() => {
    setBoatPage(1);
  }, [marina, search, state, view.boatRows]);

  useEffect(() => {
    setBoatPage((current) => Math.min(Math.max(1, current), boatPageCount));
  }, [boatPageCount]);

  const updateExternalRefund = useCallback(async (request: JsonRecord, status: "none" | "required" | "completed") => {
    const id = asNumber(request.id);
    if (id === null || markerPending) return;
    const key = `${id}:${status}`;
    setMarkerPending(key);
    try {
      const response = await fetch(`/api/admin/booking-requests/${encodeURIComponent(String(id))}/external-refund`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ external_refund_status: status }),
      });
      if (response.ok) {
        await onRefresh();
        setServerAnalytics(null);
        setAnalyticsReload((current) => current + 1);
      }
    } finally {
      setMarkerPending(null);
    }
  }, [markerPending, onRefresh]);

  return (
    <section className="boat-control-center" aria-label={ui.title}>
      <div className="admin-card control-top">
        <div>
          <p className="kicker">Sharmar</p>
          <h2>{ui.title}</h2>
        </div>
        <div className="control-filters">
          <label>
            <span>{ui.period}</span>
            <span className="period-buttons" role="group" aria-label={ui.period}>
              {([7, 30, 90, "all"] as const).map((option) => (
                <button
                  key={String(option)}
                  type="button"
                  className={period === option ? "active" : ""}
                  onClick={() => setPeriod(option)}
                >
                  {option === "all" ? ui.allTime : option}
                </button>
              ))}
            </span>
          </label>
          <label>
            <span>{ui.search}</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label>
            <span>{ui.marina}</span>
            <select value={marina} onChange={(event) => setMarina(event.target.value)}>
              <option value="all">{ui.all}</option>
              {marinaOptions.map((option) => <option value={option} key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>{ui.state}</span>
            <select value={state} onChange={(event) => setState(event.target.value)}>
              <option value="all">{ui.all}</option>
              {(["green", "yellow", "red", "blue", "gray"] as const).map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="metric-strip">
          <span><b>{view.boatRows.length}</b>{ui.logicalBoats}</span>
          {metric(canonicalSummary?.bookingRequests, view.counters.requests, bookingPreviewComplete, ui.requests)}
          {metric(canonicalSummary?.confirmedBookings, view.counters.confirmed, bookingPreviewComplete, ui.confirmed)}
          {metric(canonicalSummary?.paidBookings, view.counters.paid, financialPreviewComplete, ui.paid)}
          {metric(canonicalSummary?.pendingPaymentAttempts, view.counters.pendingPayment, financialPreviewComplete, ui.pendingPayment)}
          {metric(canonicalSummary?.cancellations, view.counters.cancelled, bookingPreviewComplete, ui.cancelledRefunded)}
          {metric(canonicalSummary?.failedPaymentAttempts, view.counters.paymentErrors, paymentPreviewComplete, ui.paymentErrors)}
          {metric(canonicalSummary?.paymentsNeedingReview, view.counters.paymentsNeedingReview, paymentPreviewComplete, ui.reviewPayments)}
          {metric(
            canonicalSummary?.externalRefundRequired,
            view.counters.externalRefundRequired,
            bookingPreviewComplete,
            ui.externalRefundRequired,
            (canonicalSummary?.externalRefundRequired ?? (bookingPreviewComplete ? view.counters.externalRefundRequired : 0)) > 0 ? "external-required" : "",
          )}
          {metric(canonicalSummary?.externalRefundCompleted, view.counters.externalRefundCompleted, bookingPreviewComplete, ui.externalRefundCompleted)}
        </div>
        {analyticsLoading ? <p className="admin-muted">{ui.analyticsLoading}</p> : null}
        {analyticsError ? <p className="admin-error" role="alert">{analyticsError}</p> : null}
        <div className="financial-strip">
          <span>{ui.financial}: {aggregateFinancial.paid}</span>
          <span>{ui.fee}: {aggregateFinancial.fee}</span>
          <span>{ui.payout}: {aggregateFinancial.payout}</span>
        </div>
      </div>

      <div className="legend-row" aria-label={`${ui.systemLegend}. ${ui.bookingLegend}`}>
        <div className="admin-card legend-card">
          <strong>{ui.systemLegend}</strong>
          {(["green", "yellow", "red", "gray"] as AdminMarketplaceSystemHealth[]).map((health) => healthDot(systemLabels[lang][health], health))}
        </div>
        <div className="admin-card legend-card">
          <strong>{ui.bookingLegend}</strong>
          {(["red", "yellow", "green", "blue", "gray"] as AdminMarketplaceBookingHealth[]).map((health) => healthDot(bookingLabels[lang][health], health))}
        </div>
      </div>

      <div className="boat-groups">
        {filteredGroups.length ? (
          <nav className="boat-pagination" aria-label={ui.pagination}>
            <span aria-live="polite">{pageStatus}</span>
            <button
              type="button"
              aria-label={`${ui.previous}: ${pageStatus}`}
              disabled={boatPage <= 1}
              onClick={() => setBoatPage((current) => Math.max(1, current - 1))}
            >
              {ui.previous}
            </button>
            <button
              type="button"
              aria-label={`${ui.next}: ${pageStatus}`}
              disabled={boatPage >= boatPageCount}
              onClick={() => setBoatPage((current) => Math.min(boatPageCount, current + 1))}
            >
              {ui.next}
            </button>
          </nav>
        ) : null}
        {visibleGroups.map((group) => (
          <section className="marina-group" key={group.label} aria-label={group.label}>
            <h3>{group.label}</h3>
            <div className="boat-table" role="table" aria-label={group.label}>
              <div className="boat-table-head" role="row">
                <span>{ui.boat}</span>
                <span>{ui.marina}</span>
                <span>{ui.moderation}</span>
                <span>{ui.locales}</span>
                <span>{ui.routes}</span>
                <span>{ui.systemLegend}</span>
                <span>{ui.bookingLegend}</span>
                <span>{ui.bookings}</span>
                <span>{ui.paidAmount}</span>
              </div>
              {group.boats.map((row) => {
                const boat = row.boat;
                const primary = boat.locales[strapiLocaleFromLang(lang)] ?? boat.primary;
                const photos = mediaList(primary);
                const contact = ownerContact(boat, owners);
                const message = boatMessages[boat.documentId];
                const summaryTitle = display(primary.title, lang);
                const serverBoatSummary = analyticsBoats.get(row.documentId)?.summary;
                const rowBookingPreviewComplete = row.previewCompleteness.bookingRequests;
                const rowPaymentPreviewComplete = row.previewCompleteness.payments;
                const rowFinancialPreviewComplete = rowBookingPreviewComplete && rowPaymentPreviewComplete;
                const rowPreviewNotice = !rowBookingPreviewComplete && !rowPaymentPreviewComplete
                  ? ui.previewUnavailable
                  : !rowBookingPreviewComplete
                    ? ui.bookingPreviewUnavailable
                    : !rowPaymentPreviewComplete
                      ? ui.paymentPreviewUnavailable
                      : "";
                const bookingHealthLabel = rowFinancialPreviewComplete
                  ? bookingLabels[lang][row.bookingHealth]
                  : ui.previewUnavailable;
                const counters = {
                  ...row.counters,
                  requests: serverBoatSummary?.bookingRequests ?? row.counters.requests,
                  confirmed: serverBoatSummary?.confirmedBookings ?? row.counters.confirmed,
                  paid: serverBoatSummary?.paidBookings ?? row.counters.paid,
                  pendingPayment: serverBoatSummary?.pendingPaymentAttempts ?? row.counters.pendingPayment,
                  cancelled: serverBoatSummary?.cancellations ?? row.counters.cancelled,
                  paymentErrors: serverBoatSummary?.failedPaymentAttempts ?? row.counters.paymentErrors,
                  paymentsNeedingReview: serverBoatSummary?.paymentsNeedingReview ?? row.counters.paymentsNeedingReview,
                  externalRefundRequired: serverBoatSummary?.externalRefundRequired ?? row.counters.externalRefundRequired,
                  externalRefundCompleted: serverBoatSummary?.externalRefundCompleted ?? row.counters.externalRefundCompleted,
                };
                return (
                  <details className="boat-line" key={boat.documentId} open={initiallyOpen(row)}>
                    <summary aria-label={`${summaryTitle}. ${systemLabels[lang][row.systemHealth]}. ${bookingHealthLabel}`}>
                      <span className="boat-title">{summaryTitle}</span>
                      <span>{display(row.marinaName, lang)}</span>
                      <span>{display(primary.moderation_status ?? primary.state, lang)}</span>
                      <span>{REQUIRED_ADMIN_LOCALES.map((locale) => `${localeLabel(locale)} ${boat.locales[locale] ? "OK" : missing[lang]}`).join(" · ")}</span>
                      <span>{boat.routes.length}</span>
                      {healthDot(systemLabels[lang][row.systemHealth], row.systemHealth)}
                      {healthDot(bookingHealthLabel, row.bookingHealth)}
                      <span>{rowBookingPreviewComplete ? counters.requests : ui.previewUnavailable}</span>
                      <span>{rowFinancialPreviewComplete ? paymentAmountLines(row.financialByCurrency) || amountLines(row.financialByCurrency, "bookingPaid") || missing[lang] : ui.financialPreviewUnavailable}</span>
                    </summary>
                    <div className="boat-detail">
                      {rowPreviewNotice ? <p className="admin-warning" role="status">{rowPreviewNotice}</p> : null}

                      {photos.length ? (
                        <div className="media-strip" aria-label={ui.photos}>
                          {photos.slice(0, 6).map((url) => <img key={url} src={url} alt="" />)}
                        </div>
                      ) : <p className="admin-muted">{ui.photos}: {missing[lang]}</p>}

                      <dl className="admin-fields compact">
                        <div><dt>{ui.characteristics}</dt><dd>{display(primary.boat_type, lang)} · {display(primary.capacity, lang)} · {display(primary.year, lang)}</dd></div>
                        <div><dt>{ui.marina}</dt><dd>{display(row.marinaName, lang)}</dd></div>
                        <div><dt>{ui.bookings}</dt><dd>{rowBookingPreviewComplete ? counters.requests : ui.bookingPreviewUnavailable}</dd></div>
                        <div><dt>{ui.paidAmount}</dt><dd>{rowFinancialPreviewComplete ? amountLines(row.financialByCurrency, "bookingPaid") || missing[lang] : ui.financialPreviewUnavailable}</dd></div>
                        <div><dt>{ui.fee}</dt><dd>{rowFinancialPreviewComplete ? amountLines(row.financialByCurrency, "marketplaceFee") || missing[lang] : ui.financialPreviewUnavailable}</dd></div>
                        <div><dt>{ui.payout}</dt><dd>{rowFinancialPreviewComplete ? amountLines(row.financialByCurrency, "ownerPayout") || missing[lang] : ui.financialPreviewUnavailable}</dd></div>
                      </dl>

                      <section>
                        <h4>{ui.blockers}</h4>
                        {row.dataQualityIssues.length ? (
                          <ul>{row.dataQualityIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                        ) : <p className="admin-muted">{missing[lang]}</p>}
                      </section>

                      <section className="locale-grid" aria-label={ui.locales}>
                        {REQUIRED_ADMIN_LOCALES.map((locale) => (
                          <div className="locale-row" key={locale}>
                            <span>{localeLabel(locale)}</span>
                            <strong>{localeStatus(boat.locales[locale], lang)}</strong>
                          </div>
                        ))}
                      </section>

                      <section>
                        <h4>{ui.linkedRoutes}</h4>
                        {boat.routes.length ? (
                          <div className="route-stack">
                            {boat.routes.map((route) => {
                              const routePrimary = route.locales[strapiLocaleFromLang(lang)] ?? route.primary;
                              const routePhotos = routeMediaList(routePrimary);
                              return (
                                <article className="route-review" key={route.documentId}>
                                  <div className="admin-row">
                                    <div>
                                      <strong>{display(routePrimary.title, lang)}</strong>
                                      <p>{display(routePrimary.short_description ?? routePrimary.full_description, lang)}</p>
                                    </div>
                                    <span>{route.ready ? "OK" : missing[lang]}</span>
                                  </div>
                                  {routePhotos.length ? (
                                    <div className="media-strip small" aria-label={ui.photos}>
                                      {routePhotos.slice(0, 4).map((url) => <img key={url} src={url} alt="" />)}
                                    </div>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        ) : <p className="admin-muted">{missing[lang]}</p>}
                      </section>

                      <section>
                        <h4>{ui.payments}</h4>
                        <dl className="admin-fields compact">
                          <div><dt>{ui.requests}</dt><dd>{rowBookingPreviewComplete ? counters.requests : ui.bookingPreviewUnavailable}</dd></div>
                          <div><dt>{ui.confirmed}</dt><dd>{rowBookingPreviewComplete ? counters.confirmed : ui.bookingPreviewUnavailable}</dd></div>
                          <div><dt>{ui.paid}</dt><dd>{rowFinancialPreviewComplete ? counters.paid : ui.financialPreviewUnavailable}</dd></div>
                          <div><dt>{ui.pendingPayment}</dt><dd>{rowFinancialPreviewComplete ? counters.pendingPayment : ui.financialPreviewUnavailable}</dd></div>
                          <div><dt>{ui.cancelledRefunded}</dt><dd>{rowBookingPreviewComplete ? counters.cancelled : ui.bookingPreviewUnavailable}</dd></div>
                          <div><dt>{ui.paymentErrors}</dt><dd>{rowPaymentPreviewComplete ? counters.paymentErrors : ui.paymentPreviewUnavailable}</dd></div>
                          <div><dt>{ui.reviewPayments}</dt><dd>{rowPaymentPreviewComplete ? counters.paymentsNeedingReview : ui.paymentPreviewUnavailable}</dd></div>
                          <div className={rowBookingPreviewComplete && counters.externalRefundRequired > 0 ? "external-required" : ""}><dt>{ui.externalRefundRequired}</dt><dd>{rowBookingPreviewComplete ? counters.externalRefundRequired : ui.bookingPreviewUnavailable}</dd></div>
                          <div><dt>{ui.externalRefundCompleted}</dt><dd>{rowBookingPreviewComplete ? counters.externalRefundCompleted : ui.bookingPreviewUnavailable}</dd></div>
                        </dl>
                        {!rowPaymentPreviewComplete ? (
                          <p className="admin-warning" role="status">{ui.paymentPreviewUnavailable}</p>
                        ) : row.relatedPayments.length ? (
                          <ul className="payment-record-list" aria-label={ui.paymentRecords}>
                            {row.relatedPayments.map((payment, index) => {
                              const dateField = paymentDateField(payment, ui);
                              return (
                                <li key={paymentRecordKey(payment, index)}>
                                  <dl className="payment-record-fields">
                                    <div><dt>{ui.provider}</dt><dd>{display(paymentProvider(payment), lang)}</dd></div>
                                    <div><dt>{ui.providerTransaction}</dt><dd>{display(paymentProviderTransactionId(payment), lang)}</dd></div>
                                    <div><dt>{ui.paymentStatus}</dt><dd>{display(paymentStatus(payment), lang)}</dd></div>
                                    <div><dt>{ui.amount}</dt><dd>{display(paymentAmountMajor(payment), lang)}</dd></div>
                                    <div><dt>{ui.currency}</dt><dd>{display(payment.currency, lang)}</dd></div>
                                    <div><dt>{dateField.label}</dt><dd>{display(dateField.value, lang)}</dd></div>
                                  </dl>
                                  {paymentReviewRequired(payment) ? <span className="payment-review">{ui.needsReview}</span> : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : <p className="admin-muted">{missing[lang]}</p>}
                      </section>

                      <section>
                        <h4>{ui.latestRequests}</h4>
                        {!rowBookingPreviewComplete ? (
                          <p className="admin-warning" role="status">{ui.bookingPreviewUnavailable}</p>
                        ) : row.recentBookingRequests.length ? (
                          <ul>
                            {row.recentBookingRequests.map((request) => (
                              <li key={String(request.id ?? request.public_token)}>
                                {display(request.created_at ?? request.createdAt, lang)} · {display(request.status, lang)} · {display(request.customer_total_amount, lang)} {display(request.currency, lang)}
                                <div className={`external-marker ${externalRefundStatus(request)}`}>
                                  <span>
                                    {externalRefundStatus(request) === "required"
                                      ? ui.externalRefundRequired
                                      : externalRefundStatus(request) === "completed"
                                        ? ui.externalRefundCompleted
                                        : ui.externalRefundNone}
                                  </span>
                                  <div>
                                    {(["none", "required", "completed"] as const).map((status) => (
                                      <button
                                        type="button"
                                        key={status}
                                        disabled={markerPending !== null || externalRefundStatus(request) === status}
                                        onClick={() => void updateExternalRefund(request, status)}
                                      >
                                        {status === "none"
                                          ? ui.externalRefundNone
                                          : status === "required"
                                            ? ui.externalRefundRequired
                                            : ui.externalRefundCompleted}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="admin-muted">{missing[lang]}</p>}
                      </section>

                      <section>
                        <h4>{ui.owner}</h4>
                        <dl className="admin-fields compact">
                          <div><dt>{ui.owner}</dt><dd>{display(contact.name, lang)}</dd></div>
                          <div><dt>{ui.email}</dt><dd>{display(contact.email, lang)}</dd></div>
                          <div><dt>{ui.phone}</dt><dd>{display(contact.phone, lang)}</dd></div>
                          <div><dt>{ui.whatsapp}</dt><dd>{display(contact.whatsapp, lang)}</dd></div>
                          <div><dt>{ui.viber}</dt><dd>{display(contact.viber, lang)}</dd></div>
                          <div><dt>{ui.ownerStatus}</dt><dd>{display(contact.status, lang)}</dd></div>
                        </dl>
                      </section>

                      {message ? <p className={message.includes("published") || message.includes("готов") ? "admin-success" : "admin-warning"} role="status">{message}</p> : null}

                      <div className="boat-action-row">
                        <button
                          type="button"
                          aria-label={`${ui.translateReview}: ${summaryTitle}`}
                          onClick={() => void onTranslateAndReview(boat)}
                          disabled={Boolean(pendingBoatAction)}
                        >
                          {pendingBoatAction === `translate:${boat.documentId}` ? ui.loading : ui.translateReview}
                        </button>
                        <button
                          type="button"
                          aria-label={`${ui.publish}: ${summaryTitle}`}
                          onClick={() => void onPublish(boat)}
                          disabled={Boolean(pendingBoatAction) || !boat.ready}
                        >
                          {pendingBoatAction === `publish:${boat.documentId}` ? ui.loading : ui.publish}
                        </button>
                        <a href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(boat.documentId)}`}>
                          {ui.fullEditor}
                        </a>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
        {!filteredGroups.length ? <p className="admin-muted">{ui.empty}</p> : null}
      </div>

      <details className="advanced-area">
        <summary>{ui.technical}</summary>
        <p className="admin-muted">{ui.technicalNote}</p>
        <AdminCrudManager lang={lang} entity="boat" dashboardRows={rawBoats} onRefresh={onRefresh} />
      </details>

      <style jsx>{`
        .boat-control-center,
        .boat-groups {
          display: grid;
          gap: 12px;
        }
        .control-top {
          display: grid;
          gap: 12px;
        }
        .control-filters,
        .metric-strip,
        .financial-strip,
        .legend-row,
        .legend-card {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: end;
        }
        .boat-pagination {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        .boat-pagination span {
          color: rgba(246, 243, 237, 0.72);
          margin-right: auto;
        }
        .boat-pagination button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font: inherit;
          padding: 9px 10px;
        }
        .boat-pagination button:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }
        .control-filters label {
          display: grid;
          gap: 4px;
          min-width: 138px;
        }
        input,
        select {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font: inherit;
          padding: 9px 10px;
        }
        .period-buttons {
          display: inline-flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .period-buttons button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font: inherit;
          padding: 9px 10px;
        }
        .period-buttons button.active {
          border-color: #9fd8ff;
          background: rgba(159, 216, 255, 0.16);
        }
        .metric-strip span,
        .financial-strip span {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .metric-strip b {
          display: block;
          font-size: 20px;
          line-height: 1;
        }
        .metric-strip small {
          display: block;
          color: rgba(246, 243, 237, 0.72);
          font-size: 11px;
          margin-top: 4px;
        }
        .external-required {
          border-color: rgba(255, 123, 114, 0.75) !important;
          color: #ffb4ae;
        }
        .external-marker {
          display: grid;
          gap: 6px;
          margin-top: 6px;
        }
        .external-marker > div {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .external-marker.required {
          color: #ffb4ae;
        }
        .external-marker.completed {
          color: #72d18a;
        }
        .legend-row {
          align-items: stretch;
        }
        .legend-card {
          flex: 1 1 320px;
        }
        .health-dot {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          white-space: nowrap;
        }
        .health-dot > span {
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: #aeb4bd;
          flex: 0 0 auto;
        }
        .health-dot.green > span { background: #72d18a; }
        .health-dot.yellow > span { background: #ffd166; }
        .health-dot.red > span { background: #ff7b72; }
        .health-dot.blue > span { background: #9fd8ff; }
        .marina-group h3 {
          margin: 4px 0;
        }
        .boat-table {
          display: grid;
          gap: 6px;
        }
        .boat-table-head,
        .boat-line summary {
          display: grid;
          grid-template-columns: minmax(180px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(160px, 1.1fr) 72px minmax(130px, 1fr) minmax(150px, 1fr) 72px minmax(120px, 1fr);
          gap: 8px;
          align-items: center;
        }
        .boat-table-head {
          color: rgba(246, 243, 237, 0.62);
          font-size: 12px;
          padding: 0 12px;
        }
        .boat-line {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          background: rgba(14, 18, 24, 0.92);
        }
        .boat-line summary {
          cursor: pointer;
          list-style: none;
          padding: 11px 12px;
        }
        .boat-line summary::-webkit-details-marker {
          display: none;
        }
        .boat-title {
          font-weight: 800;
        }
        .boat-detail {
          display: grid;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px;
        }
        .media-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
          gap: 8px;
        }
        .media-strip.small {
          grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
        }
        .media-strip img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 8px;
        }
        .locale-grid,
        .route-stack,
        .boat-action-row {
          display: grid;
          gap: 8px;
        }
        .payment-record-list {
          display: grid;
          gap: 6px;
          list-style: none;
          margin: 8px 0 0;
          padding: 0;
        }
        .payment-record-list > li {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: grid;
          gap: 6px;
          padding: 8px;
        }
        .payment-record-fields {
          display: grid;
          gap: 6px 10px;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          margin: 0;
        }
        .payment-record-fields div {
          min-width: 0;
        }
        .payment-record-fields dt {
          color: rgba(246, 243, 237, 0.62);
          font-size: 11px;
        }
        .payment-record-fields dd {
          margin: 0;
          overflow-wrap: anywhere;
        }
        .payment-review {
          color: #ffd166;
          font-size: 12px;
          font-weight: 800;
        }
        .locale-row,
        .route-review {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 9px;
        }
        .boat-action-row {
          grid-template-columns: repeat(auto-fit, minmax(180px, max-content));
          align-items: center;
        }
        h4,
        p,
        ul {
          margin-top: 0;
        }
        @media (max-width: 1100px) {
          .boat-table-head {
            display: none;
          }
          .boat-line summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .boat-title {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 640px) {
          .boat-line summary,
          .boat-action-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
