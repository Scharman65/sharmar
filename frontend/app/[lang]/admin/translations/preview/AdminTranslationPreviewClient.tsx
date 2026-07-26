"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/i18n";
import AdminTranslationEditor, { type EditableAiPreview } from "./AdminTranslationEditor";

type StrapiLocale = "ru" | "en" | "sr-Latn-ME";

const STRAPI_LOCALES: StrapiLocale[] = ["ru", "en", "sr-Latn-ME"];

type TranslationFields = {
  title?: string | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  included_services?: string | null;
  meeting_point?: string | null;
};

type PreviewExperience = {
  documentId?: string | null;
  title?: string | null;
  fieldsForTranslation?: TranslationFields;
};

type PreviewWarning = {
  code?: string;
  sourceDocumentId?: string | null;
  sourceLocale?: string | null;
  actualLocale?: string | null;
};

type PreviewResponse = {
  ok?: boolean;
  code?: string;
  sourceLocale?: string;
  targetLocales?: string[];
  boat?: {
    documentId?: string | null;
    title?: string | null;
    description?: string | null;
    fieldsForTranslation?: TranslationFields;
  };
  experiences?: PreviewExperience[];
  warnings?: PreviewWarning[];
  aiPreview?: {
    model?: string;
    sourceLocale?: string;
    targetLocales?: string[];
    boat?: {
      sourceDocumentId?: string | null;
      translations?: Record<string, TranslationFields | undefined>;
    };
    experiences?: Array<{
      sourceDocumentId?: string | null;
      translations?: Record<string, TranslationFields | undefined>;
    }>;
  };
};

type SaveDraftPlan = {
  contentType?: string;
  documentId?: string | null;
  locale?: string | null;
  operation?: string | null;
  action?: string | null;
  draftExists?: boolean;
  publishedExists?: boolean;
  fieldsToWrite?: string[];
  fieldsSkipped?: string[];
  blocked?: boolean;
  warnings?: string[];
};

type SaveDraftResponse = {
  ok?: boolean;
  code?: string;
  mode?: string;
  doesWrite?: boolean;
  doesPublish?: boolean;
  boatDocumentId?: string | null;
  sourceLocale?: string | null;
  targetLocales?: string[];
  boat?: SaveDraftPlan[];
  experiences?: SaveDraftPlan[];
  blockers?: string[];
  warnings?: string[];
  written?: string[];
  skipped?: string[];
};

type Copy = {
  title: string;
  warning: string;
  adminPassword: string;
  signIn: string;
  signOut: string;
  documentId: string;
  sourceLocale: string;
  targetLocales: string;
  targetLocalesAutomatic: string;
  sourceOnly: string;
  aiPreview: string;
  previewButton: string;
  generateButton: string;
  loading: string;
  sourcePayload: string;
  aiResult: string;
  draftPlan: string;
  dryRunButton: string;
  saveDraftButton: string;
  confirmSave: string;
  draftOnlyNotice: string;
  changedFields: string;
  blockers: string;
  saveResult: string;
  sourceTitle: string;
  sourceDescription: string;
  routeCount: string;
  routes: string;
  model: string;
  noRoutes: string;
  noResponse: string;
  errorTitle: string;
  warningTitle: string;
  labels: {
    sourceLocale: string;
    targetLocales: string;
    boatDocumentId: string;
    documentId: string;
    sourceDocumentId: string;
    title: string;
    description: string;
    shortDescription: string;
    fullDescription: string;
    includedServices: string;
    meetingPoint: string;
  };
  warnings: Record<string, string>;
  errors: Record<string, string>;
};

