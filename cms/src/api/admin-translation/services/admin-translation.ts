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
  boatDocumentId?: string | null;
  boatLocale?: string | null;
};
type FieldPlan = {
  field: string;
  status: "would-write" | "would-skip" | "blocked-overwrite-required";
  existingValuePresent: boolean;
};
type DraftPlan = {
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
  draftSlugPlan?: string | null;
  relationPlan?: "connect-to-target-locale-boat-draft-later" | "relation-already-correct" | "target-boat-draft-missing";
};
type SaveDraftFailureReason =
  | "boat_create_failed"
  | "boat_update_failed"
  | "experience_create_failed"
  | "experience_update_failed"
  | "missing_locale_create_not_supported"
  | "unknown";

const ALL_LOCALES: Locale[] = ["ru", "en", "sr-Latn-ME"];
const BOAT_UID = "api::boat.boat";
const EXPERIENCE_UID = "api::experience.experience";
const BOAT_ALLOWED_FIELDS = ["title", "description"] as const;
const EXPERIENCE_ALLOWED_FIELDS = ["title", "short_description", "full_description", "included_services", "meeting_point"] as const;
const BOAT_SKIPPED_FIELDS = ["publishedAt", "owner_user_id", "owner contacts", "contacts_visible", "verified_listing", "featured_listing", "reviewed_at", "prices", "currency", "capacity", "year", "engine", "media", "marina", "brand", "extras", "purposes"];
const EXPERIENCE_SKIPPED_FIELDS = ["publishedAt", "price", "currency", "duration_hours", "max_guests", "sort_order", "is_active", "cover", "gallery", "existing published rows"];

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

function meaningfulText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  return trimmed;
}

function valuesDiffer(existingValue: unknown, plannedValue: unknown): boolean {
  return normalizeText(existingValue) !== normalizeText(plannedValue);
}

function localeLabel(locale: Locale): string {
  return locale === "sr-Latn-ME" ? "me" : locale;
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

function draftSlug(title: string | null | undefined, documentId: string, locale: Locale): string {
  const shortDocumentId = documentId.slice(0, 8).toLowerCase();
  const core = slugifyLatin(title, `route-${shortDocumentId}-${localeLabel(locale)}`);
  return `${core}-${localeLabel(locale)}-${shortDocumentId}`
    .replace(/-en-en-/g, "-en-")
    .replace(/-me-me-/g, "-me-")
    .replace(/-ru-ru-/g, "-ru-");
}

function boatDraftSlug(title: string | null | undefined, documentId: string, locale: Locale): string {
  const shortDocumentId = documentId.slice(0, 8).toLowerCase();
  const core = slugifyLatin(title, `boat-${shortDocumentId}-${localeLabel(locale)}`);
  return `${core}-${localeLabel(locale)}-${shortDocumentId}`
    .replace(/-en-en-/g, "-en-")
    .replace(/-me-me-/g, "-me-")
    .replace(/-ru-ru-/g, "-ru-");
}

function relationAttributes(value: unknown): JsonObject | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (!isRecord(source)) return null;
  const data = isRecord(source.data) ? source.data : null;
  return data ?? source;
}

function shapeExistingRow(row: JsonObject | null): ExistingRow | null {
  if (!row) return null;
  const boat = relationAttributes(row.boat);
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
    boatDocumentId: asString(boat?.documentId),
    boatLocale: asString(boat?.locale),
  };
}

async function findBoatRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingRow | null> {
  const row = await strapi.documents(BOAT_UID as never).findOne({
    documentId,
    locale,
    status,
    fields: ["id", "documentId", "locale", "publishedAt", "title", "slug", "description"],
  } as never);

  return shapeExistingRow(isRecord(row) ? row : null);
}

