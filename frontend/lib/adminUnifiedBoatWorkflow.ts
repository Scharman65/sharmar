export type AdminLocale = "ru" | "en" | "sr-Latn-ME";
export type AdminLang = "ru" | "en" | "me";
export type JsonRecord = Record<string, unknown>;

export const REQUIRED_ADMIN_LOCALES: AdminLocale[] = ["en", "ru", "sr-Latn-ME"];

export type LogicalRoute = {
  documentId: string;
  rows: JsonRecord[];
  locales: Record<AdminLocale, JsonRecord | null>;
  primary: JsonRecord;
  boatDocumentId: string | null;
  blockers: string[];
  ready: boolean;
};

export type LogicalBoat = {
  documentId: string;
  rows: JsonRecord[];
  locales: Record<AdminLocale, JsonRecord | null>;
  primary: JsonRecord;
  routes: LogicalRoute[];
  blockers: string[];
  ready: boolean;
};

const localeLabels: Record<AdminLocale, "EN" | "RU" | "ME"> = {
  en: "EN",
  ru: "RU",
  "sr-Latn-ME": "ME",
};

const copy = {
  ru: {
    missingBoatLocale: (locale: string) => `Нет версии лодки ${locale}.`,
    incompleteBoatLocale: (locale: string) => `В версии лодки ${locale} не заполнены название или slug.`,
    duplicateBoatLocale: (locale: string) => `Найдены дубли версии лодки ${locale}.`,
    ownerMissing: "У лодки не найден владелец.",
    ownerNotApproved: "Владелец не подтвержден.",
    ownerDocumentsMissing: "Не загружен документ владельца.",
    boatPhotoMissing: "Нужна хотя бы одна фотография лодки.",
    marinaMissing: "Не указана марина.",
    routeMissing: "Нужен хотя бы один связанный маршрут.",
    missingRouteLocale: (title: string, locale: string) => `У маршрута «${title}» нет версии ${locale}.`,
    incompleteRouteLocale: (title: string, locale: string) => `В маршруте «${title}» версия ${locale} заполнена не полностью.`,
    duplicateRouteLocale: (title: string, locale: string) => `У маршрута «${title}» найдены дубли версии ${locale}.`,
    routeMediaMissing: (title: string) => `У маршрута «${title}» нет медиа.`,
    routeRelationInvalid: (title: string) => `Маршрут «${title}» не связан с этой лодкой.`,
    routeBlockedStatus: (title: string) => `Маршрут «${title}» нельзя публиковать в текущем состоянии.`,
    boatBlockedStatus: "Лодку нельзя публиковать в текущем состоянии.",
  },
  en: {
    missingBoatLocale: (locale: string) => `${locale} boat version is missing.`,
    incompleteBoatLocale: (locale: string) => `${locale} boat version needs title and slug.`,
    duplicateBoatLocale: (locale: string) => `Duplicate ${locale} boat versions were found.`,
    ownerMissing: "Boat owner is missing.",
    ownerNotApproved: "Owner is not approved.",
    ownerDocumentsMissing: "Owner document is missing.",
    boatPhotoMissing: "At least one boat photo is required.",
    marinaMissing: "Marina is missing.",
    routeMissing: "At least one linked route is required.",
    missingRouteLocale: (title: string, locale: string) => `${title} is missing the ${locale} route version.`,
    incompleteRouteLocale: (title: string, locale: string) => `${title} has an incomplete ${locale} route version.`,
    duplicateRouteLocale: (title: string, locale: string) => `${title} has duplicate ${locale} route versions.`,
    routeMediaMissing: (title: string) => `${title} needs route media.`,
    routeRelationInvalid: (title: string) => `${title} is not linked to this boat.`,
    routeBlockedStatus: (title: string) => `${title} cannot be published in its current state.`,
    boatBlockedStatus: "Boat cannot be published in its current state.",
  },
  me: {
    missingBoatLocale: (locale: string) => `Nedostaje ${locale} verzija plovila.`,
    incompleteBoatLocale: (locale: string) => `${locale} verzija plovila nema naziv ili slug.`,
    duplicateBoatLocale: (locale: string) => `Pronađeni su duplikati ${locale} verzije plovila.`,
    ownerMissing: "Vlasnik plovila nije pronađen.",
    ownerNotApproved: "Vlasnik nije potvrđen.",
    ownerDocumentsMissing: "Dokument vlasnika nije učitan.",
    boatPhotoMissing: "Potrebna je bar jedna fotografija plovila.",
    marinaMissing: "Marina nije navedena.",
    routeMissing: "Potrebna je bar jedna povezana ruta.",
    missingRouteLocale: (title: string, locale: string) => `Ruti „${title}” nedostaje ${locale} verzija.`,
    incompleteRouteLocale: (title: string, locale: string) => `Ruta „${title}” nema potpunu ${locale} verziju.`,
    duplicateRouteLocale: (title: string, locale: string) => `Ruta „${title}” ima duplikate ${locale} verzije.`,
    routeMediaMissing: (title: string) => `Ruta „${title}” nema medije.`,
    routeRelationInvalid: (title: string) => `Ruta „${title}” nije povezana sa ovim plovilom.`,
    routeBlockedStatus: (title: string) => `Ruta „${title}” ne može biti objavljena u trenutnom stanju.`,
    boatBlockedStatus: "Plovilo ne može biti objavljeno u trenutnom stanju.",
  },
};

