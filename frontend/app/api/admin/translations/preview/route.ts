import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;
type Locale = "ru" | "en" | "sr-Latn-ME";
type PreviewWarning = {
  code: "experience_source_locale_not_found" | "experience_source_locale_inferred_from_linked_row";
  sourceDocumentId?: string | null;
  sourceLocale?: Locale;
  actualLocale?: string | null;
};
type ExperienceSourceCandidate = {
  documentId: string;
  linkedRows: JsonObject[];
};
type FieldStatus = "exists" | "missing";
type Readiness = "ready" | "missing" | "incomplete";

const DEFAULT_SOURCE_LOCALE: Locale = "ru";
const ALL_LOCALES: Locale[] = ["ru", "en", "sr-Latn-ME"];
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_TRANSLATION_MODEL = "gpt-4.1-mini";

function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function getAdminTranslationToken(): string {
  return (process.env.ADMIN_TRANSLATION_TOKEN || "").trim();
}

function getOpenAiKey(): string {
  return (process.env.OPENAI_API_KEY || "").trim();
}

function getOpenAiTranslationModel(): string {
  return (process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_OPENAI_TRANSLATION_MODEL).trim();
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLocale(value: unknown): Locale | null {
  return value === "ru" || value === "en" || value === "sr-Latn-ME" ? value : null;
}

function asLocaleArray(value: unknown): Locale[] | null {
  if (!Array.isArray(value)) return null;
  const locales = value.map(asLocale).filter((item): item is Locale => item !== null);
  return locales.length ? Array.from(new Set(locales)) : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function localeDisplay(locale: Locale): "ru" | "en" | "me" {
  return locale === "sr-Latn-ME" ? "me" : locale;
}

function fieldStatus(value: string | null | undefined): FieldStatus {
  return value && value.trim() ? "exists" : "missing";
}

function readinessFromFields(exists: boolean, fields: Record<string, FieldStatus>): Readiness {
  if (!exists) return "missing";
  return Object.values(fields).every((status) => status === "exists") ? "ready" : "incomplete";
}

function containsCyrillic(value: string | null | undefined): boolean {
  return Boolean(value && /[\u0400-\u04FF]/.test(value));
}

function looksLikeBrandOrModelTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const normalized = title
    .trim()
    .replace(/[—–-]/g, " ")
    .replace(/[^\p{L}\p{N}. ]/gu, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return false;

  const words = normalized.split(" ");
  const hasLatin = /[A-Za-z]/.test(normalized);
  const hasCyrillic = containsCyrillic(normalized);
  const hasBrandCase = words.some((word) => /^[A-Z][A-Za-z0-9.]*$/.test(word));
  const hasModelNumber = /\d/.test(normalized);
  const isShort = words.length <= 4 && normalized.length <= 32;
  const isKnownDemoName = words[0]?.toLowerCase() === "demo";

  return hasLatin && !hasCyrillic && isShort && (hasBrandCase || hasModelNumber || isKnownDemoName);
}

function titleScriptHint(locale: Locale, title: string | null | undefined): string | null {
  if (!title) return null;
  const hasCyrillic = containsCyrillic(title);
  if (locale === "en" && hasCyrillic) return "EN title contains Cyrillic and may need translation review.";
  if (locale === "sr-Latn-ME" && hasCyrillic) return "ME title contains Cyrillic and may need Latin-script review.";
  if (locale === "ru" && !hasCyrillic && !looksLikeBrandOrModelTitle(title)) {
    return "RU title may need manual review; boat names may intentionally stay untranslated.";
  }
  return null;
}

function slugifyLatin(input: string | null | undefined, fallback: string): string {
  const base = (input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return base || fallback;
}

function slugCandidates(title: string | null | undefined, documentId: string | null | undefined, locale: Locale) {
  const shortDocumentId = (documentId || "document").slice(0, 8).toLowerCase();
  const localeKey = localeDisplay(locale);
  const latinOnly = slugifyLatin(title, `boat-${shortDocumentId}-${localeKey}`);

  return {
    latinOnly,
    deterministicCollisionSafe: `${latinOnly}-${localeKey}-${shortDocumentId}`,
    strategy: "Preview only. Check collisions before save; do not reserve or overwrite existing slugs.",
  };
}

function withQuery(path: string, params: string[]): string {
  return `${path}?${params.join("&")}`;
}

function getAttributes(item: unknown): JsonObject | null {
  if (!isRecord(item)) return null;
  const attrs = isRecord(item.attributes) ? item.attributes : {};
  return { ...item, ...attrs };
}

async function strapiGet(path: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const token = getServerToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json };
}

function boatPopulateParams(): string[] {
  return [
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=description",
    "fields[3]=year",
    "fields[4]=price_per_hour",
    "fields[5]=price_per_day",
    "fields[6]=price_per_week",
    "fields[7]=currency",
    "fields[8]=documentId",
    "fields[9]=locale",
    "fields[10]=publishedAt",
    "populate[experiences][fields][0]=title",
    "populate[experiences][fields][1]=slug",
    "populate[experiences][fields][2]=short_description",
    "populate[experiences][fields][3]=full_description",
    "populate[experiences][fields][4]=included_services",
    "populate[experiences][fields][5]=meeting_point",
    "populate[experiences][fields][6]=duration_hours",
    "populate[experiences][fields][7]=price",
    "populate[experiences][fields][8]=currency",
    "populate[experiences][fields][9]=max_guests",
    "populate[experiences][fields][10]=sort_order",
    "populate[experiences][fields][11]=is_active",
    "populate[experiences][fields][12]=documentId",
    "populate[experiences][fields][13]=locale",
    "populate[experiences][fields][14]=publishedAt",
    "populate[experiences][sort][0]=sort_order:asc",
    "populate[experiences][sort][1]=createdAt:desc",
  ];
}

function experienceQueryParams(boatId: number, locale: Locale, status: "draft" | "published"): string[] {
  return [
    `filters[boat][id][$eq]=${boatId}`,
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=short_description",
    "fields[3]=full_description",
    "fields[4]=included_services",
    "fields[5]=meeting_point",
    "fields[6]=duration_hours",
    "fields[7]=price",
    "fields[8]=currency",
    "fields[9]=max_guests",
    "fields[10]=sort_order",
    "fields[11]=is_active",
    "fields[12]=documentId",
    "fields[13]=locale",
    "fields[14]=publishedAt",
    "sort[0]=sort_order:asc",
    "sort[1]=createdAt:desc",
    "pagination[pageSize]=20",
  ];
}

function experienceDocumentQueryParams(
  experienceDocumentId: string,
  locale: Locale,
  status: "draft" | "published"
): string[] {
  return [
    `filters[documentId][$eq]=${encodeURIComponent(experienceDocumentId)}`,
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=short_description",
    "fields[3]=full_description",
    "fields[4]=included_services",
    "fields[5]=meeting_point",
    "fields[6]=duration_hours",
    "fields[7]=price",
    "fields[8]=currency",
    "fields[9]=max_guests",
    "fields[10]=sort_order",
    "fields[11]=is_active",
    "fields[12]=documentId",
    "fields[13]=locale",
    "fields[14]=publishedAt",
    "sort[0]=sort_order:asc",
    "sort[1]=createdAt:desc",
    "pagination[pageSize]=10",
  ];
}

function targetLocalesForSource(sourceLocale: Locale): Locale[] {
  return ALL_LOCALES.filter((locale) => locale !== sourceLocale);
}

async function fetchBoatCandidate(
  boatDocumentId: string,
  locale: Locale,
  status: "draft" | "published"
): Promise<JsonObject | null> {
  const params = [...boatPopulateParams(), `locale=${encodeURIComponent(locale)}`, `status=${status}`];

  const documentRes = await strapiGet(withQuery(`/api/boats/${encodeURIComponent(boatDocumentId)}`, params));
  const documentData = getAttributes(isRecord(documentRes.json) ? documentRes.json.data : null);
  if (documentRes.ok && documentData) return documentData;

  const collectionRes = await strapiGet(
    withQuery("/api/boats", [
      `filters[documentId][$eq]=${encodeURIComponent(boatDocumentId)}`,
      ...params,
      "pagination[pageSize]=10",
    ])
  );
  const rows = isRecord(collectionRes.json) && Array.isArray(collectionRes.json.data)
    ? collectionRes.json.data
    : [];

  for (const item of rows) {
    const row = getAttributes(item);
    if (row && row.documentId === boatDocumentId) return row;
  }

  const scannedRows = await scanBoatRows(locale, status, boatDocumentId);
  if (scannedRows.length) return scannedRows[0];

  return null;
}

async function scanBoatRows(
  locale: Locale,
  status: "draft" | "published",
  boatDocumentId?: string
): Promise<JsonObject[]> {
  const matches: JsonObject[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const res = await strapiGet(
      withQuery("/api/boats", [
        ...boatPopulateParams(),
        `locale=${encodeURIComponent(locale)}`,
        `status=${status}`,
        "pagination[pageSize]=100",
        `pagination[page]=${page}`,
        "sort=documentId:asc",
      ])
    );

    const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
    for (const item of rows) {
      const row = getAttributes(item);
      if (!row) continue;
      if (boatDocumentId && row.documentId !== boatDocumentId) continue;
      matches.push(row);
    }

    const pagination = isRecord(res.json) && isRecord(res.json.meta) && isRecord(res.json.meta.pagination)
      ? res.json.meta.pagination
      : null;
    const pageCount = pagination ? asNumber(pagination.pageCount) : null;
    if (pageCount !== null && page >= pageCount) break;
    if (!rows.length) break;
  }

  return matches;
}

async function findSourceBoat(boatDocumentId: string, sourceLocale: Locale): Promise<JsonObject | null> {
  const statusOrder: Array<"draft" | "published"> = ["draft", "published"];

  for (const status of statusOrder) {
    const boat = await fetchBoatCandidate(boatDocumentId, sourceLocale, status);
    if (boat) return boat;
  }

  return null;
}

async function fetchExperiencesByBoatId(boatId: number, locale: Locale): Promise<JsonObject[]> {
  const rows: JsonObject[] = [];
  const seen = new Set<string>();

  for (const status of ["draft", "published"] as const) {
    const res = await strapiGet(withQuery("/api/experiences", experienceQueryParams(boatId, locale, status)));
    const data = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];

    for (const item of data) {
      const experience = getAttributes(item);
      if (!experience) continue;
      const key = asString(experience.documentId) ?? `id:${String(experience.id ?? rows.length)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(experience);
    }
  }

  return rows;
}

async function findBoatRowsByDocumentId(boatDocumentId: string): Promise<JsonObject[]> {
  const rows: JsonObject[] = [];
  const seen = new Set<string>();

  for (const locale of ALL_LOCALES) {
    for (const status of ["draft", "published"] as const) {
      for (const row of await scanBoatRows(locale, status, boatDocumentId)) {
        const key = `${String(row.id ?? "")}:${asString(row.locale) ?? locale}:${asString(row.publishedAt) ?? status}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }
  }

  return rows;
}

async function findExperienceRowsByDocumentId(experienceDocumentId: string): Promise<JsonObject[]> {
  const rows: JsonObject[] = [];
  const seen = new Set<string>();

  for (const locale of ALL_LOCALES) {
    for (const status of ["draft", "published"] as const) {
      for (const row of await scanExperienceRows(locale, status, experienceDocumentId)) {
        const key = `${String(row.id ?? "")}:${asString(row.locale) ?? locale}:${asString(row.publishedAt) ?? status}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
    }
  }

  return rows;
}

function dedupeExperiences(experiences: JsonObject[]): JsonObject[] {
  const deduped: JsonObject[] = [];
  const seen = new Set<string>();

  for (const experience of experiences) {
    const key = asString(experience.documentId) ?? `id:${String(experience.id ?? deduped.length)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(experience);
  }

  return deduped;
}

async function fetchExperienceByDocumentId(
  experienceDocumentId: string,
  locale: Locale
): Promise<JsonObject | null> {
  for (const status of ["draft", "published"] as const) {
    const res = await strapiGet(
      withQuery("/api/experiences", experienceDocumentQueryParams(experienceDocumentId, locale, status))
    );
    const data = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];

    for (const item of data) {
      const experience = getAttributes(item);
      if (experience && experience.documentId === experienceDocumentId) return experience;
    }
  }

  for (const status of ["draft", "published"] as const) {
    for (const experience of await scanExperienceRows(locale, status, experienceDocumentId)) {
      return experience;
    }
  }

  return null;
}

async function scanExperienceRows(
  locale: Locale,
  status: "draft" | "published",
  experienceDocumentId?: string
): Promise<JsonObject[]> {
  const matches: JsonObject[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const res = await strapiGet(
      withQuery("/api/experiences", [
        `locale=${encodeURIComponent(locale)}`,
        `status=${status}`,
        "fields[0]=title",
        "fields[1]=slug",
        "fields[2]=short_description",
        "fields[3]=full_description",
        "fields[4]=included_services",
        "fields[5]=meeting_point",
        "fields[6]=duration_hours",
        "fields[7]=price",
        "fields[8]=currency",
        "fields[9]=max_guests",
        "fields[10]=sort_order",
        "fields[11]=is_active",
        "fields[12]=documentId",
        "fields[13]=locale",
        "fields[14]=publishedAt",
        "sort[0]=sort_order:asc",
        "sort[1]=createdAt:desc",
        "pagination[pageSize]=100",
        `pagination[page]=${page}`,
      ])
    );

    const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
    for (const item of rows) {
      const row = getAttributes(item);
      if (!row) continue;
      if (experienceDocumentId && row.documentId !== experienceDocumentId) continue;
      matches.push(row);
    }

    const pagination = isRecord(res.json) && isRecord(res.json.meta) && isRecord(res.json.meta.pagination)
      ? res.json.meta.pagination
      : null;
    const pageCount = pagination ? asNumber(pagination.pageCount) : null;
    if (pageCount !== null && page >= pageCount) break;
    if (!rows.length) break;
  }

  return matches;
}

function hasTranslatableExperienceText(experience: JsonObject): boolean {
  return [
    experience.title,
    experience.short_description,
    experience.full_description,
    experience.included_services,
    experience.meeting_point,
  ].some((value) => asString(value) !== null);
}

function addExperienceCandidates(
  candidates: Map<string, ExperienceSourceCandidate>,
  experiences: JsonObject[]
) {
  for (const experience of experiences) {
    const documentId = asString(experience.documentId);
    if (!documentId) continue;

    const current = candidates.get(documentId) ?? { documentId, linkedRows: [] };
    current.linkedRows.push(experience);
    candidates.set(documentId, current);
  }
}

function selectLinkedExperienceSource(candidate: ExperienceSourceCandidate, sourceLocale: Locale): JsonObject | null {
  const usableRows = candidate.linkedRows.filter(hasTranslatableExperienceText);
  if (!usableRows.length) return null;

  return usableRows.find((row) => row.locale === sourceLocale) ?? usableRows[0] ?? null;
}

async function discoverExperienceCandidates(boat: JsonObject): Promise<ExperienceSourceCandidate[]> {
  const candidates = new Map<string, ExperienceSourceCandidate>();

  const populated = Array.isArray(boat.experiences)
    ? boat.experiences.map(getAttributes).filter(Boolean) as JsonObject[]
    : [];
  addExperienceCandidates(candidates, populated);

  const boatId = asNumber(boat.id);
  const locale = asLocale(boat.locale) ?? DEFAULT_SOURCE_LOCALE;
  if (boatId !== null) {
    addExperienceCandidates(candidates, await fetchExperiencesByBoatId(boatId, locale));
  }

  const boatDocumentId = asString(boat.documentId);
  if (boatDocumentId) {
    for (const row of await findBoatRowsByDocumentId(boatDocumentId)) {
      const rowBoatId = asNumber(row.id);
      const rowLocale = asLocale(row.locale) ?? locale;
      if (rowBoatId === null) continue;
      addExperienceCandidates(candidates, await fetchExperiencesByBoatId(rowBoatId, rowLocale));
    }
  }

  return Array.from(candidates.values());
}

async function fetchExperiencesForBoat(boat: JsonObject): Promise<{ experiences: JsonObject[]; warnings: PreviewWarning[] }> {
  const locale = asLocale(boat.locale) ?? DEFAULT_SOURCE_LOCALE;
  const experiences: JsonObject[] = [];
  const warnings: PreviewWarning[] = [];

  for (const candidate of await discoverExperienceCandidates(boat)) {
    const experience = await fetchExperienceByDocumentId(candidate.documentId, locale);
    if (experience) {
      experiences.push(experience);
      continue;
    }

    const linkedSource = selectLinkedExperienceSource(candidate, locale);
    if (linkedSource) {
      experiences.push(linkedSource);
      warnings.push({
        code: "experience_source_locale_inferred_from_linked_row",
        sourceDocumentId: candidate.documentId,
        sourceLocale: locale,
        actualLocale: asString(linkedSource.locale),
      });
      continue;
    }

    warnings.push({
      code: "experience_source_locale_not_found",
      sourceDocumentId: candidate.documentId,
      sourceLocale: locale,
    });
  }

  return { experiences: dedupeExperiences(experiences), warnings };
}

function shapeExperience(experience: JsonObject) {
  return {
    id: asNumber(experience.id),
    documentId: asString(experience.documentId),
    locale: asString(experience.locale),
    publishedAt: asString(experience.publishedAt),
    title: asString(experience.title) ?? "",
    slug: asString(experience.slug) ?? "",
    fieldsForTranslation: {
      title: asString(experience.title) ?? "",
      short_description: asString(experience.short_description),
      full_description: asString(experience.full_description),
      included_services: asString(experience.included_services),
      meeting_point: asString(experience.meeting_point),
    },
    fieldsToPreserve: {
      duration_hours: asNumber(experience.duration_hours),
      price: asNumber(experience.price),
      currency: asString(experience.currency),
      max_guests: asNumber(experience.max_guests),
      sort_order: asNumber(experience.sort_order),
      is_active: asBoolean(experience.is_active),
    },
  };
}

function shapeBoat(boat: JsonObject) {
  return {
    id: asNumber(boat.id),
    documentId: asString(boat.documentId),
    locale: asString(boat.locale),
    publishedAt: asString(boat.publishedAt),
    title: asString(boat.title) ?? "",
    slug: asString(boat.slug) ?? "",
    description: asString(boat.description) ?? "",
    fieldsForTranslation: {
      title: asString(boat.title) ?? "",
      description: asString(boat.description) ?? "",
    },
    fieldsToPreserve: {
      year: asNumber(boat.year),
      price_per_hour: asNumber(boat.price_per_hour),
      price_per_day: asNumber(boat.price_per_day),
      price_per_week: asNumber(boat.price_per_week),
      currency: asString(boat.currency),
      owner_user_id: asNumber(boat.owner_user_id),
    },
  };
}

type ShapedBoat = ReturnType<typeof shapeBoat>;
type ShapedExperience = ReturnType<typeof shapeExperience>;
type SourcePayload = {
  ok: true;
  sourceLocale: Locale;
  targetLocales: Locale[];
  boat: ShapedBoat;
  experiences: ShapedExperience[];
  warnings: PreviewWarning[];
};

function rowState(row: JsonObject): "draft" | "published" {
  return asString(row.publishedAt) ? "published" : "draft";
}

function boatFieldStatuses(row: JsonObject | null) {
  return {
    title: fieldStatus(row ? asString(row.title) : null),
    description: fieldStatus(row ? asString(row.description) : null),
    slug: fieldStatus(row ? asString(row.slug) : null),
  };
}

function experienceFieldStatuses(row: JsonObject | null) {
  return {
    title: fieldStatus(row ? asString(row.title) : null),
    short_description: fieldStatus(row ? asString(row.short_description) : null),
    full_description: fieldStatus(row ? asString(row.full_description) : null),
    included_services: fieldStatus(row ? asString(row.included_services) : null),
    meeting_point: fieldStatus(row ? asString(row.meeting_point) : null),
    slug: fieldStatus(row ? asString(row.slug) : null),
  };
}

function primaryLocaleRow(rows: JsonObject[], locale: Locale): JsonObject | null {
  const localeRows = rows.filter((row) => asLocale(row.locale) === locale);
  return localeRows.find((row) => !asString(row.publishedAt)) ?? localeRows[0] ?? null;
}

function boatLocaleReview(row: JsonObject | null, locale: Locale, sourceDocumentId: string | null) {
  const fields = boatFieldStatuses(row);
  const hint = titleScriptHint(locale, row ? asString(row.title) : null);

  return {
    locale,
    label: localeDisplay(locale),
    exists: Boolean(row),
    readiness: readinessFromFields(Boolean(row), {
      title: fields.title,
      slug: fields.slug,
    }),
    state: row ? rowState(row) : null,
    documentId: row ? asString(row.documentId) : sourceDocumentId,
    title: row ? asString(row.title) : null,
    slug: row ? asString(row.slug) : null,
    fields,
    scriptHint: hint,
    slugCandidates: slugCandidates(row ? asString(row.title) : null, sourceDocumentId, locale),
  };
}

function experienceLocaleReview(row: JsonObject | null, locale: Locale, sourceDocumentId: string | null) {
  const fields = experienceFieldStatuses(row);
  const hint = titleScriptHint(locale, row ? asString(row.title) : null);

  return {
    locale,
    label: localeDisplay(locale),
    exists: Boolean(row),
    readiness: readinessFromFields(Boolean(row), {
      title: fields.title,
      slug: fields.slug,
    }),
    state: row ? rowState(row) : null,
    documentId: row ? asString(row.documentId) : sourceDocumentId,
    title: row ? asString(row.title) : null,
    slug: row ? asString(row.slug) : null,
    fields,
    scriptHint: hint,
    slugCandidates: slugCandidates(row ? asString(row.title) : null, sourceDocumentId, locale),
  };
}

async function buildSourcePackage(params: {
  boat: JsonObject;
  boatDocumentId: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  experiences: JsonObject[];
  warnings: PreviewWarning[];
}) {
  const boatRows = await findBoatRowsByDocumentId(params.boatDocumentId);
  const boatLocaleVersions = ALL_LOCALES.map((locale) => boatLocaleReview(
    primaryLocaleRow(boatRows, locale),
    locale,
    params.boatDocumentId
  ));
  const missingBoatLocales = boatLocaleVersions
    .filter((row) => !row.exists)
    .map((row) => row.locale);
  const sourceBoatFields = boatFieldStatuses(params.boat);
  const packageWarnings = [
    ...missingBoatLocales.map((locale) => `Missing boat locale: ${localeDisplay(locale)}`),
    ...boatLocaleVersions.flatMap((row) => row.scriptHint ? [row.scriptHint] : []),
    ...params.warnings.map((warning) => warning.code),
  ];

  const linkedExperiences = await Promise.all(params.experiences.map(async (experience) => {
    const documentId = asString(experience.documentId);
    const rows = documentId ? await findExperienceRowsByDocumentId(documentId) : [experience];
    const localeVersions = ALL_LOCALES.map((locale) => experienceLocaleReview(
      primaryLocaleRow(rows, locale),
      locale,
      documentId
    ));
    const missingLocales = localeVersions.filter((row) => !row.exists).map((row) => row.locale);
    const incompleteFields = localeVersions.flatMap((row) => {
      if (!row.exists) return [`${localeDisplay(row.locale).toUpperCase()} route locale missing`];
      return Object.entries(row.fields)
        .filter(([, status]) => status === "missing")
        .map(([field]) => `${localeDisplay(row.locale).toUpperCase()} route ${field} missing`);
    });

    packageWarnings.push(
      ...missingLocales.map((locale) => `Missing route locale ${localeDisplay(locale)} for ${documentId ?? "unknown route"}`),
      ...localeVersions.flatMap((row) => row.scriptHint ? [row.scriptHint] : [])
    );

    return {
      sourceDocumentId: documentId,
      sourceLocale: asLocale(experience.locale) ?? params.sourceLocale,
      sourceFields: experienceFieldStatuses(experience),
      localeVersions,
      missingLocales,
      incompleteFields,
    };
  }));

  return {
    readOnly: true,
    mode: "source-only",
    doesCallAi: false,
    doesSaveData: false,
    sourceBoatDocumentId: params.boatDocumentId,
    sourceLocale: params.sourceLocale,
    requestedTargetLocales: params.targetLocales,
    requiredLocales: ALL_LOCALES,
    existingBoatLocaleVersions: boatLocaleVersions,
    missingBoatLocales,
    boatReadiness: boatLocaleVersions.map(({ locale, label, exists, readiness, fields, scriptHint, slugCandidates }) => ({
      locale,
      label,
      exists,
      readiness,
      fields,
      scriptHint,
      slugCandidates,
    })),
    sourceBoatFields,
    linkedExperiences,
    linkedExperiencesCount: linkedExperiences.length,
    warnings: Array.from(new Set(packageWarnings)),
  };
}

function nullableStringSchema() {
  return { anyOf: [{ type: "string" }, { type: "null" }] };
}

function experienceTranslationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "short_description", "full_description", "included_services", "meeting_point"],
    properties: {
      title: { type: "string" },
      short_description: nullableStringSchema(),
      full_description: nullableStringSchema(),
      included_services: nullableStringSchema(),
      meeting_point: nullableStringSchema(),
    },
  };
}