const copy: Record<Lang, Copy> = {
  ru: {
    title: "AI-перевод лодки",
    warning: "Это только предварительный просмотр. Переводы не сохраняются и не публикуются.",
    adminPassword: "Пароль администратора",
    signIn: "Войти",
    signOut: "Выйти",
    documentId: "Технический ID лодки",
    sourceLocale: "Исходный язык",
    targetLocales: "Целевые языки",
    targetLocalesAutomatic: "Определяются автоматически по исходному языку.",
    sourceOnly: "Показать исходные данные",
    aiPreview: "Создать предпросмотр AI",
    previewButton: "Проверить без AI",
    generateButton: "Создать предпросмотр AI",
    loading: "Загрузка...",
    sourcePayload: "Исходные данные",
    aiResult: "Предпросмотр AI",
    draftPlan: "План сохранения черновика",
    dryRunButton: "Проверить сохранение черновика",
    saveDraftButton: "Сохранить черновик перевода",
    confirmSave: "Подтверждаю, что эта операция должна сохранить только черновики переводов.",
    draftOnlyNotice: "Сохранение черновика никогда не публикует контент. Оно только создаёт или обновляет черновые локализации.",
    changedFields: "Поля для записи",
    blockers: "Блокеры",
    saveResult: "Результат сохранения",
    sourceTitle: "Заголовок",
    sourceDescription: "Описание",
    routeCount: "Маршрутов",
    routes: "Маршруты",
    model: "Модель",
    noRoutes: "Маршруты не найдены.",
    noResponse: "Ответ пока не получен.",
    errorTitle: "Ошибка",
    warningTitle: "Предупреждение",
    labels: {
      sourceLocale: "Исходный язык",
      targetLocales: "Целевые языки",
      boatDocumentId: "Технический ID лодки",
      documentId: "Технический ID",
      sourceDocumentId: "Технический ID источника",
      title: "Заголовок",
      description: "Описание",
      shortDescription: "Краткое описание",
      fullDescription: "Полное описание",
      includedServices: "Включённые услуги",
      meetingPoint: "Место встречи",
    },
    warnings: {
      experience_source_locale_not_found: "Маршрут связан с лодкой, но локализация маршрута для исходного языка не найдена.",
      experience_source_locale_inferred_from_linked_row: "Маршрут связан с лодкой, но точная локализация маршрута для исходного языка не найдена. Использована связанная строка маршрута для предпросмотра.",
      unknown: "Предупреждение.",
    },
    errors: {
      admin_translation_token_missing: "Сервис переводов временно недоступен.",
      unauthorized: "Сессия администратора недействительна.",
      boat_not_found: "Лодка с таким техническим ID не найдена.",
      source_locale_not_found: "Локализация лодки для выбранного исходного языка не найдена.",
      target_locales_required: "Нужно выбрать хотя бы один целевой язык, отличный от исходного.",
      openai_api_key_missing: "Сервис AI-перевода временно недоступен.",
      openai_request_failed: "Запрос к сервису AI-перевода не выполнен.",
      ai_translation_invalid_response: "AI вернул некорректный JSON.",
      unknown: "Неизвестная ошибка.",
      invalid_save_mode: "Некорректный режим сохранения.",
      invalid_dry_run_payload: "Недостаточно данных для проверки сохранения.",
      write_not_enabled: "Сохранение черновика отключено на сервере.",
      admin_translation_internal_token_missing: "Сохранение переводов временно недоступно.",
      strapi_save_draft_failed: "Сохранение черновика не выполнено.",
      save_draft_failed: "Сохранение черновика не выполнено.",
    },
  },
  en: {
    title: "Boat AI translation",
    warning: "This is preview only. Translations are not saved or published.",
    adminPassword: "Admin password",
    signIn: "Sign in",
    signOut: "Sign out",
    documentId: "Technical boat ID",
    sourceLocale: "Source locale",
    targetLocales: "Target locales",
    targetLocalesAutomatic: "Selected automatically from the source locale.",
    sourceOnly: "Preview source only",
    aiPreview: "Generate AI preview",
    previewButton: "Preview without AI",
    generateButton: "Generate AI preview",
    loading: "Loading...",
    sourcePayload: "Source payload",
    aiResult: "AI preview",
    draftPlan: "Draft save plan",
    dryRunButton: "Check draft save",
    saveDraftButton: "Save draft translations",
    confirmSave: "I confirm this write must save draft translations only.",
    draftOnlyNotice: "Draft saving never publishes content. It only creates or updates draft localizations.",
    changedFields: "Fields to write",
    blockers: "Blockers",
    saveResult: "Save result",
    sourceTitle: "Title",
    sourceDescription: "Description",
    routeCount: "Routes",
    routes: "Routes",
    model: "Model",
    noRoutes: "No routes found.",
    noResponse: "No response yet.",
    errorTitle: "Error",
    warningTitle: "Warning",
    labels: {
      sourceLocale: "Source locale",
      targetLocales: "Target locales",
      boatDocumentId: "Technical boat ID",
      documentId: "Technical ID",
      sourceDocumentId: "Source technical ID",
      title: "Title",
      description: "Description",
      shortDescription: "Short description",
      fullDescription: "Full description",
      includedServices: "Included services",
      meetingPoint: "Meeting point",
    },
    warnings: {
      experience_source_locale_not_found: "A route is linked to the boat, but the route localization for the source locale was not found.",
      experience_source_locale_inferred_from_linked_row: "A route is linked to the boat, but the exact route localization for the source locale was not found. The linked route row was used for preview.",
      unknown: "Warning.",
    },
    errors: {
      admin_translation_token_missing: "Translation service is temporarily unavailable.",
      unauthorized: "Admin session is invalid.",
      boat_not_found: "Boat with this technical ID was not found.",
      source_locale_not_found: "Boat localization for the selected source locale was not found.",
      target_locales_required: "Select at least one target locale different from the source locale.",
      openai_api_key_missing: "AI translation service is temporarily unavailable.",
      openai_request_failed: "AI translation service request failed.",
      ai_translation_invalid_response: "AI returned invalid JSON.",
      unknown: "Unknown error.",
      invalid_save_mode: "Invalid save mode.",
      invalid_dry_run_payload: "Not enough data to check the draft save.",
      write_not_enabled: "Draft saving is disabled on the server.",
      admin_translation_internal_token_missing: "Translation saving is temporarily unavailable.",
      strapi_save_draft_failed: "Draft saving failed.",
      save_draft_failed: "Draft save failed.",
    },
  },
  me: {
    title: "AI prevod broda",
    warning: "Ovo je samo pregled. Prevodi se ne čuvaju i ne objavljuju.",
    adminPassword: "Administratorska lozinka",
    signIn: "Prijavi se",
    signOut: "Odjavi se",
    documentId: "Tehnički ID plovila",
    sourceLocale: "Izvorni jezik",
    targetLocales: "Ciljni jezici",
    targetLocalesAutomatic: "Određuju se automatski na osnovu izvornog jezika.",
    sourceOnly: "Prikaži izvorne podatke",
    aiPreview: "Napravi AI pregled",
    previewButton: "Provjeri bez AI",
    generateButton: "Napravi AI pregled",
    loading: "Učitavanje...",
    sourcePayload: "Izvorni podaci",
    aiResult: "AI pregled",
    draftPlan: "Plan čuvanja nacrta",
    dryRunButton: "Provjeri čuvanje nacrta",
    saveDraftButton: "Sačuvaj nacrt prevoda",
    confirmSave: "Potvrđujem da ova radnja smije sačuvati samo nacrte prevoda.",
    draftOnlyNotice: "Čuvanje nacrta nikada ne objavljuje sadržaj. Samo kreira ili ažurira nacrte lokalizacija.",
    changedFields: "Polja za upis",
    blockers: "Blokade",
    saveResult: "Rezultat čuvanja",
    sourceTitle: "Naslov",
    sourceDescription: "Opis",
    routeCount: "Ruta",
    routes: "Rute",
    model: "Model",
    noRoutes: "Rute nijesu pronađene.",
    noResponse: "Još nema odgovora.",
    errorTitle: "Greška",
    warningTitle: "Upozorenje",
    labels: {
      sourceLocale: "Izvorni jezik",
      targetLocales: "Ciljni jezici",
      boatDocumentId: "Tehnički ID plovila",
      documentId: "Tehnički ID",
      sourceDocumentId: "Tehnički ID izvora",
      title: "Naslov",
      description: "Opis",
      shortDescription: "Kratak opis",
      fullDescription: "Pun opis",
      includedServices: "Uključene usluge",
      meetingPoint: "Mjesto susreta",
    },
    warnings: {
      experience_source_locale_not_found: "Ruta je povezana sa brodom, ali lokalizacija rute za izvorni jezik nije pronađena.",
      experience_source_locale_inferred_from_linked_row: "Ruta je povezana sa brodom, ali tačna lokalizacija rute za izvorni jezik nije pronađena. Povezani red rute je korišćen za pregled.",
      unknown: "Upozorenje.",
    },
    errors: {
      admin_translation_token_missing: "Servis prevoda je privremeno nedostupan.",
      unauthorized: "Administratorska sesija nije važeća.",
      boat_not_found: "Plovilo sa ovim tehničkim ID nije pronađeno.",
      source_locale_not_found: "Lokalizacija broda za izabrani izvorni jezik nije pronađena.",
      target_locales_required: "Izaberite makar jedan ciljni jezik koji nije izvorni.",
      openai_api_key_missing: "Servis AI prevoda je privremeno nedostupan.",
      openai_request_failed: "Zahtjev ka servisu AI prevoda nije uspio.",
      ai_translation_invalid_response: "AI je vratio neispravan JSON.",
      unknown: "Nepoznata greška.",
      invalid_save_mode: "Neispravan režim čuvanja.",
      invalid_dry_run_payload: "Nema dovoljno podataka za provjeru čuvanja.",
      write_not_enabled: "Čuvanje nacrta je isključeno na serveru.",
      admin_translation_internal_token_missing: "Čuvanje prevoda je privremeno nedostupno.",
      strapi_save_draft_failed: "Čuvanje nacrta nije uspjelo.",
      save_draft_failed: "Čuvanje nacrta nije uspjelo.",
    },
  },
};

