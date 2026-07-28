"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/i18n";
import {
  REQUIRED_ADMIN_LOCALES,
  groupLogicalBoats,
  localeLabel,
  logicalDocumentCount,
  strapiLocaleFromLang,
  type LogicalBoat,
} from "@/lib/adminUnifiedBoatWorkflow";
import AdminCrudManager from "./AdminCrudManager";
import AdminModerationActions from "./AdminModerationActions";

type Section = "overview" | "owners" | "documents" | "boats" | "routes" | "media" | "translations" | "events";
type JsonRecord = Record<string, unknown>;

type SessionState = {
  authenticated: boolean;
  permissions: string[];
  expiresAt: number | null;
  code?: string;
};

type DashboardData = {
  ok?: boolean;
  summary?: JsonRecord;
  owners?: JsonRecord[];
  boats?: JsonRecord[];
  experiences?: JsonRecord[];
  moderationEvents?: JsonRecord[];
  warnings?: string[];
};

const DOCUMENT_REQUIREMENT_DECISION_REQUIRED = false;

const copy = {
  ru: {
    title: "Панель администратора",
    intro: "Проверка владельцев, документов, лодок, маршрутов и переводов",
    password: "Пароль администратора",
    signIn: "Войти",
    signOut: "Выйти",
    loading: "Загрузка...",
    noData: "Данные ещё не загружены",
    loadError: "Не удалось загрузить данные",
    errors: {
      invalid_admin_password: "Неверный пароль администратора.",
      admin_cookie_missing: "Cookie сессии не установлена. Проверьте, что браузер принимает cookies для sharmar.me.",
      invalid_admin_session: "Сессия администратора недействительна. Войдите снова.",
      session_expired: "Сессия администратора истекла. Войдите снова.",
      admin_session_unavailable: "Сессии администратора недоступны: на сервере не настроен ADMIN_SESSION_SECRET.",
      missing_dashboard_permission: "У этой сессии нет доступа к панели администратора.",
      dashboard_api_unavailable: "Dashboard API недоступен. Вход выполнен, но данные панели не загрузились.",
    },
    retry: "Обновить данные",
    sections: {
      overview: "Обзор",
      owners: "Владельцы",
      documents: "Документы",
      boats: "Лодки",
      routes: "Маршруты",
      media: "Медиа",
      translations: "Переводы",
      events: "Журнал действий",
    },
    cards: {
      ownersPending: "Владельцы ожидают проверки",
      documentsPending: "Документы ожидают проверки",
      boatsPending: "Лодки ожидают проверки",
      routesPending: "Маршруты ожидают проверки",
      routesRejected: "Маршруты отклонены",
      routesReady: "Маршруты готовы к публикации",
      routesPublished: "Опубликованные маршруты",
      routesWithoutBoat: "Маршруты без связи с лодкой",
      routesIncompleteTranslations: "Маршруты с неполными переводами",
      translationsAttention: "Переводы требуют внимания",
      recentActions: "Недавние действия",
    },
    actions: {
      approve: "Подтвердить",
      reject: "Отклонить",
      requestChanges: "Запросить повторную загрузку",
      preview: "Предпросмотр",
      saveDraft: "Сохранить черновик перевода",
      publish: "Опубликовать",
      translateReview: "Перевести и проверить",
      unifiedPublish: "Опубликовать",
      openFullEditor: "Открыть редактор переводов",
      openDocument: "Открыть документ",
    },
    labels: {
      name: "Имя",
      email: "Email",
      phone: "Телефон / WhatsApp",
      registered: "Дата регистрации",
      language: "Язык",
      status: "Статус",
      passport: "Паспорт",
      identity: "Удостоверение личности",
      uploadedAt: "Дата загрузки",
      created: "Дата создания",
      updated: "Дата изменения",
      notes: "Заметки",
      rejectionReason: "Причина отказа",
      owner: "Владелец",
      title: "Название",
      locale: "Язык",
      publication: "Публикация",
      photos: "Фотографии",
      completeness: "Заполненность",
      routesCount: "Маршруты",
      translationCompleteness: "Переводы",
      linkedBoat: "Связанная лодка",
      duration: "Длительность",
      price: "Цена",
      gallery: "Галерея",
      current: "Текущий статус",
      technical: "Технические сведения",
      identifier: "Технический ID",
      sourceLanguage: "Исходный язык",
      availableLocales: "Доступные языки",
      maxGuests: "Максимум гостей",
      cover: "Обложка",
      shortDescription: "Краткое описание",
      fullDescription: "Полное описание",
      includedServices: "Включённые услуги",
      meetingPoint: "Место встречи",
      boatStatus: "Статус лодки",
      boatPublication: "Публикация лодки",
      isActive: "Активен",
      missingFields: "Не заполнено",
      moderationHistory: "История модерации",
      readiness: "Готовность",
      marina: "Марина",
      description: "Описание",
      capacityYear: "Вместимость / год",
      advanced: "Расширенное обслуживание",
      locales: "Языки",
      blockers: "Что мешает публикации",
    },
    statuses: {
      draft: "Черновик",
      submitted: "Ожидает проверки",
      under_review: "На проверке",
      needs_changes: "Требует доработки",
      documents_uploaded: "Документы ожидают проверки",
      approved: "Готов к публикации",
      published: "Опубликован",
      rejected: "Отклонён",
      archived: "В архиве",
      blocked: "Заблокировано",
      new: "Новый",
      email_verified: "Email подтверждён",
      whatsapp_verified: "WhatsApp подтверждён",
    },
    empty: "Нет данных для отображения.",
    missing: "Не указано",
    routeNotAssigned: "Маршрут не связан с лодкой",
    cannotPublishRoute: "Публикация маршрута без связанной лодки запрещена.",
    translationIncomplete: "Перевод не завершён",
    translateReviewReady: "Переводы готовы. Проверка пройдена. Можно публиковать.",
    publishDone: "Лодка, переводы и маршруты опубликованы.",
    publishConfirm: "Лодка, все языки и все связанные маршруты будут опубликованы.",
    actionDone: "Действие выполнено",
    actionFailed: "Не удалось выполнить действие",
    documentRuleNeeded: "Для проверки достаточно паспорта или удостоверения личности.",
    safeErrors: "Ошибки API показываются без секретов и содержимого документов.",
    sessionOnly: "Пароль не сохраняется в браузере. Используется защищённая сессия.",
  },
  en: {
    title: "Admin dashboard",
    intro: "Review owners, documents, boats, routes, and translations",
    password: "Admin password",
    signIn: "Sign in",
    signOut: "Sign out",
    loading: "Loading...",
    noData: "Data has not been loaded yet",
    loadError: "Could not load data",
    errors: {
      invalid_admin_password: "The admin password is incorrect.",
      admin_cookie_missing: "The session cookie was not set. Check that this browser accepts cookies for sharmar.me.",
      invalid_admin_session: "The admin session is invalid. Sign in again.",
      session_expired: "The admin session has expired. Sign in again.",
      admin_session_unavailable: "Admin sessions are unavailable because ADMIN_SESSION_SECRET is not configured on the server.",
      missing_dashboard_permission: "This session does not have dashboard access.",
      dashboard_api_unavailable: "Dashboard API is unavailable. Sign-in succeeded, but dashboard data did not load.",
    },
    retry: "Refresh data",
    sections: {
      overview: "Overview",
      owners: "Owners",
      documents: "Documents",
      boats: "Boats",
      routes: "Routes",
      media: "Media",
      translations: "Translations",
      events: "Action log",
    },
    cards: {
      ownersPending: "Owners awaiting review",
      documentsPending: "Documents awaiting review",
      boatsPending: "Boats awaiting review",
      routesPending: "Routes awaiting review",
      routesRejected: "Rejected routes",
      routesReady: "Routes ready to publish",
      routesPublished: "Published routes",
      routesWithoutBoat: "Routes without a linked boat",
      routesIncompleteTranslations: "Routes with incomplete translations",
      translationsAttention: "Translations needing attention",
      recentActions: "Recent actions",
    },
    actions: {
      approve: "Approve",
      reject: "Reject",
      requestChanges: "Request reupload",
      preview: "Preview",
      saveDraft: "Save translation draft",
      publish: "Publish",
      translateReview: "Translate and review",
      unifiedPublish: "Publish",
      openFullEditor: "Open translation editor",
      openDocument: "Open document",
    },
    labels: {
      name: "Name",
      email: "Email",
      phone: "Phone / WhatsApp",
      registered: "Registration date",
      language: "Language",
      status: "Status",
      passport: "Passport document",
      identity: "Identity document",
      uploadedAt: "Upload date",
      created: "Created",
      updated: "Updated",
      notes: "Notes",
      rejectionReason: "Rejection reason",
      owner: "Owner",
      title: "Title",
      locale: "Locale",
      publication: "Publication",
      photos: "Photos",
      completeness: "Completeness",
      routesCount: "Routes",
      translationCompleteness: "Translations",
      linkedBoat: "Linked boat",
      duration: "Duration",
      price: "Price",
      gallery: "Gallery",
      current: "Current status",
      technical: "Technical details",
      identifier: "Technical ID",
      sourceLanguage: "Source language",
      availableLocales: "Available locales",
      maxGuests: "Max guests",
      cover: "Cover",
      shortDescription: "Short description",
      fullDescription: "Full description",
      includedServices: "Included services",
      meetingPoint: "Meeting point",
      boatStatus: "Boat status",
      boatPublication: "Boat publication",
      isActive: "Active",
      missingFields: "Missing fields",
      moderationHistory: "Moderation history",
      readiness: "Readiness",
      marina: "Marina",
      description: "Description",
      capacityYear: "Capacity / year",
      advanced: "Advanced maintenance",
      locales: "Languages",
      blockers: "Blocking issues",
    },
    statuses: {
      draft: "Draft",
      submitted: "Awaiting review",
      under_review: "Under review",
      needs_changes: "Needs changes",
      documents_uploaded: "Documents awaiting review",
      approved: "Ready to publish",
      published: "Published",
      rejected: "Rejected",
      archived: "Archived",
      blocked: "Blocked",
      new: "New",
      email_verified: "Email verified",
      whatsapp_verified: "WhatsApp verified",
    },
    empty: "No data to show.",
    missing: "Missing",
    routeNotAssigned: "Route is not linked to a boat",
    cannotPublishRoute: "Publishing a route without a linked boat is blocked.",
    translationIncomplete: "Translation is incomplete",
    translateReviewReady: "Translations are ready. Review passed. You can publish.",
    publishDone: "Boat, translations, and routes have been published.",
    publishConfirm: "The boat, every language, and every linked route will be published.",
    actionDone: "Action completed",
    actionFailed: "Could not complete the action",
    documentRuleNeeded: "A passport or an identity document is enough for review.",
    safeErrors: "API errors are shown without secrets or document contents.",
    sessionOnly: "The password is not stored in the browser. A protected session is used.",
  },
  me: {
    title: "Administratorska tabla",
    intro: "Provjera vlasnika, dokumenata, plovila, ruta i prevoda",
    password: "Administratorska lozinka",
    signIn: "Prijavi se",
    signOut: "Odjavi se",
    loading: "Učitavanje...",
    noData: "Podaci još nijesu učitani",
    loadError: "Podaci nijesu učitani",
    errors: {
      invalid_admin_password: "Administratorska lozinka nije tačna.",
      admin_cookie_missing: "Cookie sesije nije postavljen. Provjerite da pregledač prihvata cookies za sharmar.me.",
      invalid_admin_session: "Administratorska sesija nije važeća. Prijavite se ponovo.",
      session_expired: "Administratorska sesija je istekla. Prijavite se ponovo.",
      admin_session_unavailable: "Administratorske sesije nijesu dostupne jer ADMIN_SESSION_SECRET nije podešen na serveru.",
      missing_dashboard_permission: "Ova sesija nema pristup administratorskoj tabli.",
      dashboard_api_unavailable: "Dashboard API nije dostupan. Prijava je uspjela, ali podaci table nijesu učitani.",
    },
    retry: "Osvježi podatke",
    sections: {
      overview: "Pregled",
      owners: "Vlasnici",
      documents: "Dokumenti",
      boats: "Plovila",
      routes: "Rute",
      media: "Mediji",
      translations: "Prevodi",
      events: "Dnevnik radnji",
    },
    cards: {
      ownersPending: "Vlasnici čekaju provjeru",
      documentsPending: "Dokumenti čekaju provjeru",
      boatsPending: "Plovila čekaju provjeru",
      routesPending: "Rute čekaju provjeru",
      routesRejected: "Odbijene rute",
      routesReady: "Rute spremne za objavu",
      routesPublished: "Objavljene rute",
      routesWithoutBoat: "Rute bez povezanog plovila",
      routesIncompleteTranslations: "Rute sa nepotpunim prevodom",
      translationsAttention: "Prevodi traže pažnju",
      recentActions: "Nedavne radnje",
    },
    actions: {
      approve: "Potvrdi",
      reject: "Odbij",
      requestChanges: "Zatraži ponovno slanje",
      preview: "Pregled",
      saveDraft: "Sačuvaj nacrt prevoda",
      publish: "Objavi",
      translateReview: "Prevedi i provjeri",
      unifiedPublish: "Objavi",
      openFullEditor: "Otvori editor prevoda",
      openDocument: "Otvori dokument",
    },
    labels: {
      name: "Ime",
      email: "Email",
      phone: "Telefon / WhatsApp",
      registered: "Datum registracije",
      language: "Jezik",
      status: "Status",
      passport: "Pasoš",
      identity: "Lična karta",
      uploadedAt: "Datum slanja",
      created: "Datum kreiranja",
      updated: "Datum izmjene",
      notes: "Bilješke",
      rejectionReason: "Razlog odbijanja",
      owner: "Vlasnik",
      title: "Naziv",
      locale: "Jezik",
      publication: "Objava",
      photos: "Fotografije",
      completeness: "Popunjenost",
      routesCount: "Rute",
      translationCompleteness: "Prevodi",
      linkedBoat: "Povezano plovilo",
      duration: "Trajanje",
      price: "Cijena",
      gallery: "Galerija",
      current: "Trenutni status",
      technical: "Tehnički detalji",
      identifier: "Tehnički ID",
      sourceLanguage: "Izvorni jezik",
      availableLocales: "Dostupni jezici",
      maxGuests: "Maksimalno gostiju",
      cover: "Naslovna slika",
      shortDescription: "Kratak opis",
      fullDescription: "Pun opis",
      includedServices: "Uključene usluge",
      meetingPoint: "Mjesto susreta",
      boatStatus: "Status plovila",
      boatPublication: "Objava plovila",
      isActive: "Aktivno",
      missingFields: "Nedostaju polja",
      moderationHistory: "Istorija moderacije",
      readiness: "Spremnost",
      marina: "Marina",
      description: "Opis",
      capacityYear: "Kapacitet / godina",
      advanced: "Napredno održavanje",
      locales: "Jezici",
      blockers: "Šta blokira objavu",
    },
    statuses: {
      draft: "Nacrt",
      submitted: "Čeka provjeru",
      under_review: "U provjeri",
      needs_changes: "Potrebna dorada",
      documents_uploaded: "Dokumenti čekaju provjeru",
      approved: "Spremno za objavu",
      published: "Objavljeno",
      rejected: "Odbijeno",
      archived: "Arhivirano",
      blocked: "Blokirano",
      new: "Novo",
      email_verified: "Email potvrđen",
      whatsapp_verified: "WhatsApp potvrđen",
    },
    empty: "Nema podataka za prikaz.",
    missing: "Nije navedeno",
    routeNotAssigned: "Ruta nije povezana sa plovilom",
    cannotPublishRoute: "Objava rute bez povezanog plovila je blokirana.",
    translationIncomplete: "Prevod nije završen",
    translateReviewReady: "Prevodi su spremni. Provjera je prošla. Možete objaviti.",
    publishDone: "Plovilo, prevodi i rute su objavljeni.",
    publishConfirm: "Plovilo, svi jezici i sve povezane rute biće objavljeni.",
    actionDone: "Radnja je izvršena",
    actionFailed: "Radnja nije izvršena",
    documentRuleNeeded: "Za provjeru je dovoljan pasoš ili lična karta.",
    safeErrors: "API greške se prikazuju bez tajni i sadržaja dokumenata.",
    sessionOnly: "Lozinka se ne čuva u pregledaču. Koristi se zaštićena sesija.",
  },
} satisfies Record<Lang, {
  title: string;
  intro: string;
  password: string;
  signIn: string;
  signOut: string;
  loading: string;
  noData: string;
  loadError: string;
  errors: Record<string, string>;
  retry: string;
  sections: Record<Section, string>;
  cards: Record<string, string>;
  actions: Record<string, string>;
  labels: Record<string, string>;
  statuses: Record<string, string>;
  empty: string;
  missing: string;
  routeNotAssigned: string;
  cannotPublishRoute: string;
  translationIncomplete: string;
  translateReviewReady: string;
  publishDone: string;
  publishConfirm: string;
  actionDone: string;
  actionFailed: string;
  documentRuleNeeded: string;
  safeErrors: string;
  sessionOnly: string;
}>;

