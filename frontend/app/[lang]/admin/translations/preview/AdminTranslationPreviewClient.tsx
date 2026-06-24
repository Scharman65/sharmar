"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Lang } from "@/i18n";

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

type Copy = {
  title: string;
  warning: string;
  adminToken: string;
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
    adminToken: "Admin token",
    documentId: "Boat documentId",
    sourceLocale: "Исходный язык",
    targetLocales: "Целевые языки",
    targetLocalesAutomatic: "Определяются автоматически по исходному языку.",
    sourceOnly: "Preview source only",
    aiPreview: "Generate AI preview",
    previewButton: "Проверить без AI",
    generateButton: "Сгенерировать AI preview",
    loading: "Загрузка...",
    sourcePayload: "Исходные данные",
    aiResult: "AI preview",
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
      boatDocumentId: "Boat documentId",
      documentId: "documentId",
      sourceDocumentId: "sourceDocumentId",
      title: "Заголовок",
      description: "Описание",
      shortDescription: "Краткое описание",
      fullDescription: "Полное описание",
      includedServices: "Включённые услуги",
      meetingPoint: "Место встречи",
    },
    warnings: {
      experience_source_locale_not_found: "Маршрут связан с лодкой, но локализация маршрута для исходного языка не найдена.",
      unknown: "Предупреждение.",
    },
    errors: {
      admin_translation_token_missing: "ADMIN_TRANSLATION_TOKEN не настроен на сервере.",
      unauthorized: "Неверный admin token.",
      boat_not_found: "Лодка с таким documentId не найдена.",
      source_locale_not_found: "Локализация лодки для выбранного исходного языка не найдена.",
      target_locales_required: "Нужно выбрать хотя бы один целевой язык, отличный от исходного.",
      openai_api_key_missing: "OPENAI_API_KEY не настроен на сервере frontend.",
      openai_request_failed: "Запрос к OpenAI не выполнен.",
      ai_translation_invalid_response: "AI вернул некорректный JSON.",
      unknown: "Неизвестная ошибка.",
    },
  },
  en: {
    title: "Boat AI translation",
    warning: "This is preview only. Translations are not saved or published.",
    adminToken: "Admin token",
    documentId: "Boat documentId",
    sourceLocale: "Source locale",
    targetLocales: "Target locales",
    targetLocalesAutomatic: "Selected automatically from the source locale.",
    sourceOnly: "Preview source only",
    aiPreview: "Generate AI preview",
    previewButton: "Проверить без AI",
    generateButton: "Сгенерировать AI preview",
    loading: "Loading...",
    sourcePayload: "Source payload",
    aiResult: "AI preview",
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
      boatDocumentId: "Boat documentId",
      documentId: "documentId",
      sourceDocumentId: "sourceDocumentId",
      title: "Title",
      description: "Description",
      shortDescription: "Short description",
      fullDescription: "Full description",
      includedServices: "Included services",
      meetingPoint: "Meeting point",
    },
    warnings: {
      experience_source_locale_not_found: "A route is linked to the boat, but the route localization for the source locale was not found.",
      unknown: "Warning.",
    },
    errors: {
      admin_translation_token_missing: "ADMIN_TRANSLATION_TOKEN is not configured on the server.",
      unauthorized: "Invalid admin token.",
      boat_not_found: "Boat with this documentId was not found.",
      source_locale_not_found: "Boat localization for the selected source locale was not found.",
      target_locales_required: "Select at least one target locale different from the source locale.",
      openai_api_key_missing: "OPENAI_API_KEY is not configured in the frontend runtime.",
      openai_request_failed: "OpenAI request failed.",
      ai_translation_invalid_response: "AI returned invalid JSON.",
      unknown: "Unknown error.",
    },
  },
  me: {
    title: "AI prevod broda",
    warning: "Ovo je samo pregled. Prevodi se ne čuvaju i ne objavljuju.",
    adminToken: "Admin token",
    documentId: "Boat documentId",
    sourceLocale: "Izvorni jezik",
    targetLocales: "Ciljni jezici",
    targetLocalesAutomatic: "Određuju se automatski na osnovu izvornog jezika.",
    sourceOnly: "Preview source only",
    aiPreview: "Generate AI preview",
    previewButton: "Проверить без AI",
    generateButton: "Сгенерировать AI preview",
    loading: "Učitavanje...",
    sourcePayload: "Izvorni podaci",
    aiResult: "AI preview",
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
      boatDocumentId: "Boat documentId",
      documentId: "documentId",
      sourceDocumentId: "sourceDocumentId",
      title: "Naslov",
      description: "Opis",
      shortDescription: "Kratak opis",
      fullDescription: "Pun opis",
      includedServices: "Uključene usluge",
      meetingPoint: "Mjesto susreta",
    },
    warnings: {
      experience_source_locale_not_found: "Ruta je povezana sa brodom, ali lokalizacija rute za izvorni jezik nije pronađena.",
      unknown: "Upozorenje.",
    },
    errors: {
      admin_translation_token_missing: "ADMIN_TRANSLATION_TOKEN nije podešen na serveru.",
      unauthorized: "Neispravan admin token.",
      boat_not_found: "Brod sa ovim documentId nije pronađen.",
      source_locale_not_found: "Lokalizacija broda za izabrani izvorni jezik nije pronađena.",
      target_locales_required: "Izaberite makar jedan ciljni jezik koji nije izvorni.",
      openai_api_key_missing: "OPENAI_API_KEY nije podešen u frontend runtime okruženju.",
      openai_request_failed: "OpenAI zahtjev nije uspio.",
      ai_translation_invalid_response: "AI je vratio neispravan JSON.",
      unknown: "Nepoznata greška.",
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
  const details = [warning.sourceDocumentId, warning.sourceLocale].filter(Boolean).join(" / ");
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

export default function AdminTranslationPreviewClient({ lang }: { lang: Lang }) {
  const ui = copy[lang];
  const [adminToken, setAdminToken] = useState("");
  const [boatDocumentId, setBoatDocumentId] = useState("c3sj1g144tsjzaua10sejoeu");
  const [sourceLocale, setSourceLocale] = useState<StrapiLocale>("ru");
  const [generateAi, setGenerateAi] = useState(false);
  const [response, setResponse] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const targetLocales = useMemo<StrapiLocale[]>(
    () => targetLocalesForSource(sourceLocale),
    [sourceLocale]
  );

  async function submit(nextGenerateAi: boolean) {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/admin/translations/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
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

  const routes = response?.experiences ?? [];
  const aiRoutes = response?.aiPreview?.experiences ?? [];
  const warnings = response?.warnings ?? [];
  const previewTargetLocales = response?.aiPreview?.targetLocales ?? response?.targetLocales ?? [];

  return (
    <div className="admin-translation-shell">
      <section className="admin-translation-card">
        <div className="admin-translation-header">
          <p className="kicker">Sharmar Admin</p>
          <h1>{ui.title}</h1>
          <p>{ui.warning}</p>
        </div>

        <form className="admin-translation-form" onSubmit={onSubmit}>
          <label>
            <span>{ui.adminToken}</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              autoComplete="off"
              required
            />
          </label>

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
        .admin-translation-mode label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-translation-targets p {
          margin: 0;
          color: rgba(255, 255, 255, 0.58);
        }

        .admin-translation-targets input,
        .admin-translation-mode input {
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