function valueOrDash(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function errorMessage(ui: Copy, code: string | undefined) {
  if (!code) return ui.errors.unknown;
  return ui.errors[code] ?? `${ui.errors.unknown} (${code})`;
}

function targetLocalesForSource(sourceLocale: StrapiLocale): StrapiLocale[] {
  return STRAPI_LOCALES.filter((locale) => locale !== sourceLocale);
}

function localeLabel(locale: string) {
  if (locale === "sr-Latn-ME") return "ME";
  return locale.toUpperCase();
}

function localeBoatTitle(lang: Lang, locale: string) {
  const label = localeLabel(locale);
  if (lang === "ru") return `${label} лодка`;
  if (lang === "me") return `${label} brod`;
  return `${label} boat`;
}

function warningMessage(ui: Copy, warning: PreviewWarning) {
  const message = ui.warnings[warning.code ?? "unknown"] ?? ui.warnings.unknown;
  const details = [warning.sourceDocumentId, warning.sourceLocale, warning.actualLocale].filter(Boolean).join(" / ");
  return details ? `${message} (${details})` : message;
}

function TextBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="admin-translation-field">
      <dt>{label}</dt>
      <dd>{valueOrDash(value)}</dd>
    </div>
  );
}

function LocaleTranslation({
  title,
  value,
  ui,
}: {
  title: string;
  value: TranslationFields | undefined;
  ui: Copy;
}) {
  return (
    <section className="admin-translation-panel">
      <h3>{title}</h3>
      <TextBlock label={ui.labels.title} value={value?.title} />
      {"description" in (value ?? {}) ? <TextBlock label={ui.labels.description} value={value?.description} /> : null}
      {"short_description" in (value ?? {}) ? <TextBlock label={ui.labels.shortDescription} value={value?.short_description} /> : null}
      {"full_description" in (value ?? {}) ? <TextBlock label={ui.labels.fullDescription} value={value?.full_description} /> : null}
      {"included_services" in (value ?? {}) ? <TextBlock label={ui.labels.includedServices} value={value?.included_services} /> : null}
      {"meeting_point" in (value ?? {}) ? <TextBlock label={ui.labels.meetingPoint} value={value?.meeting_point} /> : null}
    </section>
  );
}

