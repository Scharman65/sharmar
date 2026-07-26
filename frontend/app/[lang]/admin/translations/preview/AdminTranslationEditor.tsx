"use client";

import type { Lang } from "@/i18n";

type TranslationFields = {
  title?: string | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  included_services?: string | null;
  meeting_point?: string | null;
};

export type EditableAiPreview = {
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

type FieldName = keyof TranslationFields;
const boatFields: FieldName[] = ["title", "description"];
const routeFields: FieldName[] = ["title", "short_description", "full_description", "included_services", "meeting_point"];

const copy: Record<Lang, {
  title: string;
  notice: string;
  boat: string;
  routes: string;
  sourceId: string;
  labels: Record<FieldName, string>;
}> = {
  ru: {
    title: "Редактирование переводов",
    notice: "Проверьте и исправьте текст перед dry-run. Цены, длительность, slug, фотографии и связи здесь не изменяются.",
    boat: "Лодка",
    routes: "Маршруты",
    sourceId: "Технический ID источника",
    labels: {
      title: "Заголовок",
      description: "Описание",
      short_description: "Краткое описание",
      full_description: "Полное описание",
      included_services: "Включённые услуги",
      meeting_point: "Место встречи",
    },
  },
  en: {
    title: "Edit translations",
    notice: "Review and edit the text before the dry run. Prices, duration, slug, media and relations are not changed here.",
    boat: "Boat",
    routes: "Routes",
    sourceId: "Source technical ID",
    labels: {
      title: "Title",
      description: "Description",
      short_description: "Short description",
      full_description: "Full description",
      included_services: "Included services",
      meeting_point: "Meeting point",
    },
  },
  me: {
    title: "Uređivanje prevoda",
    notice: "Provjerite i uredite tekst prije probne provjere. Cijene, trajanje, slug, fotografije i veze se ovdje ne mijenjaju.",
    boat: "Brod",
    routes: "Rute",
    sourceId: "Tehnički ID izvora",
    labels: {
      title: "Naslov",
      description: "Opis",
      short_description: "Kratak opis",
      full_description: "Puni opis",
      included_services: "Uključene usluge",
      meeting_point: "Mjesto susreta",
    },
  },
};

function localeLabel(locale: string) {
  return locale === "sr-Latn-ME" ? "ME" : locale.toUpperCase();
}

function clonePreview(value: EditableAiPreview): EditableAiPreview {
  return JSON.parse(JSON.stringify(value)) as EditableAiPreview;
}

function FieldEditor({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: FieldName;
  value: string | null | undefined;
  onChange: (field: FieldName, value: string) => void;
}) {
  const normalized = value ?? "";
  return (
    <label className="admin-translation-editor-field">
      <span>{label}</span>
      {field === "title" ? (
        <input value={normalized} onChange={(event) => onChange(field, event.target.value)} />
      ) : (
        <textarea
          value={normalized}
          onChange={(event) => onChange(field, event.target.value)}
          rows={field === "description" || field === "full_description" ? 5 : 3}
        />
      )}
    </label>
  );
}

export default function AdminTranslationEditor({
  lang,
  value,
  targetLocales,
  onChange,
}: {
  lang: Lang;
  value: EditableAiPreview;
  targetLocales: string[];
  onChange: (next: EditableAiPreview) => void;
}) {
  const ui = copy[lang];

  function updateBoat(locale: string, field: FieldName, nextValue: string) {
    const next = clonePreview(value);
    next.boat ??= {};
    next.boat.translations ??= {};
    next.boat.translations[locale] ??= {};
    next.boat.translations[locale]![field] = nextValue;
    onChange(next);
  }

  function updateRoute(routeIndex: number, locale: string, field: FieldName, nextValue: string) {
    const next = clonePreview(value);
    next.experiences ??= [];
    const route = next.experiences[routeIndex];
    if (!route) return;
    route.translations ??= {};
    route.translations[locale] ??= {};
    route.translations[locale]![field] = nextValue;
    onChange(next);
  }

  return (
    <section className="admin-translation-card admin-translation-editor">
      <h2>{ui.title}</h2>
      <p className="admin-translation-muted">{ui.notice}</p>

      <h3 className="admin-translation-section-title">{ui.boat}</h3>
      <div className="admin-translation-grid">
        {targetLocales.map((locale) => {
          const translation = value.boat?.translations?.[locale];
          return (
            <section className="admin-translation-panel" key={`boat-edit-${locale}`}>
              <h3>{localeLabel(locale)}</h3>
              {boatFields.map((field) => (
                <FieldEditor
                  key={field}
                  label={ui.labels[field]}
                  field={field}
                  value={translation?.[field]}
                  onChange={(name, nextValue) => updateBoat(locale, name, nextValue)}
                />
              ))}
            </section>
          );
        })}
      </div>

      <h3 className="admin-translation-section-title">{ui.routes}</h3>
      <div className="admin-translation-grid">
        {(value.experiences ?? []).map((route, routeIndex) => (
          <section className="admin-translation-panel" key={`route-edit-${route.sourceDocumentId ?? routeIndex}`}>
            <p className="admin-translation-muted">{ui.sourceId}: {route.sourceDocumentId ?? "—"}</p>
            {targetLocales.map((locale) => {
              const translation = route.translations?.[locale];
              return (
                <div className="admin-translation-editor-locale" key={`route-edit-${routeIndex}-${locale}`}>
                  <h4>{localeLabel(locale)}</h4>
                  {routeFields.map((field) => (
                    <FieldEditor
                      key={field}
                      label={ui.labels[field]}
                      field={field}
                      value={translation?.[field]}
                      onChange={(name, nextValue) => updateRoute(routeIndex, locale, name, nextValue)}
                    />
                  ))}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <style jsx>{`
        .admin-translation-editor { display: grid; gap: 18px; }
        .admin-translation-editor-locale {
          display: grid;
          gap: 12px;
          padding-top: 14px;
          margin-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }
        .admin-translation-editor-locale:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
        :global(.admin-translation-editor-field) { display: grid; gap: 7px; margin-top: 12px; }
        :global(.admin-translation-editor-field span) { font-weight: 700; }
        :global(.admin-translation-editor-field input),
        :global(.admin-translation-editor-field textarea) {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.22);
          color: inherit;
          padding: 11px 12px;
          font: inherit;
          line-height: 1.45;
        }
        :global(.admin-translation-editor-field textarea) { resize: vertical; min-height: 86px; }
      `}</style>
    </section>
  );
}
