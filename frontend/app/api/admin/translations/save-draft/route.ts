import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;
type Locale = "ru" | "en" | "sr-Latn-ME";
type PlannerAction = "create-draft-locale" | "update-existing-draft" | "blocked-overwrite-required";
type ExistingRow = {
  id: number | null;
  documentId: string | null;
  locale: string | null;
  publishedAt: string | null;
  title: string | null;
  slug: string | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  included_services?: string | null;
  meeting_point?: string | null;
};
type FieldPlan = {
  field: string;
  status: "would-write" | "would-skip" | "blocked-overwrite-required";
  existingValuePresent: boolean;
};
type BoatPlan = {
  documentId: string;
  locale: Locale;
  action: PlannerAction;
  draftExists: boolean;
  publishedExists: boolean;
  draftId: number | null;
  publishedId: number | null;
  fieldsToWrite: string[];
  fieldsSkipped: string[];
  fieldPlans: FieldPlan[];
  blocked: boolean;
  warnings: string[];
};
type ExperiencePlan = {
  documentId: string;
  locale: Locale;
  action: PlannerAction;
  draftExists: boolean;
  publishedExists: boolean;
  draftId: number | null;
  publishedId: number | null;
  fieldsToWrite: string[];
  fieldsSkipped: string[];
  fieldPlans: FieldPlan[];
  relationPlan: "connect-to-target-locale-boat-draft-later";
  draftSlugPlan: string | null;
  blocked: boolean;
  warnings: string[];
};

const ALL_LOCALES: Locale[] = ["ru", "en", "sr-Latn-ME"];
const BOAT_ALLOWED_FIELDS = ["title", "description"] as const;
const EXPERIENCE_ALLOWED_FIELDS = ["title", "short_description", "full_description", "included_services", "meeting_point"] as const;
const BOAT_SKIPPED_FIELDS = ["slug", "publishedAt", "owner_user_id", "media", "pricing"];
const EXPERIENCE_SKIPPED_FIELDS = ["publishedAt", "price", "currency", "duration_hours", "media"];

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

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asLocale(value: unknown): Locale | null {
  return value === "ru" || value === "en" || value === "sr-Latn-ME" ? value : null;
}

