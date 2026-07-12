import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;
type Locale = "ru" | "en" | "sr-Latn-ME";
type ContentType = "boat" | "experience";
type Operation =
  | "UPDATE_EXISTING_DRAFT"
  | "CREATE_MISSING_LOCALIZATION"
  | "NO_CHANGES"
  | "BLOCKED_ALREADY_PUBLISHED"
  | "BLOCKED_INVALID_DOCUMENT"
  | "BLOCKED_UNSUPPORTED_LOCALE"
  | "BLOCKED_DUPLICATE_RISK"
  | "BLOCKED_FORBIDDEN_FIELDS";

type ExistingRow = {
  id: number | null;
  documentId: string | null;
  locale: string | null;
  publishedAt: string | null;
  title?: string | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  included_services?: string | null;
  meeting_point?: string | null;
};

type DraftPlan = {
  contentType: ContentType;
  documentId: string;
  locale: Locale;
  operation: Operation;
  action: Operation;
  draftExists: boolean;
  publishedExists: boolean;
  draftId: number | null;
  publishedId: number | null;
  fieldsToWrite: string[];
  fieldsSkipped: string[];
  fieldPlans: Array<{ field: string; status: "would-write" | "would-skip" | "blocked-forbidden"; existingValuePresent: boolean }>;
  blocked: boolean;
  warnings: string[];
  sanitizedData: JsonObject;
  doesWrite: boolean;
  doesPublish: false;
};

const ALL_LOCALES: Locale[] = ["en", "ru", "sr-Latn-ME"];
const BOAT_ALLOWED_FIELDS = ["title", "description"] as const;
const EXPERIENCE_ALLOWED_FIELDS = ["title", "short_description", "full_description", "included_services", "meeting_point"] as const;
const BOAT_SKIPPED_FIELDS = ["slug", "publishedAt", "owner", "media", "pricing", "marina", "brand", "extras", "purposes", "booking fields"];
const EXPERIENCE_SKIPPED_FIELDS = ["slug", "publishedAt", "price", "currency", "duration_hours", "media", "boat"];

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

function getAdminTranslationInternalToken(): string {
  return (process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN || "").trim();
}

function isWriteEnabled(): boolean {
  return process.env.ADMIN_TRANSLATION_WRITE_ENABLED === "true";
}

function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);
  return request.length === configured.length && timingSafeEqual(request, configured);
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asLocale(value: unknown): Locale | null {
  return value === "en" || value === "ru" || value === "sr-Latn-ME" ? value : null;
}

function asLocaleArray(value: unknown): Locale[] | null {
  if (!Array.isArray(value)) return null;
  const locales = value.map(asLocale).filter((item): item is Locale => item !== null);
  return locales.length ? Array.from(new Set(locales)) : null;
}

function meaningfulText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  return trimmed;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function valuesDiffer(existingValue: unknown, plannedValue: unknown): boolean {
  return normalizeText(existingValue) !== normalizeText(plannedValue);
}

function getAttributes(item: unknown): JsonObject | null {
  if (!isRecord(item)) return null;
  const attrs = isRecord(item.attributes) ? item.attributes : {};
  return { ...item, ...attrs };
}

function withQuery(path: string, params: string[]): string {
  return `${path}?${params.join("&")}`;
}