export default function AdminTranslationPreviewClient({
  lang,
  initialBoatDocumentId,
  initialSourceLocale,
}: {
  lang: Lang;
  initialBoatDocumentId: string;
  initialSourceLocale: StrapiLocale;
}) {
  const ui = copy[lang];
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [boatDocumentId, setBoatDocumentId] = useState(
    initialBoatDocumentId
  );
  const [sourceLocale, setSourceLocale] = useState<StrapiLocale>(
    initialSourceLocale
  );
  const [generateAi, setGenerateAi] = useState(false);
  const [response, setResponse] = useState<PreviewResponse | null>(null);
  const [reviewedAiPreview, setReviewedAiPreview] = useState<EditableAiPreview | null>(null);
  const [saveDraftResponse, setSaveDraftResponse] = useState<SaveDraftResponse | null>(null);
  const [confirmSaveDraft, setConfirmSaveDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const targetLocales = useMemo<StrapiLocale[]>(
    () => targetLocalesForSource(sourceLocale),
    [sourceLocale]
  );

  async function refreshSession() {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    setAuthenticated(Boolean(json && typeof json === "object" && (json as { authenticated?: boolean }).authenticated));
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || typeof json !== "object" || (json as { ok?: boolean }).ok !== true) {
        setError(errorMessage(ui, "unauthorized"));
        return;
      }
      setAdminPassword("");
      await refreshSession();
    } catch {
      setError(errorMessage(ui, "unknown"));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setResponse(null);
    setReviewedAiPreview(null);
    setSaveDraftResponse(null);
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function submit(nextGenerateAi: boolean) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setReviewedAiPreview(null);
    setSaveDraftResponse(null);
    setConfirmSaveDraft(false);

    try {
      const res = await fetch("/api/admin/translations/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boatDocumentId: boatDocumentId.trim(),
          sourceLocale,
          targetLocales,
          generateAi: nextGenerateAi,
        }),
      });

      const data: PreviewResponse = await res.json().catch(() => ({ ok: false, code: "unknown" }));
      setResponse(data);
      setReviewedAiPreview(data.aiPreview ?? null);

      if (!res.ok || data.ok === false) {
        setError(errorMessage(ui, data.code));
      }
    } catch {
      setError(errorMessage(ui, "unknown"));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(generateAi);
  }

  async function runSaveDraft(dryRun: boolean) {
    if (!reviewedAiPreview) return;
    if (!dryRun && !confirmSaveDraft) {
      setError(ui.confirmSave);
      return;
    }
    if (!dryRun && !window.confirm(ui.confirmSave)) return;

    setSaveLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/translations/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dryRun,
          confirmSaveDraft: !dryRun,
          overwrite: false,
          boatDocumentId: boatDocumentId.trim(),
          sourceLocale,
          targetLocales,
          aiPreview: reviewedAiPreview,
        }),
      });
      const data: SaveDraftResponse = await res.json().catch(() => ({ ok: false, code: "unknown" }));
      setSaveDraftResponse(data);
      if (!res.ok || data.ok === false) setError(errorMessage(ui, data.code));
    } catch {
      setError(errorMessage(ui, "unknown"));
    } finally {
      setSaveLoading(false);
    }
  }

  const routes = response?.experiences ?? [];
  const aiRoutes = response?.aiPreview?.experiences ?? [];
  const warnings = response?.warnings ?? [];
  const previewTargetLocales = response?.aiPreview?.targetLocales ?? response?.targetLocales ?? [];
  const saveBlocked = Boolean(saveDraftResponse?.blockers?.length) || Boolean(saveDraftResponse?.boat?.some((plan) => plan.blocked)) || Boolean(saveDraftResponse?.experiences?.some((plan) => plan.blocked));

  return (
    <div className="admin-translation-shell">
      <section className="admin-translation-card">
        <div className="admin-translation-header">
          <p className="kicker">Sharmar Admin</p>
          <h1>{ui.title}</h1>
          <p>{ui.warning}</p>
        </div>

        {!authenticated ? (
          <form className="admin-translation-form" onSubmit={signIn}>
            <label>
              <span>{ui.adminPassword}</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" disabled={loading}>{loading ? ui.loading : ui.signIn}</button>
          </form>
        ) : (
          <button type="button" onClick={() => void signOut()}>{ui.signOut}</button>
        )}

        {authenticated ? (
        <form className="admin-translation-form" onSubmit={onSubmit}>
          <label>
            <span>{ui.documentId}</span>
            <input
              value={boatDocumentId}
              onChange={(event) => setBoatDocumentId(event.target.value)}
              spellCheck={false}
              required
            />
          </label>

          <label>
            <span>{ui.sourceLocale}</span>
            <select value={sourceLocale} onChange={(event) => setSourceLocale(event.target.value as StrapiLocale)}>
              <option value="ru">ru</option>
              <option value="en">en</option>
              <option value="sr-Latn-ME">sr-Latn-ME</option>
            </select>
          </label>

          <div className="admin-translation-targets">
            <span>{ui.targetLocales}</span>
            <p>{ui.targetLocalesAutomatic}</p>
            {targetLocales.map((locale) => (
              <label key={locale}>
                <input type="checkbox" checked readOnly />
                {locale}
              </label>
            ))}
          </div>

          <div className="admin-translation-mode">
            <label>
              <input
                type="radio"
                name="translation-mode"
                checked={!generateAi}
                onChange={() => setGenerateAi(false)}
              />
              {ui.sourceOnly}
            </label>
            <label>
              <input
                type="radio"
                name="translation-mode"
                checked={generateAi}
                onChange={() => setGenerateAi(true)}
              />
              {ui.aiPreview}
            </label>
          </div>

          <div className="admin-translation-actions">
            <button type="button" onClick={() => void submit(false)} disabled={loading}>
              {loading ? ui.loading : ui.previewButton}
            </button>
            <button type="button" onClick={() => void submit(true)} disabled={loading}>
              {loading ? ui.loading : ui.generateButton}
            </button>
          </div>
        </form>
        ) : null}

        {error ? (
          <div className="admin-translation-error" role="alert">
            <strong>{ui.errorTitle}</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {warnings.length ? (
          <div className="admin-translation-warning" role="status">
            <strong>{ui.warningTitle}</strong>
            {warnings.map((warning, index) => (
              <span key={`${warning.code ?? "warning"}-${warning.sourceDocumentId ?? index}`}>
                {warningMessage(ui, warning)}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-translation-card">
        <h2>{ui.sourcePayload}</h2>
        {!response ? <p className="admin-translation-muted">{ui.noResponse}</p> : null}

        {response?.ok ? (
          <div className="admin-translation-results">
            <dl className="admin-translation-meta">
              <TextBlock label={ui.labels.sourceLocale} value={response.sourceLocale} />
              <TextBlock label={ui.labels.targetLocales} value={(response.targetLocales ?? []).join(", ")} />
              <TextBlock label={ui.labels.boatDocumentId} value={response.boat?.documentId} />
              <TextBlock label={ui.routeCount} value={String(routes.length)} />
            </dl>

            <section className="admin-translation-panel">
              <h3>{valueOrDash(response.boat?.title)}</h3>
              <TextBlock label={ui.sourceTitle} value={response.boat?.fieldsForTranslation?.title ?? response.boat?.title} />
              <TextBlock
                label={ui.sourceDescription}
                value={response.boat?.fieldsForTranslation?.description ?? response.boat?.description}
              />
            </section>

            <div>
              <h3 className="admin-translation-section-title">{ui.routes}</h3>
              {routes.length ? (
                <div className="admin-translation-grid">
                  {routes.map((route, index) => (
                    <section className="admin-translation-panel" key={`${route.documentId ?? "route"}-${index}`}>
                      <h4>{valueOrDash(route.fieldsForTranslation?.title ?? route.title)}</h4>
                      <TextBlock label={ui.labels.documentId} value={route.documentId} />
                      <TextBlock label={ui.labels.shortDescription} value={route.fieldsForTranslation?.short_description} />
                    </section>
                  ))}
                </div>
              ) : (
                <p className="admin-translation-muted">{ui.noRoutes}</p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {response?.aiPreview ? (
        <section className="admin-translation-card">
          <h2>{ui.aiResult}</h2>
          <TextBlock label={ui.model} value={response.aiPreview.model} />
          <TextBlock label={ui.labels.sourceLocale} value={response.aiPreview.sourceLocale} />
          <TextBlock label={ui.labels.targetLocales} value={previewTargetLocales.join(", ")} />

          <div className="admin-translation-grid">
            {previewTargetLocales.map((locale) => (
              <LocaleTranslation
                key={locale}
                title={localeBoatTitle(lang, locale)}
                value={response.aiPreview?.boat?.translations?.[locale]}
                ui={ui}
              />
            ))}
          </div>

          <div>
            <h3 className="admin-translation-section-title">{ui.routes}</h3>
            <div className="admin-translation-grid">
              {aiRoutes.map((route, index) => (
                <section className="admin-translation-panel" key={`${route.sourceDocumentId ?? "ai-route"}-${index}`}>
                  <TextBlock label={ui.labels.sourceDocumentId} value={route.sourceDocumentId} />
                  {previewTargetLocales.map((locale) => (
                    <LocaleTranslation
                      key={locale}
                      title={localeLabel(locale)}
                      value={route.translations?.[locale]}
                      ui={ui}
                    />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {reviewedAiPreview ? (
        <AdminTranslationEditor
          lang={lang}
          value={reviewedAiPreview}
          targetLocales={previewTargetLocales}
          onChange={(next) => {
            setReviewedAiPreview(next);
            setSaveDraftResponse(null);
            setConfirmSaveDraft(false);
            setError(null);
          }}
        />
      ) : null}

      {reviewedAiPreview ? (
        <section className="admin-translation-card">
          <h2>{ui.draftPlan}</h2>
          <p className="admin-translation-muted">{ui.draftOnlyNotice}</p>
          <div className="admin-translation-actions">
            <button type="button" onClick={() => void runSaveDraft(true)} disabled={saveLoading}>
              {saveLoading ? ui.loading : ui.dryRunButton}
            </button>
            <button
              type="button"
              onClick={() => void runSaveDraft(false)}
              disabled={saveLoading || !confirmSaveDraft || saveBlocked}
            >
              {saveLoading ? ui.loading : ui.saveDraftButton}
            </button>
          </div>
          <label className="admin-translation-confirm">
            <input
              type="checkbox"
              checked={confirmSaveDraft}
              onChange={(event) => setConfirmSaveDraft(event.target.checked)}
            />
            {ui.confirmSave}
          </label>

          {saveDraftResponse ? (
            <div className="admin-translation-results">
              <h3 className="admin-translation-section-title">{ui.saveResult}</h3>
              <dl className="admin-translation-meta">
                <TextBlock label="mode" value={saveDraftResponse.mode} />
                <TextBlock label="write" value={saveDraftResponse.doesWrite ? "YES" : "NO"} />
                <TextBlock label="publish" value={saveDraftResponse.doesPublish ? "YES" : "NO"} />
                <TextBlock label={ui.labels.sourceLocale} value={saveDraftResponse.sourceLocale} />
              </dl>

              <div className="admin-translation-grid">
                {(saveDraftResponse.boat ?? []).map((plan) => (
                  <section className="admin-translation-panel" key={`save-boat-${plan.locale}`}>
                    <h3>{localeBoatTitle(lang, plan.locale ?? "")}</h3>
                    <TextBlock label="operation" value={plan.operation ?? plan.action} />
                    <TextBlock label={ui.changedFields} value={plan.fieldsToWrite?.length ? plan.fieldsToWrite.join(", ") : "-"} />
                    <TextBlock label="blocked" value={plan.blocked ? "YES" : "NO"} />
                    <TextBlock label={ui.warningTitle} value={plan.warnings?.length ? plan.warnings.join(" ") : "-"} />
                  </section>
                ))}
                {(saveDraftResponse.experiences ?? []).map((plan, index) => (
                  <section className="admin-translation-panel" key={`save-route-${plan.documentId ?? index}-${plan.locale}`}>
                    <h3>{localeLabel(plan.locale ?? "")} route</h3>
                    <TextBlock label={ui.labels.documentId} value={plan.documentId} />
                    <TextBlock label="operation" value={plan.operation ?? plan.action} />
                    <TextBlock label={ui.changedFields} value={plan.fieldsToWrite?.length ? plan.fieldsToWrite.join(", ") : "-"} />
                    <TextBlock label="blocked" value={plan.blocked ? "YES" : "NO"} />
                  </section>
                ))}
              </div>

              <div className={saveDraftResponse.blockers?.length ? "admin-translation-warning" : "admin-translation-muted"}>
                <strong>{ui.blockers}</strong>
                {saveDraftResponse.blockers?.length ? (
                  saveDraftResponse.blockers.map((blocker, index) => <span key={`${blocker}-${index}`}>{blocker}</span>)
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <style jsx>{`
        .admin-translation-shell {
          display: grid;
          gap: 18px;
          width: min(1120px, calc(100vw - 32px));
          margin: 0 auto;
          padding: 72px 0 54px;
        }

        .admin-translation-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.045);
          padding: 20px;
        }

        .admin-translation-header h1,
        .admin-translation-card h2,
        .admin-translation-panel h3,
        .admin-translation-panel h4 {
          margin: 0;
        }

        .admin-translation-header p {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.65;
        }

        .admin-translation-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .admin-translation-form label,
        .admin-translation-targets,
        .admin-translation-mode {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
        }

        .admin-translation-form input,
        .admin-translation-form select {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.22);
          color: white;
          padding: 11px 12px;
          font: inherit;
        }

        .admin-translation-targets label,
        .admin-translation-targets p,
        .admin-translation-mode label,
        .admin-translation-confirm {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-translation-confirm {
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
        }

        .admin-translation-targets p {
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
        }

        .admin-translation-targets input,
        .admin-translation-mode input,
        .admin-translation-confirm input {
          width: auto;
        }

        .admin-translation-actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .admin-translation-actions button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: white;
          color: #111;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-translation-actions button + button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .admin-translation-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .admin-translation-error {
          display: grid;
          gap: 4px;
          margin-top: 16px;
          border: 1px solid rgba(255, 110, 110, 0.38);
          border-radius: 8px;
          background: rgba(255, 80, 80, 0.1);
          color: #ffd2d2;
          padding: 12px;
        }

        .admin-translation-warning {
          display: grid;
          gap: 4px;
          margin-top: 16px;
          border: 1px solid rgba(255, 198, 92, 0.42);
          border-radius: 8px;
          background: rgba(255, 174, 54, 0.12);
          color: #ffe4ac;
          padding: 12px;
        }

        .admin-translation-results {
          display: grid;
          gap: 16px;
        }

        .admin-translation-meta,
        .admin-translation-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-translation-panel {
          display: grid;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.16);
          padding: 14px;
        }

        .admin-translation-field {
          display: grid;
          gap: 4px;
          margin: 0;
        }

        .admin-translation-field dt {
          color: rgba(255, 255, 255, 0.54);
          font-size: 12px;
        }

        .admin-translation-field dd {
          margin: 0;
          color: rgba(255, 255, 255, 0.88);
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .admin-translation-section-title {
          margin: 4px 0 10px;
        }

        .admin-translation-muted {
          color: rgba(255, 255, 255, 0.62);
        }

        @media (max-width: 760px) {
          .admin-translation-form,
          .admin-translation-meta,
          .admin-translation-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