function asLocaleArray(value: unknown): Locale[] | null {
  if (!Array.isArray(value)) return null;
  const locales = value.map(asLocale).filter((item): item is Locale => item !== null);
  return locales.length ? Array.from(new Set(locales)) : null;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function valuesDiffer(existingValue: unknown, plannedValue: unknown): boolean {
  return normalizeText(existingValue) !== normalizeText(plannedValue);
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

function localeLabel(locale: Locale): string {
  return locale === "sr-Latn-ME" ? "me" : locale;
}

function draftSlug(title: string | null | undefined, documentId: string, locale: Locale): string {
  const shortDocumentId = documentId.slice(0, 8).toLowerCase();
  const core = slugifyLatin(title, `route-${shortDocumentId}-${localeLabel(locale)}`);
  return `${core}-${localeLabel(locale)}-${shortDocumentId}`
    .replaceAll("-en-en-", "-en-")
    .replaceAll("-me-me-", "-me-")
    .replaceAll("-ru-ru-", "-ru-");
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
    slug: asString(row.slug),
    description: asString(row.description),
    short_description: asString(row.short_description),
    full_description: asString(row.full_description),
    included_services: asString(row.included_services),
    meeting_point: asString(row.meeting_point),
  };
}

async function fetchBoatRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingRow | null> {
  const params = [
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    "fields[0]=title",
    "fields[1]=description",
    "fields[2]=slug",
    "fields[3]=documentId",
    "fields[4]=locale",
    "fields[5]=publishedAt",
  ];

  const documentRes = await strapiGet(withQuery(`/api/boats/${encodeURIComponent(documentId)}`, params));
  const documentRow = shapeExistingRow(getAttributes(isRecord(documentRes.json) ? documentRes.json.data : null));
  if (documentRes.ok && documentRow?.documentId === documentId) return documentRow;

  const collectionRes = await strapiGet(withQuery("/api/boats", [
    `filters[documentId][$eq]=${encodeURIComponent(documentId)}`,
    ...params,
    "pagination[pageSize]=5",
  ]));
  const rows = isRecord(collectionRes.json) && Array.isArray(collectionRes.json.data) ? collectionRes.json.data : [];
  for (const item of rows) {
    const row = shapeExistingRow(getAttributes(item));
    if (row?.documentId === documentId) return row;
  }

  return null;
}

async function fetchExperienceRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingRow | null> {
  const params = [
    `filters[documentId][$eq]=${encodeURIComponent(documentId)}`,
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=short_description",
    "fields[3]=full_description",
    "fields[4]=included_services",
    "fields[5]=meeting_point",
    "fields[6]=documentId",
    "fields[7]=locale",
    "fields[8]=publishedAt",
    "populate[boat][fields][0]=id",
    "populate[boat][fields][1]=documentId",
    "populate[boat][fields][2]=locale",
    "pagination[pageSize]=5",
  ];

  const res = await strapiGet(withQuery("/api/experiences", params));
  const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
  for (const item of rows) {
    const row = shapeExistingRow(getAttributes(item));
    if (row?.documentId === documentId) return row;
  }

  return null;
}

async function experienceSlugExists(slug: string, locale: Locale, sourceDocumentId: string): Promise<boolean> {
  const res = await strapiGet(withQuery("/api/experiences", [
    `filters[slug][$eq]=${encodeURIComponent(slug)}`,
    `locale=${encodeURIComponent(locale)}`,
    "status=draft",
    "fields[0]=documentId",
    "fields[1]=slug",
    "pagination[pageSize]=5",
  ]));
  const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
  return rows.some((item) => {
    const row = getAttributes(item);
    return row && asString(row.slug) === slug && asString(row.documentId) !== sourceDocumentId;
  });
}

function planFields(
  allowedFields: readonly string[],
  existingDraft: ExistingRow | null,
  translation: JsonObject,
  overwrite: boolean
): { fieldsToWrite: string[]; fieldPlans: FieldPlan[]; blocked: boolean } {
  const fieldsToWrite: string[] = [];
  const fieldPlans: FieldPlan[] = [];
  let blocked = false;

  for (const field of allowedFields) {
    const plannedValue = translation[field];
    if (plannedValue === undefined) continue;
    const existingValue = existingDraft ? existingDraft[field as keyof ExistingRow] : null;
    const existingValuePresent = normalizeText(existingValue).length > 0;

    if (existingDraft && existingValuePresent && valuesDiffer(existingValue, plannedValue) && !overwrite) {
      blocked = true;
      fieldPlans.push({ field, status: "blocked-overwrite-required", existingValuePresent });
      continue;
    }

    if (!existingDraft || !existingValuePresent || valuesDiffer(existingValue, plannedValue)) {
      fieldsToWrite.push(field);
      fieldPlans.push({ field, status: "would-write", existingValuePresent });
    } else {
      fieldPlans.push({ field, status: "would-skip", existingValuePresent });
    }
  }

  return { fieldsToWrite, fieldPlans, blocked };
}

async function planBoatLocale(params: {
  documentId: string;
  locale: Locale;
  translation: JsonObject;
  overwrite: boolean;
}): Promise<BoatPlan> {
  const [draft, published] = await Promise.all([
    fetchBoatRow(params.documentId, params.locale, "draft"),
    fetchBoatRow(params.documentId, params.locale, "published"),
  ]);
  const fieldPlan = planFields(BOAT_ALLOWED_FIELDS, draft, params.translation, params.overwrite);
  const warnings: string[] = [];
  if (published) warnings.push("Published version exists and will not be changed.");

  return {
    documentId: params.documentId,
    locale: params.locale,
    action: fieldPlan.blocked ? "blocked-overwrite-required" : draft ? "update-existing-draft" : "create-draft-locale",
    draftExists: Boolean(draft),
    publishedExists: Boolean(published),
    draftId: draft?.id ?? null,
    publishedId: published?.id ?? null,
    fieldsToWrite: fieldPlan.fieldsToWrite,
    fieldsSkipped: BOAT_SKIPPED_FIELDS,
    fieldPlans: fieldPlan.fieldPlans,
    blocked: fieldPlan.blocked,
    warnings,
  };
}

async function planExperienceLocale(params: {
  documentId: string;
  locale: Locale;
  translation: JsonObject;
  overwrite: boolean;
  targetBoatPlan: BoatPlan | undefined;
}): Promise<ExperiencePlan> {
  const [draft, published] = await Promise.all([
    fetchExperienceRow(params.documentId, params.locale, "draft"),
    fetchExperienceRow(params.documentId, params.locale, "published"),
  ]);
  const fieldPlan = planFields(EXPERIENCE_ALLOWED_FIELDS, draft, params.translation, params.overwrite);
  const warnings: string[] = [];
  let slugPlan: string | null = null;

  if (published) warnings.push("Published version exists and will not be changed.");
  if (params.targetBoatPlan && !params.targetBoatPlan.draftExists) {
    warnings.push("Target boat draft locale is missing; route relation depends on creating that boat draft first.");
  }

  const existingSlugPresent = Boolean(draft?.slug);
  if (!existingSlugPresent) {
    slugPlan = draftSlug(asString(params.translation.title), params.documentId, params.locale);
    fieldPlan.fieldsToWrite.push("slug");
    const collision = await experienceSlugExists(slugPlan, params.locale, params.documentId);
    if (collision) warnings.push(`Draft slug collision must be resolved before write: ${slugPlan}`);
  }

  return {
    documentId: params.documentId,
    locale: params.locale,
    action: fieldPlan.blocked ? "blocked-overwrite-required" : draft ? "update-existing-draft" : "create-draft-locale",
    draftExists: Boolean(draft),
    publishedExists: Boolean(published),
    draftId: draft?.id ?? null,
    publishedId: published?.id ?? null,
    fieldsToWrite: Array.from(new Set(fieldPlan.fieldsToWrite)),
    fieldsSkipped: EXPERIENCE_SKIPPED_FIELDS,
    fieldPlans: fieldPlan.fieldPlans,
    relationPlan: "connect-to-target-locale-boat-draft-later",
    draftSlugPlan: slugPlan,
    blocked: fieldPlan.blocked,
    warnings,
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
  const overwrite = body.overwrite === true;
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

  try {
    const boatPlans = await Promise.all(safeTargetLocales.map((locale) => {
      const translation = aiBoatTranslations[locale];
      return planBoatLocale({
        documentId: boatDocumentId,
        locale,
        translation: isRecord(translation) ? translation : {},
        overwrite,
      });
    }));
    const boatPlanByLocale = new Map(boatPlans.map((plan) => [plan.locale, plan]));

    const experiencePlans: ExperiencePlan[] = [];
    for (const item of aiExperiences) {
      if (!isRecord(item)) continue;
      const experienceDocumentId = asString(item.sourceDocumentId);
      const translations = isRecord(item.translations) ? item.translations : null;
      if (!experienceDocumentId || !translations) continue;

      for (const locale of safeTargetLocales) {
        const translation = translations[locale];
        experiencePlans.push(await planExperienceLocale({
          documentId: experienceDocumentId,
          locale,
          translation: isRecord(translation) ? translation : {},
          overwrite,
          targetBoatPlan: boatPlanByLocale.get(locale),
        }));
      }
    }

    const blockers = [
      ...boatPlans.filter((plan) => plan.blocked).map((plan) => `Boat ${localeLabel(plan.locale)} requires overwrite approval.`),
      ...experiencePlans.filter((plan) => plan.blocked).map((plan) => `Route ${plan.documentId} ${localeLabel(plan.locale)} requires overwrite approval.`),
    ];
    const warnings = [
      ...boatPlans.flatMap((plan) => plan.warnings.map((warning) => `Boat ${localeLabel(plan.locale)}: ${warning}`)),
      ...experiencePlans.flatMap((plan) => plan.warnings.map((warning) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${warning}`)),
    ];

    return NextResponse.json(
      {
        ok: true,
        mode: "dry-run",
        doesWrite: false,
        boatDocumentId,
        sourceLocale,
        targetLocales: safeTargetLocales,
        boat: boatPlans,
        experiences: experiencePlans,
        blockers,
        warnings,
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