async function strapiGet(path: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const token = getServerToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getStrapiBase()}${path}`, {
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

async function strapiPost(path: string, payload: JsonObject): Promise<{ ok: boolean; status: number; json: unknown }> {
  const token = getAdminTranslationInternalToken();
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-translation-token": token,
    },
    body: JSON.stringify(payload),
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

function shapeExistingRow(row: JsonObject | null): ExistingRow | null {
  if (!row) return null;
  return {
    id: asNumber(row.id),
    documentId: asString(row.documentId),
    locale: asString(row.locale),
    publishedAt: asString(row.publishedAt),
    title: asString(row.title),
    description: asString(row.description),
    short_description: asString(row.short_description),
    full_description: asString(row.full_description),
    included_services: asString(row.included_services),
    meeting_point: asString(row.meeting_point),
  };
}

async function fetchRows(contentType: ContentType, documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingRow[]> {
  const path = contentType === "boat" ? "/api/boats" : "/api/experiences";
  const fields = contentType === "boat"
    ? ["id", "documentId", "locale", "publishedAt", "title", "description"]
    : ["id", "documentId", "locale", "publishedAt", "title", "short_description", "full_description", "included_services", "meeting_point"];
  const params = [
    `filters[documentId][$eq]=${encodeURIComponent(documentId)}`,
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    "pagination[pageSize]=10",
    ...fields.map((field, index) => `fields[${index}]=${field}`),
  ];
  const res = await strapiGet(withQuery(path, params));
  const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
  return rows
    .map((item) => shapeExistingRow(getAttributes(item)))
    .filter((row): row is ExistingRow => row !== null && row.documentId === documentId && row.locale === locale);
}

async function sourceExists(contentType: ContentType, documentId: string, locale: Locale): Promise<boolean> {
  const [draftRows, publishedRows] = await Promise.all([
    fetchRows(contentType, documentId, locale, "draft"),
    fetchRows(contentType, documentId, locale, "published"),
  ]);
  return draftRows.length > 0 || publishedRows.length > 0;
}

function blockedPlan(params: {
  contentType: ContentType;
  documentId: string;
  targetLocale: Locale;
  operation: Operation;
  draftRows: ExistingRow[];
  publishedRows: ExistingRow[];
  warnings: string[];
  fieldPlans?: DraftPlan["fieldPlans"];
}): DraftPlan {
  return {
    contentType: params.contentType,
    documentId: params.documentId,
    locale: params.targetLocale,
    operation: params.operation,
    action: params.operation,
    draftExists: params.draftRows.length > 0,
    publishedExists: params.publishedRows.length > 0,
    draftId: params.draftRows.length === 1 ? params.draftRows[0].id : null,
    publishedId: params.publishedRows.length === 1 ? params.publishedRows[0].id : null,
    fieldsToWrite: [],
    fieldsSkipped: params.contentType === "boat" ? BOAT_SKIPPED_FIELDS : EXPERIENCE_SKIPPED_FIELDS,
    fieldPlans: params.fieldPlans ?? [],
    blocked: true,
    warnings: params.warnings,
    sanitizedData: {},
    doesWrite: false,
    doesPublish: false,
  };
}

function planFields(params: {
  contentType: ContentType;
  documentId: string;
  sourceLocale: Locale;
  targetLocale: Locale;
  sourceExists: boolean;
  draftRows: ExistingRow[];
  publishedRows: ExistingRow[];
  translation: JsonObject;
}): DraftPlan {
  const allowed = params.contentType === "boat" ? BOAT_ALLOWED_FIELDS : EXPERIENCE_ALLOWED_FIELDS;
  const skipped = params.contentType === "boat" ? BOAT_SKIPPED_FIELDS : EXPERIENCE_SKIPPED_FIELDS;
  const allowedSet = new Set<string>(allowed);
  const draft = params.draftRows.length === 1 ? params.draftRows[0] : null;
  const forbiddenFields = Object.keys(params.translation).filter((field) => !allowedSet.has(field));

  if (params.sourceLocale === params.targetLocale || !ALL_LOCALES.includes(params.sourceLocale) || !ALL_LOCALES.includes(params.targetLocale)) {
    return blockedPlan({ ...params, operation: "BLOCKED_UNSUPPORTED_LOCALE", warnings: ["Source and target locale must be supported and different."] });
  }
  if (!params.sourceExists) {
    return blockedPlan({ ...params, operation: "BLOCKED_INVALID_DOCUMENT", warnings: ["Source document localization was not found."] });
  }
  if (params.draftRows.length > 1 || params.publishedRows.length > 1) {
    return blockedPlan({ ...params, operation: "BLOCKED_DUPLICATE_RISK", warnings: ["More than one target localization row was found."] });
  }
  if (params.publishedRows.length) {
    return blockedPlan({ ...params, operation: "BLOCKED_ALREADY_PUBLISHED", warnings: ["Target locale is already published and will not be changed."] });
  }
  if (forbiddenFields.length) {
    return blockedPlan({
      ...params,
      operation: "BLOCKED_FORBIDDEN_FIELDS",
      warnings: [`Forbidden fields in translation payload: ${forbiddenFields.sort().join(", ")}`],
      fieldPlans: forbiddenFields.sort().map((field) => ({ field, status: "blocked-forbidden", existingValuePresent: false })),
    });
  }
  if (!draft && !meaningfulText(params.translation.title)) {
    return blockedPlan({ ...params, operation: "BLOCKED_INVALID_DOCUMENT", warnings: ["Title is required to create a missing draft localization."] });
  }

  const fieldsToWrite: string[] = [];
  const fieldPlans: DraftPlan["fieldPlans"] = [];
  const sanitizedData: JsonObject = {};
  for (const field of allowed) {
    const value = meaningfulText(params.translation[field]);
    if (value === null) continue;
    const existingValue = draft ? draft[field as keyof ExistingRow] : null;
    const existingValuePresent = normalizeText(existingValue).length > 0;
    if (!draft || valuesDiffer(existingValue, value)) {
      fieldsToWrite.push(field);
      sanitizedData[field] = value;
      fieldPlans.push({ field, status: "would-write", existingValuePresent });
    } else {
      fieldPlans.push({ field, status: "would-skip", existingValuePresent });
    }
  }

  const operation: Operation = fieldsToWrite.length
    ? draft ? "UPDATE_EXISTING_DRAFT" : "CREATE_MISSING_LOCALIZATION"
    : "NO_CHANGES";

  return {
    contentType: params.contentType,
    documentId: params.documentId,
    locale: params.targetLocale,
    operation,
    action: operation,
    draftExists: Boolean(draft),
    publishedExists: false,
    draftId: draft?.id ?? null,
    publishedId: null,
    fieldsToWrite,
    fieldsSkipped: skipped,
    fieldPlans,
    blocked: false,
    warnings: operation === "NO_CHANGES" ? ["No draft field changes were detected."] : [],
    sanitizedData,
    doesWrite: operation === "UPDATE_EXISTING_DRAFT" || operation === "CREATE_MISSING_LOCALIZATION",
    doesPublish: false,
  };
}

async function planLocalization(contentType: ContentType, documentId: string, sourceLocale: Locale, targetLocale: Locale, translation: JsonObject): Promise<DraftPlan> {
  const [draftRows, publishedRows, hasSource] = await Promise.all([
    fetchRows(contentType, documentId, targetLocale, "draft"),
    fetchRows(contentType, documentId, targetLocale, "published"),
    sourceExists(contentType, documentId, sourceLocale),
  ]);
  return planFields({ contentType, documentId, sourceLocale, targetLocale, sourceExists: hasSource, draftRows, publishedRows, translation });
}

function pickTranslation(source: unknown, locale: Locale): JsonObject {
  return isRecord(source) && isRecord(source[locale]) ? source[locale] as JsonObject : {};
}

function localeLabel(locale: Locale): string {
  return locale === "sr-Latn-ME" ? "me" : locale;
}

function aggregateBlockers(boatPlans: DraftPlan[], experiencePlans: DraftPlan[]): string[] {
  return [
    ...boatPlans.filter((plan) => plan.blocked).map((plan) => `Boat ${localeLabel(plan.locale)}: ${plan.operation}`),
    ...experiencePlans.filter((plan) => plan.blocked).map((plan) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${plan.operation}`),
  ];
}