export function localeLabel(locale: AdminLocale): "EN" | "RU" | "ME" {
  return localeLabels[locale];
}

export function strapiLocaleFromLang(lang: AdminLang): AdminLocale {
  return lang === "me" ? "sr-Latn-ME" : lang;
}

export function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function localeOf(row: JsonRecord): AdminLocale | null {
  const locale = row.locale;
  return locale === "en" || locale === "ru" || locale === "sr-Latn-ME" ? locale : null;
}

function publicOrNewest(a: JsonRecord | null, b: JsonRecord): JsonRecord {
  if (!a) return b;
  if (asText(b.publishedAt) && !asText(a.publishedAt)) return b;
  if (asText(b.updated_at ?? b.updatedAt) > asText(a.updated_at ?? a.updatedAt)) return b;
  return a;
}

function pickPrimary(rows: JsonRecord[], preferredLocale: AdminLocale): JsonRecord {
  const preferred = rows.filter((row) => localeOf(row) === preferredLocale).reduce<JsonRecord | null>(publicOrNewest, null);
  return preferred ?? rows.reduce<JsonRecord | null>(publicOrNewest, null) ?? rows[0] ?? {};
}

function groupLocales(rows: JsonRecord[]): Record<AdminLocale, JsonRecord | null> {
  return REQUIRED_ADMIN_LOCALES.reduce<Record<AdminLocale, JsonRecord | null>>((acc, locale) => {
    acc[locale] = rows.filter((row) => localeOf(row) === locale).reduce<JsonRecord | null>(publicOrNewest, null);
    return acc;
  }, { en: null, ru: null, "sr-Latn-ME": null });
}

function hasDuplicateLocalization(rows: JsonRecord[], locale: AdminLocale): boolean {
  const localeRows = rows.filter((row) => localeOf(row) === locale);
  const draftRows = localeRows.filter((row) => !asText(row.publishedAt));
  const publishedRows = localeRows.filter((row) => asText(row.publishedAt));
  return draftRows.length > 1 || publishedRows.length > 1;
}

function photoCount(row: JsonRecord | null): number {
  if (!row) return 0;
  return (asNumber(row.cover_count) ?? 0) + (asNumber(row.images_count) ?? 0);
}

function routeMediaCount(row: JsonRecord | null): number {
  if (!row) return 0;
  return (asNumber(row.cover_count) ?? 0) + (asNumber(row.gallery_count) ?? 0);
}

function routeTitle(route: LogicalRoute, lang: AdminLang): string {
  const preferred = route.locales[strapiLocaleFromLang(lang)] ?? route.primary;
  return asText(preferred.title) || asText(route.primary.title) || "Route";
}

function allowedPublishStatus(value: unknown, publishedAt: unknown): boolean {
  const status = asText(value) || (asText(publishedAt) ? "published" : "");
  return ["submitted", "under_review", "approved", "published"].includes(status);
}

