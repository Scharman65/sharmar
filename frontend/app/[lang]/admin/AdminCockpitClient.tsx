"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/i18n";
import AdminCrudManager from "./AdminCrudManager";
import AdminModerationActions from "./AdminModerationActions";

type Section = "overview" | "owners" | "documents" | "boats" | "routes" | "media" | "translations" | "events";
type JsonRecord = Record<string, unknown>;

type SessionState = {
  authenticated: boolean;
  permissions: string[];
  expiresAt: number | null;
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

const DOCUMENT_REQUIREMENT_DECISION_REQUIRED = true;

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
    actionDone: "Действие выполнено",
    actionFailed: "Не удалось выполнить действие",
    documentRuleNeeded: "Нужно продуктово подтвердить: достаточно паспорта или удостоверения личности, либо нужны оба документа.",
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
    actionDone: "Action completed",
    actionFailed: "Could not complete the action",
    documentRuleNeeded: "Product decision needed: passport or identity document, or both documents.",
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
    actionDone: "Radnja je izvršena",
    actionFailed: "Radnja nije izvršena",
    documentRuleNeeded: "Potrebna je odluka: pasoš ili lična karta, ili oba dokumenta.",
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

function completeness(parts: boolean[]): string {
  const total = parts.length || 1;
  const ready = parts.filter(Boolean).length;
  return `${ready}/${total}`;
}

export default function AdminCockpitClient({ lang }: { lang: Lang }) {
  const ui = copy[lang];
  const [session, setSession] = useState<SessionState>({ authenticated: false, permissions: [], expiresAt: null });
  const [password, setPassword] = useState("");
  const [active, setActive] = useState<Section>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owners = data?.owners ?? [];
  const boats = data?.boats ?? [];
  const routes = data?.experiences ?? [];
  const events = data?.moderationEvents ?? [];
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
  const boatsPending = boats.filter(awaitingBoat).length;
  const routesPending = routes.filter(routeNeedsAttention).length;
  const routesRejected = asNumber(data?.summary?.experiencesRejected) ?? routes.filter((route) => asText(route.moderation_status) === "rejected").length;
  const routesReady = asNumber(data?.summary?.experiencesReadyToPublish) ?? routes.filter((route) => asText(route.moderation_status) === "approved").length;
  const routesPublished = asNumber(data?.summary?.experiencesPublished) ?? routes.filter((route) => asText(route.moderation_status) === "published").length;
  const routesWithoutBoat = asNumber(data?.summary?.experiencesWithoutBoat) ?? routes.filter((route) => !asText(route.boatDocumentId)).length;
  const routesIncompleteTranslations = asNumber(data?.summary?.experiencesWithIncompleteTranslations) ?? routes.filter((route) => !route.translation_complete).length;
  const translationsNeedingAttention = boats.filter((boat) => !asText(boat.title) || !asText(boat.slug)).length;

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
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (json && typeof json === "object") {
      setSession({
        authenticated: Boolean((json as SessionState).authenticated),
        permissions: Array.isArray((json as SessionState).permissions) ? (json as SessionState).permissions : [],
        expiresAt: asNumber((json as SessionState).expiresAt),
      });
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object" || (json as DashboardData).ok !== true) {
        setError(ui.loadError);
        return;
      }
      setData(json as DashboardData);
    } catch {
      setError(ui.loadError);
    } finally {
      setLoading(false);
    }
  }, [ui.loadError]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== "object" || (json as { ok?: boolean }).ok !== true) {
        setError(ui.loadError);
        return;
      }
      setPassword("");
      await refreshSession();
      await loadDashboard();
    } catch {
      setError(ui.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSession({ authenticated: false, permissions: [], expiresAt: null });
    setData(null);
    setPassword("");
    setActive("overview");
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
                  <AdminCrudManager lang={lang} entity="boat" dashboardRows={boats} onRefresh={loadDashboard} />
                  {boats.map((boat, index) => (
                    <article className="admin-card" key={`${display(boat.documentId ?? boat.id, lang)}-${index}`}>
                      <div className="admin-row">
                        <div>
                          <h2>{display(boat.title, lang)}</h2>
                          <p>{display(boat.owner_display_name ?? boat.owner_email, lang)}</p>
                        </div>
                        <strong>{statusLabel(lang, boat.moderation_status)}</strong>
                      </div>
                      <dl className="admin-fields">
                        <div><dt>{ui.labels.locale}</dt><dd>{display(boat.locale, lang)}</dd></div>
                        <div><dt>{ui.labels.publication}</dt><dd>{statusLabel(lang, boat.state)}</dd></div>
                        <div><dt>{ui.labels.photos}</dt><dd>{display((asNumber(boat.cover_count) ?? 0) + (asNumber(boat.images_count) ?? 0), lang)}</dd></div>
                        <div><dt>{ui.labels.completeness}</dt><dd>{completeness([Boolean(asText(boat.title)), Boolean(asText(boat.slug)), (asNumber(boat.cover_count) ?? 0) > 0])}</dd></div>
                        <div><dt>{ui.labels.routesCount}</dt><dd>{display(boat.experiences_count, lang)}</dd></div>
                        <div><dt>{ui.labels.translationCompleteness}</dt><dd>{Boolean(asText(boat.title) && asText(boat.slug)) ? "✓" : "—"}</dd></div>
                      </dl>
                      <details>
                        <summary>{ui.labels.technical}</summary>
                        <p>{ui.labels.identifier}: {display(boat.documentId, lang)}</p>
                      </details>
                      <AdminModerationActions
                        lang={lang}
                        entityType="boat"
                        documentId={asText(boat.documentId)}
                        status={asText(boat.moderation_status)}
                        onComplete={loadDashboard}
                      />
                    </article>
                  ))}
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