function aggregateWarnings(boatPlans: DraftPlan[], experiencePlans: DraftPlan[]): string[] {
  return [
    ...boatPlans.flatMap((plan) => plan.warnings.map((warning) => `Boat ${localeLabel(plan.locale)}: ${warning}`)),
    ...experiencePlans.flatMap((plan) => plan.warnings.map((warning) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${warning}`)),
  ];
}

export async function POST(req: NextRequest) {
  const configuredToken = getAdminTranslationToken();
  if (!configuredToken) {
    return NextResponse.json(
      { ok: false, code: "admin_translation_token_missing" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  if (!tokensMatch(req.headers.get("x-admin-token") ?? "", configuredToken)) {
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

  if (!isRecord(body) || (body.dryRun !== true && body.dryRun !== false)) {
    return NextResponse.json(
      { ok: false, code: "invalid_save_mode" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  if (body.dryRun === false) {
    if (body.confirmSaveDraft !== true) {
      return NextResponse.json(
        { ok: false, code: "confirm_save_draft_required" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    if (body.overwrite === true) {
      return NextResponse.json(
        { ok: false, code: "overwrite_not_enabled" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    if (!isWriteEnabled()) {
      return NextResponse.json(
        { ok: false, code: "write_not_enabled" },
        { status: 403, headers: { "cache-control": "no-store" } }
      );
    }

    if (!getAdminTranslationInternalToken()) {
      return NextResponse.json(
        { ok: false, code: "admin_translation_internal_token_missing" },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }

    try {
      const result = await strapiPost("/api/admin-translations/save-draft", {
        ...body,
        dryRun: false,
        confirmSaveDraft: true,
        overwrite: false,
      });

      return NextResponse.json(
        isRecord(result.json) ? result.json : { ok: false, code: "strapi_save_draft_failed" },
        { status: result.status, headers: { "cache-control": "no-store" } }
      );
    } catch {
      return NextResponse.json(
        { ok: false, code: "strapi_save_draft_failed" },
        { status: 502, headers: { "cache-control": "no-store" } }
      );
    }
  }

  const boatDocumentId = asString(body.boatDocumentId);
  const sourceLocale = asLocale(body.sourceLocale);
  const targetLocales = asLocaleArray(body.targetLocales);
  const aiPreview = isRecord(body.aiPreview) ? body.aiPreview : null;
  const aiBoat = aiPreview && isRecord(aiPreview.boat) ? aiPreview.boat : null;
  const aiBoatTranslations = aiBoat && isRecord(aiBoat.translations) ? aiBoat.translations : null;
  const aiExperiences = aiPreview && Array.isArray(aiPreview.experiences) ? aiPreview.experiences : [];

  if (!boatDocumentId || !sourceLocale || !targetLocales?.length || !aiBoatTranslations) {
    return NextResponse.json(
      { ok: false, code: "invalid_dry_run_payload" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const safeTargetLocales = targetLocales.filter((locale) => ALL_LOCALES.includes(locale) && locale !== sourceLocale);
  if (!safeTargetLocales.length) {
    return NextResponse.json(
      { ok: false, code: "target_locales_required" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const boatPlans = await Promise.all(safeTargetLocales.map((locale) => (
      planLocalization("boat", boatDocumentId, sourceLocale, locale, pickTranslation(aiBoatTranslations, locale))
    )));

    const experiencePlans: DraftPlan[] = [];
    for (const item of aiExperiences) {
      if (!isRecord(item)) continue;
      const experienceDocumentId = asString(item.sourceDocumentId);
      const translations = isRecord(item.translations) ? item.translations : null;
      if (!experienceDocumentId || !translations) continue;

      for (const locale of safeTargetLocales) {
        experiencePlans.push(await planLocalization(
          "experience",
          experienceDocumentId,
          sourceLocale,
          locale,
          pickTranslation(translations, locale)
        ));
      }
    }

    return NextResponse.json(
      {
        ok: true,
        mode: "dry-run",
        doesWrite: false,
        doesPublish: false,
        boatDocumentId,
        sourceLocale,
        targetLocales: safeTargetLocales,
        boat: boatPlans,
        experiences: experiencePlans,
        blockers: aggregateBlockers(boatPlans, experiencePlans),
        warnings: aggregateWarnings(boatPlans, experiencePlans),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, code: "dry_run_planner_failed" },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