function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asJsonRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function statusLabel(lang: Lang, value: unknown): string {
  const key = asText(value);
  const statuses: Record<string, string> = copy[lang].statuses;
  return key ? statuses[key] ?? key : copy[lang].missing;
}

function display(value: unknown, lang: Lang): string {
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (typeof value === "number") return String(value);
  const text = asText(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-GB";
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }
  }
  return text || copy[lang].missing;
}

function ownerName(owner: JsonRecord, lang: Lang): string {
  return asText(owner.display_name) || asText(owner.username) || asText(owner.email) || copy[lang].missing;
}

function docList(owner: JsonRecord): JsonRecord[] {
  return Array.isArray(owner.documents) ? owner.documents.filter((item): item is JsonRecord => typeof item === "object" && item !== null) : [];
}

function hasDocument(owner: JsonRecord, field: string): boolean {
  return docList(owner).some((doc) => asText(doc.field) === field);
}

function documentFieldLabel(lang: Lang, field: unknown): string {
  const value = asText(field);
  if (value === "passport_document") return copy[lang].labels.passport;
  if (value === "identity_document") return copy[lang].labels.identity;
  return display(field, lang);
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(asText).filter(Boolean)
    : [];
}

function awaitingOwner(owner: JsonRecord): boolean {
  return ["documents_uploaded", "under_review"].includes(asText(owner.verification_status));
}

