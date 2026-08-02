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

export type BoatOwnerLink = {
  boat_id: number | null;
  boat_document_id: string | null;
  boat_locale: string | null;
  owner_user_id: number | null;
  created_by_id: number | null;
  owner_profile_id: number | null;
  owner_email: string | null;
  owner_username: string | null;
  owner_display_name: string | null;
  owner_phone: string | null;
  owner_confirmed: boolean | null;
  owner_blocked: boolean | null;
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

export function resolveLogicalBoatSourceLocale(
  boat: LogicalBoat,
  preferredLocale: AdminLocale,
): AdminLocale | null {
  if (boat.locales[preferredLocale]) return preferredLocale;

  const primaryLocale = asText(boat.primary.locale);
  if (
    (primaryLocale === "en" ||
      primaryLocale === "ru" ||
      primaryLocale === "sr-Latn-ME") &&
    boat.locales[primaryLocale]
  ) {
    return primaryLocale;
  }

  for (const locale of REQUIRED_ADMIN_LOCALES) {
    if (boat.locales[locale]) return locale;
  }

  return null;
}

export function asText(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function extractCmsAdminSummaryPayload(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const nestedData = isRecord(value.data) ? value.data : null;
  if (
    nestedData &&
    (Array.isArray(nestedData.boatOwnerLinks) ||
      Array.isArray(nestedData.owners) ||
      Array.isArray(nestedData.bookingRequests) ||
      Array.isArray(nestedData.payments) ||
      isRecord(nestedData.summary))
  ) {
    return nestedData;
  }

  return value;
}

export function extractCmsBoatOwnerLinks(value: unknown): unknown[] {
  const payload = extractCmsAdminSummaryPayload(value);
  return payload && Array.isArray(payload.boatOwnerLinks) ? payload.boatOwnerLinks : [];
}

function normalizeBoatOwnerLink(item: unknown): BoatOwnerLink | null {
  if (!isRecord(item)) return null;

  return {
    boat_id: asNumber(item.boat_id),
    boat_document_id: asText(item.boat_document_id) || null,
    boat_locale: asText(item.boat_locale) || null,
    owner_user_id: asNumber(item.owner_user_id),
    created_by_id: asNumber(item.created_by_id),
    owner_profile_id: asNumber(item.owner_profile_id),
    owner_email: asText(item.owner_email) || null,
    owner_username: asText(item.owner_username) || null,
    owner_display_name: asText(item.owner_display_name) || null,
    owner_phone: asText(item.owner_phone) || null,
    owner_confirmed: asBoolean(item.owner_confirmed),
    owner_blocked: asBoolean(item.owner_blocked),
  };
}

function boatOwnerDocumentLocaleKey(documentId: string | null | undefined, locale: string | null | undefined): string | null {
  return documentId && locale ? `${documentId}:${locale}` : null;
}

function hasOwnerIdentity(link: BoatOwnerLink): boolean {
  return Boolean(
    asText(link.owner_display_name ?? link.owner_email) ||
      asNumber(link.owner_user_id ?? link.created_by_id) !== null
  );
}

function preferOwnerLink(current: BoatOwnerLink | undefined, next: BoatOwnerLink): BoatOwnerLink {
  if (!current) return next;
  if (!hasOwnerIdentity(current) && hasOwnerIdentity(next)) return next;
  return current;
}

function applyOwnerLink<T extends JsonRecord>(boat: T, link: BoatOwnerLink): T {
  return {
    ...boat,
    owner_user_id: link.owner_user_id ?? asNumber(boat.owner_user_id) ?? null,
    created_by_id: link.created_by_id ?? asNumber(boat.created_by_id) ?? null,
    owner_profile_id: link.owner_profile_id ?? asNumber(boat.owner_profile_id) ?? null,
    owner_email: (link.owner_email ?? asText(boat.owner_email)) || null,
    owner_username: (link.owner_username ?? asText(boat.owner_username)) || null,
    owner_display_name: (link.owner_display_name ?? asText(boat.owner_display_name)) || null,
    owner_phone: (link.owner_phone ?? asText(boat.owner_phone)) || null,
    owner_confirmed:
      link.owner_confirmed ??
      (typeof boat.owner_confirmed === "boolean" ? boat.owner_confirmed : null),
    owner_blocked:
      link.owner_blocked ??
      (typeof boat.owner_blocked === "boolean" ? boat.owner_blocked : null),
  };
}

export function mergeBoatOwnerLinks<T extends JsonRecord>(boats: T[], rawLinks: unknown[] | undefined): T[] {
  const links = (rawLinks ?? [])
    .map(normalizeBoatOwnerLink)
    .filter((link): link is BoatOwnerLink => Boolean(link));

  const byId = new Map<number, BoatOwnerLink>();
  const byDocumentLocale = new Map<string, BoatOwnerLink>();
  const byDocument = new Map<string, BoatOwnerLink>();

  for (const link of links) {
    if (link.boat_id !== null) byId.set(link.boat_id, preferOwnerLink(byId.get(link.boat_id), link));

    const documentLocaleKey = boatOwnerDocumentLocaleKey(link.boat_document_id, link.boat_locale);
    if (documentLocaleKey) byDocumentLocale.set(documentLocaleKey, preferOwnerLink(byDocumentLocale.get(documentLocaleKey), link));

    if (link.boat_document_id) {
      byDocument.set(link.boat_document_id, preferOwnerLink(byDocument.get(link.boat_document_id), link));
    }
  }

  return boats.map((boat) => {
    const id = asNumber(boat.id);
    const documentId = asText(boat.documentId) || null;
    const locale = asText(boat.locale) || null;
    const documentLocaleKey = boatOwnerDocumentLocaleKey(documentId, locale);
    const link =
      (id !== null ? byId.get(id) : null) ??
      (documentLocaleKey ? byDocumentLocale.get(documentLocaleKey) : null) ??
      (documentId ? byDocument.get(documentId) : null);

    return link ? applyOwnerLink(boat, link) : boat;
  });
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
    const selectedPrimary = pickPrimary(rows, strapiLocaleFromLang(lang));
    const ownerSource =
      rows.find(
        (row) =>
          Boolean(asText(row.owner_display_name ?? row.owner_email)) ||
          asNumber(row.owner_user_id ?? row.created_by_id) !== null
      ) ?? selectedPrimary;
    const marinaSource =
      rows.find(
        (row) =>
          Boolean(asText(row.marina_name ?? row.home_marina_name)) &&
          asText(row.state) === "published"
      ) ??
      rows.find((row) => Boolean(asText(row.marina_name ?? row.home_marina_name))) ??
      selectedPrimary;
    const primary: JsonRecord = {
      ...selectedPrimary,
      owner_user_id:
        asNumber(ownerSource.owner_user_id) ??
        asNumber(selectedPrimary.owner_user_id) ??
        null,
      created_by_id:
        asNumber(ownerSource.created_by_id) ??
        asNumber(selectedPrimary.created_by_id) ??
        null,
      owner_display_name:
        asText(ownerSource.owner_display_name) ??
        asText(selectedPrimary.owner_display_name) ??
        null,
      owner_email:
        asText(ownerSource.owner_email) ??
        asText(selectedPrimary.owner_email) ??
        null,
      owner_confirmed:
        typeof ownerSource.owner_confirmed === "boolean"
          ? ownerSource.owner_confirmed
          : selectedPrimary.owner_confirmed,
      owner_blocked:
        typeof ownerSource.owner_blocked === "boolean"
          ? ownerSource.owner_blocked
          : selectedPrimary.owner_blocked,
      owner_documents_count:
        asNumber(ownerSource.owner_documents_count) ??
        asNumber(selectedPrimary.owner_documents_count) ??
        undefined,
      marina_name:
        asText(marinaSource.marina_name ?? marinaSource.home_marina_name) ??
        asText(selectedPrimary.marina_name ?? selectedPrimary.home_marina_name) ??
        null,
      marina_slug:
        asText(marinaSource.marina_slug ?? marinaSource.home_marina_slug) ??
        asText(selectedPrimary.marina_slug ?? selectedPrimary.home_marina_slug) ??
        null,
    };
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