async function findExperienceRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingRow | null> {
  const row = await strapi.documents(EXPERIENCE_UID as never).findOne({
    documentId,
    locale,
    status,
    fields: ["id", "documentId", "locale", "publishedAt", "title", "slug", "short_description", "full_description", "included_services", "meeting_point"],
    populate: { boat: { fields: ["documentId", "locale"] } },
  } as never);

  return shapeExistingRow(isRecord(row) ? row : null);
}

async function experienceSlugExists(slug: string, locale: Locale, sourceDocumentId: string): Promise<boolean> {
  const rows = await strapi.documents(EXPERIENCE_UID as never).findMany({
    locale,
    status: "draft",
    filters: { slug: { $eq: slug } },
    fields: ["documentId", "slug"],
    pagination: { pageSize: 5 },
  } as never);

  return (Array.isArray(rows) ? rows : []).some((item) => {
    const row: JsonObject = isRecord(item) ? item : {};
    return asString(row.slug) === slug && asString(row.documentId) !== sourceDocumentId;
  });
}

async function findSourceBoatSlug(documentId: string, sourceLocale: Locale): Promise<string | null> {
  const draft = await findBoatRow(documentId, sourceLocale, "draft");
  if (draft?.slug) return draft.slug;

  const published = await findBoatRow(documentId, sourceLocale, "published");
  return published?.slug ?? null;
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
    if (!meaningfulText(plannedValue)) continue;
    const existingValue = existingDraft ? existingDraft[field as keyof ExistingRow] : null;
    const existingValuePresent = normalizeText(existingValue).length > 0;

    if (existingDraft && existingValuePresent && !overwrite) {
      fieldPlans.push({ field, status: "would-skip", existingValuePresent });
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

function targetBoatDraftAvailable(plan: DraftPlan | undefined): boolean {
  return Boolean(plan && !plan.blocked && (
    plan.draftExists ||
    plan.fieldsToWrite.length > 0 ||
    plan.draftSlugPlan
  ));
}

function planRouteRelation(
  draft: ExistingRow | null,
  targetBoatPlan: DraftPlan | undefined,
  locale: Locale
): DraftPlan["relationPlan"] {
  if (
    targetBoatPlan &&
    draft?.boatDocumentId === targetBoatPlan.documentId &&
    draft?.boatLocale === locale
  ) {
    return "relation-already-correct";
  }

  return targetBoatDraftAvailable(targetBoatPlan)
    ? "connect-to-target-locale-boat-draft-later"
    : "target-boat-draft-missing";
}

function pickAllowedData(translation: JsonObject, fieldsToWrite: string[]): JsonObject {
  const data: JsonObject = {};
  for (const field of fieldsToWrite) {
    const value = translation[field];
    const text = meaningfulText(value);
    if (text !== null) data[field] = text;
  }
  return data;
}

function safeFailureMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  return (message || fallback)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .slice(0, 180);
}

function failureResponse(params: {
  reason: SaveDraftFailureReason;
  message: string;
  boatDocumentId: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  boatPlans: DraftPlan[];
  experiencePlans: DraftPlan[];
  warnings: string[];
  written: string[];
  skipped: string[];
}) {
  return {
    status: params.reason === "missing_locale_create_not_supported" ? 409 : 500,
    body: {
      ok: false,
      code: "save_draft_failed",
      reason: params.reason,
      message: params.message,
      mode: "save-draft",
      doesWrite: params.written.length > 0,
      doesPublish: false,
      boatDocumentId: params.boatDocumentId,
      sourceLocale: params.sourceLocale,
      targetLocales: params.targetLocales,
      boat: params.boatPlans,
      experiences: params.experiencePlans,
      blockers: [],
      warnings: params.warnings,
      written: params.written,
      skipped: params.skipped,
    },
  };
}

async function writeBoatDraft(plan: DraftPlan, data: JsonObject): Promise<ExistingRow | null> {
  if (!Object.keys(data).length) return findBoatRow(plan.documentId, plan.locale, "draft");

  await strapi.documents(BOAT_UID as never).update({
    documentId: plan.documentId,
    locale: plan.locale,
    data,
  } as never);

  return findBoatRow(plan.documentId, plan.locale, "draft");
}

async function writeExperienceDraft(plan: DraftPlan, data: JsonObject): Promise<ExistingRow | null> {
  await strapi.documents(EXPERIENCE_UID as never).update({
    documentId: plan.documentId,
    locale: plan.locale,
    data,
  } as never);

  return findExperienceRow(plan.documentId, plan.locale, "draft");
}

async function planBoatLocale(documentId: string, locale: Locale, sourceLocale: Locale, translation: JsonObject, overwrite: boolean): Promise<DraftPlan> {
  const [draft, published] = await Promise.all([
    findBoatRow(documentId, locale, "draft"),
    findBoatRow(documentId, locale, "published"),
  ]);
  const fieldPlan = planFields(BOAT_ALLOWED_FIELDS, draft, translation, overwrite);
  const warnings: string[] = [];
  let slugPlan: string | null = null;
  if (published) warnings.push("Published version exists and will not be changed.");
  if (!draft && !meaningfulText(translation.title)) {
    fieldPlan.blocked = true;
    warnings.push("Missing title for new boat draft locale.");
  }
  if (!draft?.slug) {
    slugPlan = await findSourceBoatSlug(documentId, sourceLocale)
      ?? boatDraftSlug(meaningfulText(translation.title), documentId, locale);
    fieldPlan.fieldsToWrite.push("slug");
    fieldPlan.fieldPlans.push({ field: "slug", status: "would-write", existingValuePresent: false });
  }

  return {
    documentId,
    locale,
    action: fieldPlan.blocked ? "blocked-overwrite-required" : draft ? "update-existing-draft" : "create-draft-locale",
    draftExists: Boolean(draft),
    publishedExists: Boolean(published),
    draftId: draft?.id ?? null,
    publishedId: published?.id ?? null,
    fieldsToWrite: Array.from(new Set(fieldPlan.fieldsToWrite)),
    fieldsSkipped: BOAT_SKIPPED_FIELDS,
    fieldPlans: fieldPlan.fieldPlans,
    blocked: fieldPlan.blocked,
    warnings,
    draftSlugPlan: slugPlan,
  };
}

async function planExperienceLocale(documentId: string, locale: Locale, translation: JsonObject, overwrite: boolean, targetBoatPlan: DraftPlan | undefined): Promise<DraftPlan> {
  const [draft, published] = await Promise.all([
    findExperienceRow(documentId, locale, "draft"),
    findExperienceRow(documentId, locale, "published"),
  ]);
  const fieldPlan = planFields(EXPERIENCE_ALLOWED_FIELDS, draft, translation, overwrite);
  const warnings: string[] = [];
  let slugPlan: string | null = null;

  if (published) warnings.push("Published version exists and will not be changed.");
  if (targetBoatPlan && !targetBoatPlan.draftExists) {
    warnings.push("Target boat draft locale is missing; route relation depends on creating that boat draft first.");
  }
  if (!draft && !meaningfulText(translation.title)) {
    fieldPlan.blocked = true;
    warnings.push("Missing title for new route draft locale.");
  }
  if (!draft?.slug) {
    slugPlan = draftSlug(meaningfulText(translation.title), documentId, locale);
    fieldPlan.fieldsToWrite.push("slug");
    if (await experienceSlugExists(slugPlan, locale, documentId)) {
      fieldPlan.blocked = true;
      warnings.push(`Draft slug collision must be resolved before write: ${slugPlan}`);
    }
  }

  const relationPlan = planRouteRelation(draft, targetBoatPlan, locale);
  if (relationPlan === "target-boat-draft-missing") {
    fieldPlan.blocked = true;
    warnings.push("Target boat draft locale is missing and is not planned for creation.");
  }

  return {
    documentId,
    locale,
    action: fieldPlan.blocked ? "blocked-overwrite-required" : draft ? "update-existing-draft" : "create-draft-locale",
    draftExists: Boolean(draft),
    publishedExists: Boolean(published),
    draftId: draft?.id ?? null,
    publishedId: published?.id ?? null,
    fieldsToWrite: Array.from(new Set(fieldPlan.fieldsToWrite)),
    fieldsSkipped: EXPERIENCE_SKIPPED_FIELDS,
    fieldPlans: fieldPlan.fieldPlans,
    relationPlan,
    draftSlugPlan: slugPlan,
    blocked: fieldPlan.blocked,
    warnings,
  };
}

export default () => ({
  async saveDraft(body: unknown) {
    if (!isRecord(body) || body.dryRun !== false || body.confirmSaveDraft !== true || body.overwrite === true) {
      return { status: 400, body: { ok: false, code: "invalid_save_draft_payload" } };
    }

    const boatDocumentId = asString(body.boatDocumentId);
    const sourceLocale = asLocale(body.sourceLocale);
    const targetLocales = asLocaleArray(body.targetLocales);
    const aiPreview = isRecord(body.aiPreview) ? body.aiPreview : null;
    const aiBoat = aiPreview && isRecord(aiPreview.boat) ? aiPreview.boat : null;
    const aiBoatTranslations = aiBoat && isRecord(aiBoat.translations) ? aiBoat.translations : null;
    const aiExperiences = aiPreview && Array.isArray(aiPreview.experiences) ? aiPreview.experiences : [];

    if (!boatDocumentId || !sourceLocale || !targetLocales?.length || !aiBoatTranslations) {
      return { status: 400, body: { ok: false, code: "invalid_save_draft_payload" } };
    }

    const safeTargetLocales = targetLocales.filter((locale) => ALL_LOCALES.includes(locale) && locale !== sourceLocale);
    const boatPlans = await Promise.all(safeTargetLocales.map((locale) => {
      const translation = aiBoatTranslations[locale];
      return planBoatLocale(boatDocumentId, locale, sourceLocale, isRecord(translation) ? translation : {}, false);
    }));
    const boatPlanByLocale = new Map(boatPlans.map((plan) => [plan.locale, plan]));

    const experienceInputs: Array<{ documentId: string; locale: Locale; translation: JsonObject }> = [];
    const experiencePlans: DraftPlan[] = [];
    for (const item of aiExperiences) {
      if (!isRecord(item)) continue;
      const documentId = asString(item.sourceDocumentId);
      const translations = isRecord(item.translations) ? item.translations : null;
      if (!documentId || !translations) continue;

      for (const locale of safeTargetLocales) {
        const translation = translations[locale];
        const safeTranslation = isRecord(translation) ? translation : {};
        experienceInputs.push({ documentId, locale, translation: safeTranslation });
        experiencePlans.push(await planExperienceLocale(documentId, locale, safeTranslation, false, boatPlanByLocale.get(locale)));
      }
    }

    const blockers = [
      ...boatPlans.filter((plan) => plan.blocked).map((plan) => `Boat ${localeLabel(plan.locale)} requires overwrite approval or complete required draft data.`),
      ...experiencePlans.filter((plan) => plan.blocked).map((plan) => `Route ${plan.documentId} ${localeLabel(plan.locale)} requires overwrite approval or complete required draft data.`),
    ];
    const warnings = [
      ...boatPlans.flatMap((plan) => plan.warnings.map((warning) => `Boat ${localeLabel(plan.locale)}: ${warning}`)),
      ...experiencePlans.flatMap((plan) => plan.warnings.map((warning) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${warning}`)),
    ];

    if (blockers.length) {
      return {
        status: 409,
        body: {
          ok: false,
          code: "overwrite_required",
          mode: "save-draft",
          doesWrite: false,
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boat: boatPlans,
          experiences: experiencePlans,
          blockers,
          warnings,
          written: [],
          skipped: [],
        },
      };
    }

    const written: string[] = [];
    const skipped: string[] = [];
    const targetBoatDraftByLocale = new Map<Locale, ExistingRow>();
    for (const plan of boatPlans) {
      const translation = aiBoatTranslations[plan.locale];
      const data = pickAllowedData(isRecord(translation) ? translation : {}, plan.fieldsToWrite);
      const currentDraft = await findBoatRow(plan.documentId, plan.locale, "draft");
      if (plan.draftSlugPlan && plan.fieldsToWrite.includes("slug") && !currentDraft?.slug) {
        data.slug = plan.draftSlugPlan;
      }
      if (!Object.keys(data).length) {
        skipped.push(`Boat ${localeLabel(plan.locale)}: no draft field changes.`);
        if (currentDraft) targetBoatDraftByLocale.set(plan.locale, currentDraft);
        continue;
      }

      let savedBoatDraft: ExistingRow | null = null;
      try {
        savedBoatDraft = await writeBoatDraft(plan, data);
      } catch (error) {
        return failureResponse({
          reason: plan.draftExists ? "boat_update_failed" : "boat_create_failed",
          message: safeFailureMessage(error, plan.draftExists ? "Boat draft update failed." : "Boat draft locale creation failed."),
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written,
          skipped,
        });
      }

      if (!savedBoatDraft) {
        return failureResponse({
          reason: "missing_locale_create_not_supported",
          message: "Strapi did not return a target-locale boat draft for the requested document.",
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written,
          skipped,
        });
      }

      targetBoatDraftByLocale.set(plan.locale, savedBoatDraft);
      written.push(`Boat ${localeLabel(plan.locale)}: ${Object.keys(data).join(", ")}`);
    }

    for (let index = 0; index < experiencePlans.length; index += 1) {
      const plan = experiencePlans[index];
      const input = experienceInputs[index];
      const targetBoatDraft = targetBoatDraftByLocale.get(plan.locale) ?? await findBoatRow(boatDocumentId, plan.locale, "draft");
      if (!targetBoatDraft?.documentId) {
        return failureResponse({
          reason: "missing_locale_create_not_supported",
          message: "Target-locale boat draft is missing before route draft save.",
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written,
          skipped,
        });
      }

      const data = pickAllowedData(input.translation, plan.fieldsToWrite);
      if (plan.draftSlugPlan && plan.fieldsToWrite.includes("slug")) data.slug = plan.draftSlugPlan;
      if (plan.relationPlan === "connect-to-target-locale-boat-draft-later") {
        data.boat = {
          documentId: targetBoatDraft.documentId,
          locale: plan.locale,
        };
      }
      if (!Object.keys(data).length && plan.draftExists) {
        skipped.push(`Route ${plan.documentId} ${localeLabel(plan.locale)}: no draft field changes.`);
        continue;
      }

      let savedExperienceDraft: ExistingRow | null = null;
      try {
        savedExperienceDraft = await writeExperienceDraft(plan, data);
      } catch (error) {
        return failureResponse({
          reason: plan.draftExists ? "experience_update_failed" : "experience_create_failed",
          message: safeFailureMessage(error, plan.draftExists ? "Route draft update failed." : "Route draft locale creation failed."),
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written,
          skipped,
        });
      }

      if (!savedExperienceDraft) {
        return failureResponse({
          reason: "missing_locale_create_not_supported",
          message: "Strapi did not return a target-locale route draft for the requested document.",
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written,
          skipped,
        });
      }

      written.push(`Route ${plan.documentId} ${localeLabel(plan.locale)}: ${Object.keys(data).join(", ")}`);
    }

    return {
      status: 200,
      body: {
        ok: true,
        code: "saved_draft",
        mode: "save-draft",
        doesWrite: true,
        doesPublish: false,
        boatDocumentId,
        sourceLocale,
        targetLocales: safeTargetLocales,
        boat: boatPlans,
        experiences: experiencePlans,
        blockers: [],
        warnings,
        written,
        skipped,
      },
    };
  },
});