function localeTranslationProperties(targetLocales: Locale[], schema: JsonObject): JsonObject {
  return Object.fromEntries(targetLocales.map((locale) => [locale, schema]));
}

function buildAiTranslationSchema(targetLocales: Locale[]) {
  const boatTranslationSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "description"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["boat", "experiences"],
    properties: {
      boat: {
        type: "object",
        additionalProperties: false,
        required: ["sourceDocumentId", "translations"],
        properties: {
          sourceDocumentId: nullableStringSchema(),
          translations: {
            type: "object",
            additionalProperties: false,
            required: targetLocales,
            properties: localeTranslationProperties(targetLocales, boatTranslationSchema),
          },
        },
      },
      experiences: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["sourceDocumentId", "translations"],
          properties: {
            sourceDocumentId: nullableStringSchema(),
            translations: {
              type: "object",
              additionalProperties: false,
              required: targetLocales,
              properties: localeTranslationProperties(targetLocales, experienceTranslationSchema()),
            },
          },
        },
      },
    },
  };
}

function buildAiTranslationPrompt(sourcePayload: SourcePayload): string {
  return [
    "Translate this yacht marketplace listing for admin review.",
    "",
    "Rules:",
    "- Translate only text fields.",
    "- Do not change prices, currency, duration, year, capacity, numeric ids, documentId, media, owner relation, route relation, or publish status.",
    "- Do not invent services, guarantees, documents, insurance, availability, safety claims, or extra route details.",
    "- Preserve null and empty source fields as null.",
    "- Do not invent missing included services, meeting point, or full description.",
    "- Keep boat names, marina names, city names, place names, brand names, and model names unchanged unless there is a clear generic descriptive part.",
    "- Preserve brand/model names like Tiara Yachts and place names like Sveti Stefan.",
    "- English should be natural marketplace and tourism English.",
    "- Montenegrin must be natural Montenegrin Latin for a tourism marketplace, not Serbian Cyrillic and not overly bookish.",
    "- For Montenegrin, prefer natural terms like \"kruzer\" or \"brod za krstarenje\" over awkward \"krstaš\" where appropriate.",
    "- For Montenegrin, prefer \"Instagram lokacije\" or \"mjesta idealna za fotografije\" over awkward literal phrasing if context allows.",
    "- The result is only a preview for admin review.",
    "",
    `Source locale: ${sourcePayload.sourceLocale}`,
    `Target locales: ${sourcePayload.targetLocales.join(", ")}`,
    "",
    "Source JSON:",
    JSON.stringify({
      boat: {
        documentId: sourcePayload.boat.documentId,
        fieldsForTranslation: sourcePayload.boat.fieldsForTranslation,
        fieldsToPreserve: sourcePayload.boat.fieldsToPreserve,
      },
      experiences: sourcePayload.experiences.map((experience) => ({
        documentId: experience.documentId,
        fieldsForTranslation: experience.fieldsForTranslation,
        fieldsToPreserve: experience.fieldsToPreserve,
      })),
    }),
  ].join("\n");
}