function awaitingBoat(boat: JsonRecord): boolean {
  return ["submitted", "under_review"].includes(asText(boat.moderation_status));
}

function routeNeedsAttention(route: JsonRecord): boolean {
  return ["submitted", "under_review"].includes(asText(route.moderation_status)) || !asText(route.boatDocumentId);
}

function routeEvents(route: JsonRecord, events: JsonRecord[]): JsonRecord[] {
  const documentId = asText(route.documentId);
  return events.filter((event) => (
    asText(asJsonRecord(event.metadata)?.subjectEntityType) === "experience" &&
    asText(asJsonRecord(event.metadata)?.subjectDocumentId) === documentId
  ));
}

function adminErrorMessage(ui: (typeof copy)[Lang], code: string | undefined): string {
  const errors: Record<string, string> = ui.errors;
  return code ? errors[code] ?? `${ui.loadError} (${code}).` : ui.loadError;
}

function mediaList(row: JsonRecord): string[] {
  const cover = asText(row.cover_url);
  const images = Array.isArray(row.image_urls)
    ? row.image_urls.map(asText).filter(Boolean)
    : [];
  return Array.from(new Set([cover, ...images].filter(Boolean)));
}

function routeMediaList(row: JsonRecord): string[] {
  const cover = asText(row.cover_url);
  const images = Array.isArray(row.gallery_urls)
    ? row.gallery_urls.map(asText).filter(Boolean)
    : [];
  return Array.from(new Set([cover, ...images].filter(Boolean)));
}