function buildRoute(documentId: string, rows: JsonRecord[], boatDocumentId: string, lang: AdminLang): LogicalRoute {
  const locales = groupLocales(rows);
  const primary = pickPrimary(rows, strapiLocaleFromLang(lang));
  const labels = copy[lang];
  const title = asText(primary.title) || documentId;
  const blockers: string[] = [];

  for (const locale of REQUIRED_ADMIN_LOCALES) {
    const label = localeLabel(locale);
    const row = locales[locale];
    if (!row) blockers.push(labels.missingRouteLocale(title, label));
    if (hasDuplicateLocalization(rows, locale)) blockers.push(labels.duplicateRouteLocale(title, label));
    if (
      row &&
      (!asText(row.title) ||
        !asText(row.slug) ||
        (asNumber(row.duration_hours) ?? 0) <= 0 ||
        (asNumber(row.price) ?? 0) <= 0 ||
        asText(row.currency) !== "EUR")
    ) {
      blockers.push(labels.incompleteRouteLocale(title, label));
    }
  }

  if (!rows.some((row) => asText(row.boatDocumentId) === boatDocumentId)) {
    blockers.push(labels.routeRelationInvalid(title));
  }

  if (!rows.some((row) => routeMediaCount(row) > 0)) {
    blockers.push(labels.routeMediaMissing(title));
  }

  if (!rows.every((row) => allowedPublishStatus(row.moderation_status, row.publishedAt))) {
    blockers.push(labels.routeBlockedStatus(title));
  }

  return {
    documentId,
    rows,
    locales,
    primary,
    boatDocumentId: asText(primary.boatDocumentId) || null,
    blockers: Array.from(new Set(blockers)),
    ready: blockers.length === 0,
  };
}

export function groupLogicalBoats(boats: JsonRecord[], routes: JsonRecord[], lang: AdminLang): LogicalBoat[] {
  const boatGroups = new Map<string, JsonRecord[]>();
  for (const boat of boats) {
    const documentId = asText(boat.documentId);
    if (!documentId) continue;
    boatGroups.set(documentId, [...(boatGroups.get(documentId) ?? []), boat]);
  }

  const routeGroups = new Map<string, JsonRecord[]>();
  for (const route of routes) {
    const documentId = asText(route.documentId);
    if (!documentId) continue;
    routeGroups.set(documentId, [...(routeGroups.get(documentId) ?? []), route]);
  }

  return Array.from(boatGroups.entries()).map(([documentId, rows]) => {
    const locales = groupLocales(rows);
    const primary = pickPrimary(rows, strapiLocaleFromLang(lang));
    const labels = copy[lang];
    const linkedRoutes = Array.from(routeGroups.entries())
      .filter(([, routeRows]) => routeRows.some((route) => asText(route.boatDocumentId) === documentId))
      .map(([routeDocumentId, routeRows]) => buildRoute(routeDocumentId, routeRows, documentId, lang));
    const blockers: string[] = [];

    for (const locale of REQUIRED_ADMIN_LOCALES) {
      const label = localeLabel(locale);
      const row = locales[locale];
      if (!row) blockers.push(labels.missingBoatLocale(label));
      if (hasDuplicateLocalization(rows, locale)) blockers.push(labels.duplicateBoatLocale(label));
      if (row && (!asText(row.title) || !asText(row.slug))) {
        blockers.push(labels.incompleteBoatLocale(label));
      }
    }

    if (!asText(primary.owner_display_name ?? primary.owner_email) && !asNumber(primary.owner_user_id ?? primary.created_by_id)) {
      blockers.push(labels.ownerMissing);
    }
    if (primary.owner_confirmed === false || primary.owner_blocked === true) {
      blockers.push(labels.ownerNotApproved);
    }
    if (primary.owner_documents_count !== undefined && (asNumber(primary.owner_documents_count) ?? 0) < 1) {
      blockers.push(labels.ownerDocumentsMissing);
    }
    if (!rows.some((row) => photoCount(row) > 0)) {
      blockers.push(labels.boatPhotoMissing);
    }
    if (!asText(primary.marina_name ?? primary.home_marina_name)) {
      blockers.push(labels.marinaMissing);
    }
    if (!linkedRoutes.length) {
      blockers.push(labels.routeMissing);
    }
    if (!rows.every((row) => allowedPublishStatus(row.moderation_status, row.publishedAt))) {
      blockers.push(labels.boatBlockedStatus);
    }

    return {
      documentId,
      rows,
      locales,
      primary,
      routes: linkedRoutes,
      blockers: Array.from(new Set([...blockers, ...linkedRoutes.flatMap((route) => route.blockers)])),
      ready: blockers.length === 0 && linkedRoutes.every((route) => route.ready),
    };
  });
}

export function logicalDocumentCount(rows: JsonRecord[]): number {
  return new Set(rows.map((row) => asText(row.documentId)).filter(Boolean)).size;
}

export function routePriceInvariantRows(routes: JsonRecord[]) {
  return routes.map((route) => ({
    title: asText(route.title),
    duration_hours: asNumber(route.duration_hours),
    price: asNumber(route.price),
    currency: asText(route.currency),
  }));
}

export function routeDisplayTitle(route: LogicalRoute, lang: AdminLang): string {
  return routeTitle(route, lang);
}