function extractOpenAiText(json: unknown): string | null {
  if (!isRecord(json)) return null;
  const outputText = asString(json.output_text);
  if (outputText) return outputText;

  if (!Array.isArray(json.output)) return null;
  for (const item of json.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content)) continue;
      const text = asString(content.text);
      if (text) return text;
    }
  }

  return null;
}

function parseAiTranslationPayload(json: unknown): JsonObject | null {
  const text = extractOpenAiText(json);
  if (!text) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validateLocaleStringFields(value: unknown, fields: string[]): value is JsonObject {
  if (!isRecord(value)) return false;
  for (const field of fields) {
    if (typeof value[field] !== "string") return false;
  }
  return true;
}

function validateExperienceTranslation(value: unknown): value is JsonObject {
  if (!isRecord(value)) return false;
  if (typeof value.title !== "string") return false;
  for (const field of ["short_description", "full_description", "included_services", "meeting_point"]) {
    if (value[field] !== null && typeof value[field] !== "string") return false;
  }
  return true;
}

function validateAiTranslationPayload(value: unknown, sourcePayload: SourcePayload): value is JsonObject {
  if (!isRecord(value) || !isRecord(value.boat) || !isRecord(value.boat.translations) || !Array.isArray(value.experiences)) return false;
  if (value.boat.sourceDocumentId !== sourcePayload.boat.documentId) return false;

  for (const locale of sourcePayload.targetLocales) {
    if (!validateLocaleStringFields(value.boat.translations[locale], ["title", "description"])) return false;
  }

  if (value.experiences.length !== sourcePayload.experiences.length) return false;

  for (let i = 0; i < sourcePayload.experiences.length; i += 1) {
    const item = value.experiences[i];
    if (!isRecord(item) || !isRecord(item.translations)) return false;
    const expectedDocumentId = sourcePayload.experiences[i]?.documentId ?? null;
    if (item.sourceDocumentId !== expectedDocumentId) return false;

    for (const locale of sourcePayload.targetLocales) {
      if (!validateExperienceTranslation(item.translations[locale])) return false;
    }
  }

  return true;
}

async function generateAiPreview(
  sourcePayload: SourcePayload,
  apiKey: string,
  model: string
): Promise<{ ok: true; aiPreview: JsonObject } | { ok: false; code: "openai_request_failed" | "ai_translation_invalid_response" }> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: [
        "You are a precise translator for a yacht marketplace in Montenegro.",
        "Return only valid JSON matching the provided schema.",
        "Never add facts or modify preserved values.",
      ].join(" "),
      input: buildAiTranslationPrompt(sourcePayload),
      text: {
        format: {
          type: "json_schema",
          name: "admin_translation_preview",
          strict: true,
          schema: buildAiTranslationSchema(sourcePayload.targetLocales),
        },
      },
    }),
  });

  if (!response.ok) return { ok: false, code: "openai_request_failed" };

  const json: unknown = await response.json().catch(() => null);
  const parsed = parseAiTranslationPayload(json);
  if (!validateAiTranslationPayload(parsed, sourcePayload)) {
    return { ok: false, code: "ai_translation_invalid_response" };
  }

  return {
    ok: true,
    aiPreview: {
      model,
      sourceLocale: sourcePayload.sourceLocale,
      targetLocales: sourcePayload.targetLocales,
      boat: parsed.boat,
      experiences: parsed.experiences,
    },
  };
}