function localeStatus(row: JsonRecord | null, lang: Lang): string {
  if (!row) return "—";
  const status = asText(row.publishedAt) ? "published" : asText(row.state) || "draft";
  const titleReady = Boolean(asText(row.title));
  const slugReady = Boolean(asText(row.slug));
  return `${statusLabel(lang, status)} · ${titleReady && slugReady ? "✓" : "—"}`;
}

function primaryPrice(row: JsonRecord, lang: Lang): string {
  const price = asNumber(row.price_per_day ?? row.price_per_hour ?? row.sale_price);
  const currency = asText(row.currency) || "EUR";
  return price === null ? display(null, lang) : `${price} ${currency}`;
}

function routePrice(row: JsonRecord, lang: Lang): string {
  const price = asNumber(row.price);
  const currency = asText(row.currency) || "EUR";
  return price === null ? display(null, lang) : `${price} ${currency}`;
}

export default function AdminCockpitClient({ lang }: { lang: Lang }) {
  const ui = copy[lang];
  const [session, setSession] = useState<SessionState>({ authenticated: false, permissions: [], expiresAt: null });
  const [password, setPassword] = useState("");
  const [active, setActive] = useState<Section>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boatMessages, setBoatMessages] = useState<Record<string, string>>({});
  const [pendingBoatAction, setPendingBoatAction] = useState<string | null>(null);

  const owners = useMemo(() => data?.owners ?? [], [data?.owners]);
  const boats = useMemo(() => data?.boats ?? [], [data?.boats]);
  const routes = useMemo(() => data?.experiences ?? [], [data?.experiences]);
  const events = useMemo(() => data?.moderationEvents ?? [], [data?.moderationEvents]);
  const logicalBoats = useMemo(() => groupLogicalBoats(boats, routes, lang), [boats, routes, lang]);
  const documents = owners.flatMap((owner) =>
    docList(owner).map((document) => ({
      ...document,
      owner_display_name: ownerName(owner, lang),
      owner_profile_id: owner.profile_id ?? owner.id,
      verification_status: owner.verification_status,
      updated_at: document.updated_at ?? owner.documents_uploaded_at ?? owner.updated_at,
    }))
  );
  const ownersPending = owners.filter(awaitingOwner).length;
  const documentsPending = owners.filter((owner) => docList(owner).length > 0 && awaitingOwner(owner)).length;
  const boatsPending = logicalBoats.filter((boat) => boat.rows.some(awaitingBoat)).length;
  const routesPending = asNumber(data?.summary?.experiencesAwaitingReview) ?? routes.filter(routeNeedsAttention).length;
  const routesRejected = asNumber(data?.summary?.experiencesRejected) ?? routes.filter((route) => asText(route.moderation_status) === "rejected").length;
  const routesReady = asNumber(data?.summary?.experiencesReadyToPublish) ?? routes.filter((route) => asText(route.moderation_status) === "approved").length;
  const routesPublished = asNumber(data?.summary?.experiencesPublished) ?? routes.filter((route) => asText(route.moderation_status) === "published").length;
  const routesWithoutBoat = asNumber(data?.summary?.experiencesWithoutBoat) ?? routes.filter((route) => !asText(route.boatDocumentId)).length;
  const routesIncompleteTranslations = asNumber(data?.summary?.experiencesWithIncompleteTranslations) ?? routes.filter((route) => !route.translation_complete).length;
  const translationsNeedingAttention = logicalBoats.filter((boat) => !boat.ready).length;
  const logicalRouteCount = logicalDocumentCount(routes);

  const nav = useMemo(
    () => (Object.keys(ui.sections) as Section[]).map((id) => ({ id, label: ui.sections[id] })),
    [ui.sections]
  );

  const setActiveSection = useCallback((section: Section) => {
    setActive(section);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", section);
      window.history.replaceState(null, "", url);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const fallback: SessionState = {
      authenticated: false,
      permissions: [],
      expiresAt: null,
      code: "admin_session_unavailable",
    };

    try {
      const response = await fetch("/api/admin/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object") {
        setSession(fallback);
        return fallback;
      }

      const nextSession: SessionState = {
        authenticated: Boolean((json as SessionState).authenticated),
        permissions: Array.isArray((json as SessionState).permissions) ? (json as SessionState).permissions : [],
        expiresAt: asNumber((json as SessionState).expiresAt),
        code: asText((json as SessionState).code),
      };
      setSession(nextSession);
      return nextSession;
    } catch {
      setSession(fallback);
      return fallback;
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object" || (json as DashboardData).ok !== true) {
        const code = json && typeof json === "object" ? asText((json as { code?: unknown }).code) : "";
        if (response.status === 401) {
          setSession({ authenticated: false, permissions: [], expiresAt: null, code });
          setData(null);
          setError(adminErrorMessage(ui, code || "invalid_admin_session"));
          return;
        }
        setError(adminErrorMessage(ui, code || "dashboard_api_unavailable"));
        return;
      }
      setData(json as DashboardData);
    } catch {
      setError(adminErrorMessage(ui, "dashboard_api_unavailable"));
    } finally {
      setLoading(false);
    }
  }, [ui]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object" || (json as { ok?: boolean }).ok !== true) {
        const code = json && typeof json === "object" ? asText((json as { code?: unknown }).code) : "";
        setError(adminErrorMessage(ui, code || "invalid_admin_password"));
        return;
      }
      setPassword("");
      const nextSession = await refreshSession();
      if (!nextSession.authenticated) {
        setError(adminErrorMessage(ui, nextSession.code || "admin_cookie_missing"));
        return;
      }
      await loadDashboard();
    } catch {
      setError(adminErrorMessage(ui, "admin_session_unavailable"));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
    });
    setSession({ authenticated: false, permissions: [], expiresAt: null });
    setData(null);
    setPassword("");
    setActive("overview");
  }

  async function translateAndReview(boat: LogicalBoat) {
    if (pendingBoatAction) return;
    const sourceLocale = strapiLocaleFromLang(lang);
    const targetLocales = REQUIRED_ADMIN_LOCALES.filter((locale) => locale !== sourceLocale);
    const key = `translate:${boat.documentId}`;
    setPendingBoatAction(key);
    setBoatMessages((current) => ({ ...current, [boat.documentId]: ui.loading }));
    try {
      const previewResponse = await fetch("/api/admin/translations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          boatDocumentId: boat.documentId,
          sourceLocale,
          targetLocales,
          generateAi: true,
        }),
      });
      const previewJson = await previewResponse.json().catch(() => null);
      if (!previewResponse.ok || !previewJson || typeof previewJson !== "object" || !(previewJson as JsonRecord).aiPreview) {
        setBoatMessages((current) => ({
          ...current,
          [boat.documentId]: adminErrorMessage(ui, asText((previewJson as JsonRecord | null)?.code) || "openai_request_failed"),
        }));
        return;
      }

      const saveResponse = await fetch("/api/admin/translations/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          dryRun: false,
          confirmSaveDraft: true,
          overwrite: false,
          boatDocumentId: boat.documentId,
          sourceLocale,
          targetLocales,
          aiPreview: (previewJson as JsonRecord).aiPreview,
        }),
      });
      const saveJson = await saveResponse.json().catch(() => null);
      if (!saveResponse.ok || !saveJson || typeof saveJson !== "object" || (saveJson as JsonRecord).ok !== true) {
        setBoatMessages((current) => ({
          ...current,
          [boat.documentId]: adminErrorMessage(ui, asText((saveJson as JsonRecord | null)?.code) || "save_draft_failed"),
        }));
        return;
      }

      await loadDashboard();
      setBoatMessages((current) => ({ ...current, [boat.documentId]: ui.translateReviewReady }));
    } catch {
      setBoatMessages((current) => ({ ...current, [boat.documentId]: adminErrorMessage(ui, "dashboard_api_unavailable") }));
    } finally {
      setPendingBoatAction(null);
    }
  }

  async function publishLogicalBoat(boat: LogicalBoat) {
    if (pendingBoatAction || !boat.ready) return;
    if (!window.confirm(ui.publishConfirm)) return;
    const key = `publish:${boat.documentId}`;
    setPendingBoatAction(key);
    setBoatMessages((current) => ({ ...current, [boat.documentId]: ui.loading }));
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          entityType: "boat",
          documentId: boat.documentId,
          action: "publish_logical_boat",
          batchOperationId: `boat-${boat.documentId}-${Date.now()}`,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object" || (json as JsonRecord).ok !== true) {
        const blockers = Array.isArray((json as JsonRecord | null)?.blockers)
          ? ((json as JsonRecord).blockers as unknown[]).map(asText).filter(Boolean).join(" ")
          : "";
        setBoatMessages((current) => ({
          ...current,
          [boat.documentId]: blockers || adminErrorMessage(ui, asText((json as JsonRecord | null)?.code) || "strapi_moderation_failed"),
        }));
        return;
      }
      await loadDashboard();
      setBoatMessages((current) => ({ ...current, [boat.documentId]: ui.publishDone }));
    } catch {
      setBoatMessages((current) => ({ ...current, [boat.documentId]: adminErrorMessage(ui, "dashboard_api_unavailable") }));
    } finally {
      setPendingBoatAction(null);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = new URLSearchParams(window.location.search).get("section");
    if (section && (Object.keys(ui.sections) as string[]).includes(section)) {
      setActive(section as Section);
    }
  }, [ui.sections]);

  useEffect(() => {
    if (session.authenticated && !data && !loading) void loadDashboard();
  }, [data, loadDashboard, loading, session.authenticated]);

  return (
    <main className="admin-cockpit">
      <section className="admin-card admin-hero">
        <div>
          <p className="kicker">Sharmar</p>
          <h1>{ui.title}</h1>
          <p>{ui.intro}</p>
          <p className="admin-muted">{ui.sessionOnly}</p>
        </div>
        {session.authenticated ? (
          <button type="button" className="admin-secondary" onClick={() => void signOut()}>
            {ui.signOut}
          </button>
        ) : null}
      </section>

      {!session.authenticated ? (
        <form className="admin-card admin-login" onSubmit={signIn}>
          <label>
            <span>{ui.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? ui.loading : ui.signIn}</button>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
        </form>
      ) : (
        <>
          <nav className="admin-nav" aria-label={ui.title}>
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={active === item.id ? "active" : ""}
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={() => void loadDashboard()}>{ui.retry}</button>
          </nav>

          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          {!data ? <p className="admin-muted">{loading ? ui.loading : ui.noData}</p> : null}

          {data ? (
            <>
              {active === "overview" ? (
                <section className="admin-grid">
                  {[
                    [ui.cards.ownersPending, ownersPending],
                    [ui.cards.documentsPending, documentsPending],
                    [ui.cards.boatsPending, boatsPending],
                    [ui.sections.boats, logicalBoats.length],
                    [ui.sections.routes, logicalRouteCount],
                    [ui.cards.routesPending, routesPending],
                    [ui.cards.routesRejected, routesRejected],
                    [ui.cards.routesReady, routesReady],
                    [ui.cards.routesPublished, routesPublished],
                    [ui.cards.routesWithoutBoat, routesWithoutBoat],
                    [ui.cards.routesIncompleteTranslations, routesIncompleteTranslations],
                    [ui.cards.translationsAttention, translationsNeedingAttention],
                    [ui.cards.recentActions, events.length],
                  ].map(([label, value]) => (
                    <article className="admin-card metric" key={String(label)}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                  <article className="admin-card wide">
                    <h2>{ui.sections.overview}</h2>
                    <p>{ui.safeErrors}</p>
                    {DOCUMENT_REQUIREMENT_DECISION_REQUIRED ? <p>{ui.documentRuleNeeded}</p> : null}
                  </article>
                </section>
              ) : null}

              {active === "owners" ? (
                <section className="admin-list">
                  <AdminCrudManager lang={lang} entity="owner" dashboardRows={owners} onRefresh={loadDashboard} />
                  {owners.map((owner, index) => (
                    <article className="admin-card" key={`${display(owner.profile_id ?? owner.id, lang)}-${index}`}>
                      <div className="admin-row">
                        <div>
                          <h2>{ownerName(owner, lang)}</h2>
                          <p>{display(owner.email, lang)} · {display(owner.phone, lang)}</p>
                        </div>
                        <strong>{statusLabel(lang, owner.verification_status)}</strong>
                      </div>
                      <dl className="admin-fields">
                        <div><dt>{ui.labels.registered}</dt><dd>{display(owner.created_at, lang)}</dd></div>
                        <div><dt>{ui.labels.language}</dt><dd>{display(owner.preferred_language, lang)}</dd></div>
                        <div><dt>{ui.labels.notes}</dt><dd>{display(owner.notes, lang)}</dd></div>
                        <div><dt>{ui.labels.rejectionReason}</dt><dd>{display(owner.rejection_reason, lang)}</dd></div>
                      </dl>
                      <AdminModerationActions
                        lang={lang}
                        entityType="owner_profile"
                        profileId={asNumber(owner.profile_id ?? owner.id) ?? undefined}
                        status={asText(owner.verification_status)}
                        onComplete={loadDashboard}
                      />
                    </article>
                  ))}
                  {!owners.length ? <p className="admin-muted">{ui.empty}</p> : null}
                </section>
              ) : null}

              {active === "documents" ? (
                <section className="admin-list">
                  <AdminCrudManager lang={lang} entity="document" dashboardRows={documents} onRefresh={loadDashboard} />
                  {owners.map((owner, index) => (
                    <article className="admin-card" key={`docs-${display(owner.profile_id ?? owner.id, lang)}-${index}`}>
                      <div className="admin-row">
                        <div>
                          <h2>{ownerName(owner, lang)}</h2>
                          <p>{statusLabel(lang, owner.verification_status)}</p>
                        </div>
                        <strong>{docList(owner).length}</strong>
                      </div>
                      <dl className="admin-fields">
                        <div><dt>{ui.labels.passport}</dt><dd>{hasDocument(owner, "passport_document") ? "✓" : "—"}</dd></div>
                        <div><dt>{ui.labels.identity}</dt><dd>{hasDocument(owner, "identity_document") ? "✓" : "—"}</dd></div>
                        <div><dt>{ui.labels.uploadedAt}</dt><dd>{display(owner.documents_uploaded_at, lang)}</dd></div>
                      </dl>
                      <ul className="document-list">
                        {docList(owner).map((document, docIndex) => {
                          const url = asText(document.url);
                          return (
                            <li key={`${display(document.id ?? document.name, lang)}-${docIndex}`}>
                              {url ? (
                                <a href={url} target="_blank" rel="noreferrer">{ui.actions.openDocument}: {documentFieldLabel(lang, document.field)}</a>
                              ) : (
                                <span>{documentFieldLabel(lang, document.field)}: {display(document.name, lang)}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ))}
                </section>
              ) : null}

              {active === "boats" ? (
                <section className="admin-list">
                  {logicalBoats.map((boat) => {
                    const primary = boat.locales[strapiLocaleFromLang(lang)] ?? boat.primary;
                    const photos = mediaList(primary);
                    const message = boatMessages[boat.documentId];
                    return (
                      <article className="admin-card boat-review-card" key={boat.documentId}>
                        <div className="admin-row">
                          <div>
                            <h2>{display(primary.title, lang)}</h2>
                            <p>{display(primary.owner_display_name ?? primary.owner_email, lang)}</p>
                          </div>
                          <strong>{boat.ready ? "✓" : statusLabel(lang, primary.moderation_status)}</strong>
                        </div>

                        {photos.length ? (
                          <div className="media-strip" aria-label={ui.labels.photos}>
	                            {photos.slice(0, 6).map((url) => (
	                              <img key={url} src={url} alt="" />
	                            ))}
                          </div>
                        ) : null}

                        <dl className="admin-fields">
                          <div><dt>{ui.labels.marina}</dt><dd>{display(primary.marina_name, lang)}</dd></div>
                          <div><dt>{ui.labels.description}</dt><dd>{display(primary.description, lang)}</dd></div>
                          <div><dt>{ui.labels.price}</dt><dd>{primaryPrice(primary, lang)}</dd></div>
                          <div><dt>{ui.labels.capacityYear}</dt><dd>{display(primary.capacity, lang)} / {display(primary.year, lang)}</dd></div>
                          <div><dt>{ui.labels.photos}</dt><dd>{display(photos.length || ((asNumber(primary.cover_count) ?? 0) + (asNumber(primary.images_count) ?? 0)), lang)}</dd></div>
                          <div><dt>{ui.labels.routesCount}</dt><dd>{display(boat.routes.length, lang)}</dd></div>
                        </dl>

                        <div className="locale-grid" aria-label={ui.labels.locales}>
                          {REQUIRED_ADMIN_LOCALES.map((locale) => (
                            <div className="locale-row" key={locale}>
                              <span>{localeLabel(locale)}</span>
                              <strong>{localeStatus(boat.locales[locale], lang)}</strong>
                            </div>
                          ))}
                        </div>

                        {boat.routes.length ? (
                          <div className="route-stack">
                            {boat.routes.map((route) => {
                              const routePrimary = route.locales[strapiLocaleFromLang(lang)] ?? route.primary;
                              const routePhotos = routeMediaList(routePrimary);
                              return (
                                <section className="route-review" key={route.documentId}>
                                  <div className="admin-row">
                                    <div>
                                      <h3>{display(routePrimary.title, lang)}</h3>
                                      <p>{display(routePrimary.short_description ?? routePrimary.full_description, lang)}</p>
                                    </div>
                                    <strong>{route.ready ? "✓" : "—"}</strong>
                                  </div>
                                  {routePhotos.length ? (
                                    <div className="media-strip small" aria-label={ui.labels.gallery}>
	                                      {routePhotos.slice(0, 4).map((url) => (
	                                        <img key={url} src={url} alt="" />
	                                      ))}
                                    </div>
                                  ) : null}
                                  <dl className="admin-fields compact">
                                    <div><dt>{ui.labels.duration}</dt><dd>{display(routePrimary.duration_hours, lang)}</dd></div>
                                    <div><dt>{ui.labels.price}</dt><dd>{routePrice(routePrimary, lang)}</dd></div>
                                    <div><dt>{ui.labels.maxGuests}</dt><dd>{display(routePrimary.max_guests, lang)}</dd></div>
                                    <div><dt>{ui.labels.locales}</dt><dd>{REQUIRED_ADMIN_LOCALES.map((locale) => `${localeLabel(locale)} ${route.locales[locale] ? "✓" : "—"}`).join(" · ")}</dd></div>
                                  </dl>
                                </section>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className={boat.ready ? "admin-success" : "admin-warning"}>
                          {boat.ready ? ui.translateReviewReady : (
                            <>
                              <strong>{ui.labels.blockers}</strong>
                              <ul>
                                {boat.blockers.map((blocker) => (
                                  <li key={blocker}>{blocker}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>

                        {message ? <p className={message === ui.publishDone || message === ui.translateReviewReady ? "admin-success" : "admin-warning"} role="status">{message}</p> : null}

                        <div className="boat-action-row">
                          <button
                            type="button"
                            onClick={() => void translateAndReview(boat)}
                            disabled={Boolean(pendingBoatAction)}
                          >
                            {pendingBoatAction === `translate:${boat.documentId}` ? ui.loading : ui.actions.translateReview}
                          </button>
                          <button
                            type="button"
                            onClick={() => void publishLogicalBoat(boat)}
                            disabled={Boolean(pendingBoatAction) || !boat.ready}
                          >
                            {pendingBoatAction === `publish:${boat.documentId}` ? ui.loading : ui.actions.unifiedPublish}
                          </button>
                          <a href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(boat.documentId)}`}>
                            {ui.actions.openFullEditor}
                          </a>
                        </div>

                        <details className="advanced-area">
                          <summary>{ui.labels.advanced}</summary>
                          <AdminCrudManager lang={lang} entity="boat" dashboardRows={boat.rows} onRefresh={loadDashboard} />
                        </details>
                      </article>
                    );
                  })}
                  {!logicalBoats.length ? <p className="admin-muted">{ui.empty}</p> : null}
                </section>
              ) : null}

              {active === "routes" ? (
                <section className="admin-list">
                  <AdminCrudManager lang={lang} entity="experience" dashboardRows={routes} onRefresh={loadDashboard} />
                  {routes.map((route, index) => {
                    const hasBoat = Boolean(asText(route.boatDocumentId));
                    const locales = textArray(route.available_locales);
                    const missingFields = textArray(route.missing_required_fields);
                    const history = routeEvents(route, events);
                    return (
                      <article className="admin-card" key={`${display(route.documentId ?? route.id, lang)}-${index}`}>
                        <div className="admin-row">
                          <div>
                            <h2>{display(route.title, lang)}</h2>
                            <p>{hasBoat ? display(route.boatTitle, lang) : ui.routeNotAssigned}</p>
                          </div>
                          <strong>{statusLabel(lang, route.moderation_status ?? route.state)}</strong>
                        </div>
                        {!hasBoat ? <p className="admin-warning">{ui.cannotPublishRoute}</p> : null}
                        {!route.translation_complete ? <p className="admin-warning">{ui.translationIncomplete}</p> : null}
                        <dl className="admin-fields">
                          <div><dt>{ui.labels.owner}</dt><dd>{display(route.owner_display_name ?? route.owner_email, lang)}</dd></div>
                          <div><dt>{ui.labels.linkedBoat}</dt><dd>{hasBoat ? display(route.boatTitle, lang) : ui.routeNotAssigned}</dd></div>
                          <div><dt>{ui.labels.sourceLanguage}</dt><dd>{display(route.locale, lang)}</dd></div>
                          <div><dt>{ui.labels.availableLocales}</dt><dd>{locales.length ? locales.join(", ") : copy[lang].missing}</dd></div>
                          <div><dt>{ui.labels.locale}</dt><dd>{display(route.locale, lang)}</dd></div>
                          <div><dt>{ui.labels.duration}</dt><dd>{display(route.duration_hours, lang)}</dd></div>
                          <div><dt>{ui.labels.price}</dt><dd>{display(route.price, lang)} {display(route.currency ?? "EUR", lang)}</dd></div>
                          <div><dt>{ui.labels.maxGuests}</dt><dd>{display(route.max_guests, lang)}</dd></div>
                          <div><dt>{ui.labels.cover}</dt><dd>{display((asNumber(route.cover_count) ?? 0) > 0, lang)}</dd></div>
                          <div><dt>{ui.labels.gallery}</dt><dd>{display(route.gallery_count ?? route.cover_count, lang)}</dd></div>
                          <div><dt>{ui.labels.publication}</dt><dd>{statusLabel(lang, route.state)}</dd></div>
                          <div><dt>{ui.labels.status}</dt><dd>{statusLabel(lang, route.moderation_status)}</dd></div>
                          <div><dt>{ui.labels.created}</dt><dd>{display(route.created_at, lang)}</dd></div>
                          <div><dt>{ui.labels.updated}</dt><dd>{display(route.updated_at, lang)}</dd></div>
                          <div><dt>{ui.labels.isActive}</dt><dd>{display(route.is_active, lang)}</dd></div>
                          <div><dt>{ui.labels.boatStatus}</dt><dd>{statusLabel(lang, route.boatModerationStatus)}</dd></div>
                          <div><dt>{ui.labels.boatPublication}</dt><dd>{statusLabel(lang, route.boatState)}</dd></div>
                          <div><dt>{ui.labels.translationCompleteness}</dt><dd>{route.translation_complete ? "✓" : ui.translationIncomplete}</dd></div>
                          <div><dt>{ui.labels.missingFields}</dt><dd>{missingFields.length ? missingFields.join(", ") : "✓"}</dd></div>
                        </dl>
                        <dl className="admin-fields">
                          <div><dt>{ui.labels.shortDescription}</dt><dd>{display(route.short_description, lang)}</dd></div>
                          <div><dt>{ui.labels.fullDescription}</dt><dd>{display(route.full_description, lang)}</dd></div>
                          <div><dt>{ui.labels.includedServices}</dt><dd>{display(route.included_services, lang)}</dd></div>
                          <div><dt>{ui.labels.meetingPoint}</dt><dd>{display(route.meeting_point, lang)}</dd></div>
                        </dl>
                        {asText(route.boatDocumentId) ? (
                          <a href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(asText(route.boatDocumentId))}`}>
                            {ui.actions.preview}
                          </a>
                        ) : null}
                        <details>
                          <summary>{ui.labels.moderationHistory}</summary>
                          {history.length ? (
                            <ul>
                              {history.map((event, eventIndex) => (
                                <li key={`${display(event.id ?? event.occurred_at, lang)}-${eventIndex}`}>
                                  {display(event.occurred_at, lang)} · {display(event.action, lang)} · {statusLabel(lang, event.new_status)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="admin-muted">{ui.empty}</p>
                          )}
                        </details>
                        <AdminModerationActions
                          lang={lang}
                          entityType="experience"
                          documentId={asText(route.documentId)}
                          status={asText(route.moderation_status)}
                          onComplete={loadDashboard}
                        />
                      </article>
                    );
                  })}
                </section>
              ) : null}

              {active === "media" ? (
                <AdminCrudManager lang={lang} entity="media" dashboardRows={[]} onRefresh={loadDashboard} />
              ) : null}

              {active === "translations" ? (
                <section className="admin-list">
                  {boats.map((boat, index) => (
                    <article className="admin-card" key={`tr-${display(boat.documentId ?? boat.id, lang)}-${index}`}>
                      <div className="admin-row">
                        <div>
                          <h2>{display(boat.title, lang)}</h2>
                          <p>{ui.labels.translationCompleteness}: {Boolean(asText(boat.title) && asText(boat.slug)) ? "✓" : "—"}</p>
                        </div>
                        {asText(boat.documentId) ? (
                          <a href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(asText(boat.documentId))}`}>
                            {ui.actions.preview}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </section>
              ) : null}

              {active === "events" ? (
                <section className="admin-list">
                  {events.length ? events.map((event, index) => (
                    <article className="admin-card" key={`event-${index}`}>
                      <h2>{display(event.action, lang)}</h2>
                      <p>{display(event.occurred_at, lang)} · {display(event.entity_type, lang)}</p>
                    </article>
                  )) : <p className="admin-muted">{ui.empty}</p>}
                </section>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <style jsx>{`
        .admin-cockpit {
          display: grid;
          gap: 18px;
          color: #f6f3ed;
        }
        .admin-card {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          background: rgba(14, 18, 24, 0.92);
          padding: 18px;
        }
        .admin-hero,
        .admin-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        h1,
        h2,
        p {
          margin-top: 0;
        }
        .kicker,
        .admin-muted {
          color: rgba(246, 243, 237, 0.68);
        }
        .admin-login,
        .admin-login label {
          display: grid;
          gap: 10px;
        }
        input,
        button,
        .admin-secondary,
        a {
          border-radius: 8px;
          font: inherit;
        }
        input {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          padding: 11px 12px;
        }
        button,
        .admin-secondary {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: white;
          color: #111;
          cursor: pointer;
          font-weight: 800;
          padding: 10px 13px;
        }
        .admin-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .admin-nav button.active {
          background: #9fd8ff;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
        }
        .metric span {
          display: block;
          color: rgba(246, 243, 237, 0.7);
        }
        .metric strong {
          display: block;
          font-size: 32px;
          line-height: 1.1;
          margin-top: 10px;
        }
        .wide {
          grid-column: 1 / -1;
        }
        .admin-list {
          display: grid;
          gap: 12px;
        }
        .admin-fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
          margin: 14px 0;
        }
        dt {
          color: rgba(246, 243, 237, 0.62);
          font-size: 12px;
        }
        dd {
          margin: 3px 0 0;
        }
        a {
          color: #9fd8ff;
        }
        .admin-error,
        .admin-warning {
          border: 1px solid rgba(255, 195, 92, 0.35);
          border-radius: 8px;
          background: rgba(255, 195, 92, 0.1);
          color: #ffe0a3;
          padding: 10px 12px;
        }
        .document-list {
          margin-bottom: 0;
        }
        .media-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin: 14px 0;
        }
        .media-strip.small {
          grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
        }
        .media-strip img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .locale-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 14px 0;
        }
        .locale-row,
        .route-review {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.04);
        }
        .locale-row span {
          color: rgba(246, 243, 237, 0.66);
          display: block;
          font-size: 12px;
        }
        .route-stack {
          display: grid;
          gap: 10px;
          margin: 14px 0;
        }
        .route-review h3 {
          font-size: 18px;
          margin: 0 0 6px;
        }
        .compact {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        .boat-action-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }
        .admin-success {
          border: 1px solid rgba(124, 219, 159, 0.36);
          border-radius: 8px;
          background: rgba(124, 219, 159, 0.1);
          color: #c9f6d9;
          padding: 10px 12px;
        }
        .advanced-area {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 10px;
        }
        details {
          margin: 10px 0;
        }
        @media (max-width: 720px) {
          .admin-hero,
          .admin-row {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}