export async function POST(req: NextRequest) {
  const configuredToken = getAdminTranslationToken();
  if (!configuredToken) {
    return NextResponse.json(
      { ok: false, code: "admin_translation_token_missing" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  if (req.headers.get("x-admin-token") !== configuredToken) {
    return NextResponse.json(
      { ok: false, code: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const boatDocumentId = isRecord(body) ? asString(body.boatDocumentId) : null;
  if (!boatDocumentId) {
    return NextResponse.json(
      { ok: false, code: "boat_document_id_required" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const sourceLocale = isRecord(body) ? asLocale(body.sourceLocale) ?? DEFAULT_SOURCE_LOCALE : DEFAULT_SOURCE_LOCALE;
  const requestedTargetLocales = isRecord(body) ? asLocaleArray(body.targetLocales) : null;
  const targetLocales = (requestedTargetLocales ?? targetLocalesForSource(sourceLocale))
    .filter((locale) => locale !== sourceLocale);
  if (!targetLocales.length) {
    return NextResponse.json(
      { ok: false, code: "target_locales_required" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }
  const generateAi = isRecord(body) && body.generateAi === true;

  try {
    const boat = await findSourceBoat(boatDocumentId, sourceLocale);
    if (!boat) {
      return NextResponse.json(
        { ok: false, code: "source_locale_not_found" },
        { status: 404, headers: { "cache-control": "no-store" } }
      );
    }

    const experienceResult = await fetchExperiencesForBoat(boat);
    const sourcePayload: SourcePayload = {
      ok: true,
      sourceLocale,
      targetLocales,
      boat: shapeBoat(boat),
      experiences: experienceResult.experiences.map(shapeExperience),
      warnings: experienceResult.warnings,
    };

    if (generateAi) {
      const openAiKey = getOpenAiKey();
      if (!openAiKey) {
        return NextResponse.json(
          { ok: false, code: "openai_api_key_missing" },
          { status: 503, headers: { "cache-control": "no-store" } }
        );
      }

      const aiResult = await generateAiPreview(sourcePayload, openAiKey, getOpenAiTranslationModel());
      if (!aiResult.ok) {
        return NextResponse.json(
          { ok: false, code: aiResult.code },
          { status: aiResult.code === "openai_request_failed" ? 502 : 502, headers: { "cache-control": "no-store" } }
        );
      }

      return NextResponse.json(
        { ...sourcePayload, aiPreview: aiResult.aiPreview },
        { headers: { "cache-control": "no-store" } }
      );
    }

    const sourcePackage = await buildSourcePackage({
      boat,
      boatDocumentId,
      sourceLocale,
      targetLocales,
      experiences: experienceResult.experiences,
      warnings: experienceResult.warnings,
    });

    return NextResponse.json(
      { ...sourcePayload, sourcePackage },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, code: "strapi_fetch_failed" },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
