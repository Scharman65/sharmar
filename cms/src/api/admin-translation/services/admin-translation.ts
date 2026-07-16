import {
  asLocale,
  asLocaleArray,
  asNumber,
  asString,
  isRecord,
  localeLabel,
  planLocalization,
  type ExistingLocalization,
  type JsonObject,
  type Locale,
  type LocalizationPlan,
} from "./localization-plan";

type SaveDraftFailureReason =
  | "blocked"
  | "boat_create_failed"
  | "boat_update_failed"
  | "experience_create_failed"
  | "experience_update_failed"
  | "duplicate_risk"
  | "invalid_result"
  | "unknown";

const ALL_LOCALES: Locale[] = ["en", "ru", "sr-Latn-ME"];
export const BOAT_UID = "api::boat.boat";
export const EXPERIENCE_UID = "api::experience.experience";
export const BOAT_READ_FIELDS = ["id", "documentId", "locale", "publishedAt", "title", "description"] as const;
export const EXPERIENCE_READ_FIELDS = ["id", "documentId", "locale", "publishedAt", "title", "short_description", "full_description", "included_services", "meeting_point"] as const;
const BOAT_SHARED_SCALAR_FIELDS = [
  "slug",
  "boat_type",
  "capacity",
  "length_m",
  "year",
  "engine_hp",
  "license_required",
  "skipper_available",
  "skipper_price_per_hour",
  "skipper_price_per_day",
  "currency",
  "listing_type",
  "vesselType",
  "propulsion",
  "owner_phone",
  "owner_user_id",
  "owner_whatsapp",
  "owner_viber",
  "contacts_visible",
  "verified_listing",
  "featured_listing",
  "reviewed_at",
  "price_per_hour",
  "price_per_day",
  "price_per_week",
  "deposit",
  "sale_price",
  "instant_booking",
  "min_rental_hours",
] as const;
const EXPERIENCE_SHARED_SCALAR_FIELDS = [
  "slug",
  "duration_hours",
  "price",
  "currency",
  "max_guests",
  "sort_order",
  "is_active",
] as const;

type StrapiLike = {
  contentType?: (uid: string) => unknown;
  db: {
    getConnection?: (tableName?: string) => unknown;
    metadata?: {
      get(uid: string): { tableName?: string } | undefined;
    };
    query(uid: string): {
      findMany(params: unknown): Promise<unknown[]>;
    };
    transaction<T>(cb: (params?: { trx?: unknown }) => Promise<T>): Promise<T>;
  };
  documents(uid: string): {
    findOne(params: unknown): Promise<unknown>;
    update(params: unknown): Promise<unknown>;
  };
  plugin?: (name: string) => {
    service(serviceName: string): unknown;
  };
};

function shapeExistingRow(row: JsonObject | null): ExistingLocalization | null {
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

async function findBoatRow(cms: StrapiLike, documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingLocalization | null> {
  const row = await cms.documents(BOAT_UID).findOne({
    documentId,
    locale,
    status,
    fields: BOAT_READ_FIELDS,
  });

  return shapeExistingRow(isRecord(row) ? row : null);
}

async function findExperienceRow(cms: StrapiLike, documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingLocalization | null> {
  const row = await cms.documents(EXPERIENCE_UID).findOne({
    documentId,
    locale,
    status,
    fields: EXPERIENCE_READ_FIELDS,
    populate: { boat: { fields: ["documentId", "locale"] } },
  });

  return shapeExistingRow(isRecord(row) ? row : null);
}

function readFieldsForUid(uid: string): readonly string[] {
  if (uid === BOAT_UID) return BOAT_READ_FIELDS;
  if (uid === EXPERIENCE_UID) return EXPERIENCE_READ_FIELDS;
  return ["id", "documentId", "locale", "publishedAt"];
}

async function findRows(cms: StrapiLike, uid: string, documentId: string, locale: Locale): Promise<ExistingLocalization[]> {
  const rows = await cms.db.query(uid).findMany({
    where: { documentId, locale },
    select: readFieldsForUid(uid),
    limit: 10,
  });

  return (Array.isArray(rows) ? rows : [])
    .map((row) => shapeExistingRow(isRecord(row) ? row : null))
    .filter((row): row is ExistingLocalization => row !== null);
}

async function sourceExists(cms: StrapiLike, uid: string, documentId: string, locale: Locale): Promise<boolean> {
  const rows = await findRows(cms, uid, documentId, locale);
  return rows.some((row) => row.documentId === documentId && row.locale === locale);
}

async function planBoatLocale(cms: StrapiLike, documentId: string, sourceLocale: Locale, targetLocale: Locale, translation: JsonObject): Promise<LocalizationPlan> {
  const rows = await findRows(cms, BOAT_UID, documentId, targetLocale);
  return planLocalization({
    contentType: "boat",
    documentId,
    sourceLocale,
    targetLocale,
    translation,
    sourceExists: await sourceExists(cms, BOAT_UID, documentId, sourceLocale),
    draftRows: rows.filter((row) => !row.publishedAt),
    publishedRows: rows.filter((row) => Boolean(row.publishedAt)),
  });
}

async function planExperienceLocale(cms: StrapiLike, documentId: string, sourceLocale: Locale, targetLocale: Locale, translation: JsonObject): Promise<LocalizationPlan> {
  const rows = await findRows(cms, EXPERIENCE_UID, documentId, targetLocale);
  return planLocalization({
    contentType: "experience",
    documentId,
    sourceLocale,
    targetLocale,
    translation,
    sourceExists: await sourceExists(cms, EXPERIENCE_UID, documentId, sourceLocale),
    draftRows: rows.filter((row) => !row.publishedAt),
    publishedRows: rows.filter((row) => Boolean(row.publishedAt)),
  });
}

function pickTranslation(source: unknown, locale: Locale): JsonObject {
  return isRecord(source) ? isRecord(source[locale]) ? source[locale] as JsonObject : {} : {};
}

function safeFailureMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  return (message || fallback)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .slice(0, 180);
}

function aggregateBlockers(boatPlans: LocalizationPlan[], experiencePlans: LocalizationPlan[]): string[] {
  return [
    ...boatPlans.filter((plan) => plan.blocked).map((plan) => `Boat ${localeLabel(plan.locale)}: ${plan.operation}`),
    ...experiencePlans.filter((plan) => plan.blocked).map((plan) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${plan.operation}`),
  ];
}

function aggregateWarnings(boatPlans: LocalizationPlan[], experiencePlans: LocalizationPlan[]): string[] {
  return [
    ...boatPlans.flatMap((plan) => plan.warnings.map((warning) => `Boat ${localeLabel(plan.locale)}: ${warning}`)),
    ...experiencePlans.flatMap((plan) => plan.warnings.map((warning) => `Route ${plan.documentId} ${localeLabel(plan.locale)}: ${warning}`)),
  ];
}

function failureResponse(params: {
  status?: number;
  reason: SaveDraftFailureReason;
  message: string;
  boatDocumentId: string;
  sourceLocale: Locale;
  targetLocales: Locale[];
  boatPlans: LocalizationPlan[];
  experiencePlans: LocalizationPlan[];
  warnings: string[];
  written: string[];
  skipped: string[];
}) {
  return {
    status: params.status ?? 500,
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
      blockers: aggregateBlockers(params.boatPlans, params.experiencePlans),
      warnings: params.warnings,
      written: params.written,
      skipped: params.skipped,
    },
  };
}

function hasI18nSyncService(service: unknown): service is {
  syncNonLocalizedAttributes(sourceEntry: unknown, model: unknown): Promise<void>;
} {
  return isRecord(service) && typeof service.syncNonLocalizedAttributes === "function";
}

function hasI18nContentTypeService(service: unknown): service is {
  getNestedPopulateOfNonLocalizedAttributes(uid: string): unknown;
} {
  return isRecord(service) && typeof service.getNestedPopulateOfNonLocalizedAttributes === "function";
}

function relationDocumentId(value: unknown): string | null {
  return isRecord(value) ? asString(value.documentId) : null;
}

function relationLink(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const documentId = asString(value.documentId);
  if (!documentId) return null;
  return documentId;
}

function relationLinks(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(relationLink).filter((link): link is string => link !== null)
    : [];
}

function mediaId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const id = asNumber(value.id);
  return id === null ? null : id;
}

function mediaIds(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(mediaId).filter((id): id is number => id !== null)
    : [];
}

function copyScalarFields(source: JsonObject, fields: readonly string[]): JsonObject {
  const data: JsonObject = {};
  for (const field of fields) {
    if (["id", "documentId", "locale", "publishedAt", "createdAt", "updatedAt"].includes(field)) continue;
    if (source[field] !== undefined && source[field] !== null) {
      data[field] = source[field];
    }
  }
  return data;
}

async function findSourceForSharedFields(cms: StrapiLike, uid: string, documentId: string, sourceLocale: Locale, fields: readonly string[], populate: JsonObject): Promise<JsonObject | null> {
  const params = {
    documentId,
    locale: sourceLocale,
    fields: [...fields],
    populate,
  };
  const draft = await cms.documents(uid).findOne({ ...params, status: "draft" });
  if (isRecord(draft)) return draft;
  const published = await cms.documents(uid).findOne({ ...params, status: "published" });
  return isRecord(published) ? published : null;
}

async function localizedRelationExists(cms: StrapiLike, uid: string, documentId: string | null, locale: Locale): Promise<boolean> {
  if (!documentId) return false;
  const rows = await cms.db.query(uid).findMany({
    where: { documentId, locale },
    select: ["id", "documentId", "locale"],
    limit: 1,
  });
  return Array.isArray(rows) && rows.length > 0;
}

async function copyLocalizedRelation(cms: StrapiLike, data: JsonObject, field: string, targetUid: string, value: unknown, targetLocale: Locale): Promise<void> {
  const documentId = relationLink(value);
  if (await localizedRelationExists(cms, targetUid, documentId, targetLocale)) {
    data[field] = documentId;
  }
}

async function copyLocalizedRelations(cms: StrapiLike, data: JsonObject, field: string, targetUid: string, value: unknown, targetLocale: Locale): Promise<void> {
  const documentIds = relationLinks(value);
  const existing: string[] = [];
  for (const documentId of documentIds) {
    if (await localizedRelationExists(cms, targetUid, documentId, targetLocale)) {
      existing.push(documentId);
    }
  }
  if (existing.length) data[field] = existing;
}

async function buildBoatSharedCreateData(cms: StrapiLike, documentId: string, sourceLocale: Locale, targetLocale: Locale): Promise<JsonObject> {
  const source = await findSourceForSharedFields(cms, BOAT_UID, documentId, sourceLocale, BOAT_SHARED_SCALAR_FIELDS, {
    cover: { fields: ["id"] },
    images: { fields: ["id"] },
    brand: { fields: ["documentId"] },
    purposes: { fields: ["documentId"] },
    home_marina: { fields: ["documentId"] },
    extras: { fields: ["documentId"] },
    rate_plans: { fields: ["documentId"] },
  });
  if (!source) return {};

  const data = copyScalarFields(source, BOAT_SHARED_SCALAR_FIELDS);
  const cover = mediaId(source.cover);
  const images = mediaIds(source.images);
  const ratePlans = relationLinks(source.rate_plans);

  if (cover !== null) data.cover = cover;
  if (images.length) data.images = images;
  if (ratePlans.length) data.rate_plans = ratePlans;
  await copyLocalizedRelation(cms, data, "brand", "api::brand.brand", source.brand, targetLocale);
  await copyLocalizedRelation(cms, data, "home_marina", "api::location.location", source.home_marina, targetLocale);
  await copyLocalizedRelations(cms, data, "purposes", "api::purpose.purpose", source.purposes, targetLocale);
  await copyLocalizedRelations(cms, data, "extras", "api::extra.extra", source.extras, targetLocale);

  return data;
}

async function buildExperienceSharedCreateData(cms: StrapiLike, documentId: string, sourceLocale: Locale, targetLocale: Locale): Promise<JsonObject> {
  const source = await findSourceForSharedFields(cms, EXPERIENCE_UID, documentId, sourceLocale, EXPERIENCE_SHARED_SCALAR_FIELDS, {
    cover: { fields: ["id"] },
    gallery: { fields: ["id"] },
    boat: { fields: ["documentId"] },
  });
  if (!source) return {};

  const data = copyScalarFields(source, EXPERIENCE_SHARED_SCALAR_FIELDS);
  const cover = mediaId(source.cover);
  const gallery = mediaIds(source.gallery);

  if (cover !== null) data.cover = cover;
  if (gallery.length) data.gallery = gallery;
  await copyLocalizedRelation(cms, data, "boat", BOAT_UID, source.boat, targetLocale);

  return data;
}

async function buildSharedCreateData(cms: StrapiLike, uid: string, plan: LocalizationPlan, sourceLocale: Locale): Promise<JsonObject> {
  if (plan.operation !== "CREATE_MISSING_LOCALIZATION") return {};
  if (uid === BOAT_UID) return buildBoatSharedCreateData(cms, plan.documentId, sourceLocale, plan.locale);
  if (uid === EXPERIENCE_UID) return buildExperienceSharedCreateData(cms, plan.documentId, sourceLocale, plan.locale);
  return {};
}

async function syncSharedFieldsFromSource(cms: StrapiLike, uid: string, plan: LocalizationPlan, sourceLocale: Locale): Promise<void> {
  if (plan.operation !== "CREATE_MISSING_LOCALIZATION" || !cms.plugin || !cms.contentType) return;

  const contentType = cms.contentType(uid);
  const i18nPlugin = cms.plugin("i18n");
  const contentTypeService = i18nPlugin.service("content-types");
  const localizationService = i18nPlugin.service("localizations");
  if (!hasI18nContentTypeService(contentTypeService) || !hasI18nSyncService(localizationService)) return;

  const sourceEntry = await cms.db.query(uid).findMany({
    where: { documentId: plan.documentId, locale: sourceLocale },
    populate: contentTypeService.getNestedPopulateOfNonLocalizedAttributes(uid),
    limit: 1,
  });
  const source = Array.isArray(sourceEntry) ? sourceEntry[0] : null;
  if (!source) return;

  await localizationService.syncNonLocalizedAttributes(source, contentType);
}

async function writeLocalization(cms: StrapiLike, uid: string, plan: LocalizationPlan, sourceLocale: Locale): Promise<ExistingLocalization | null> {
  if (!plan.doesWrite || !Object.keys(plan.sanitizedData).length) {
    return uid === BOAT_UID
      ? findBoatRow(cms, plan.documentId, plan.locale, "draft")
      : findExperienceRow(cms, plan.documentId, plan.locale, "draft");
  }

  const sourceSharedData = await buildSharedCreateData(cms, uid, plan, sourceLocale);
  await cms.documents(uid).update({
    documentId: plan.documentId,
    locale: plan.locale,
    status: "draft",
    data: {
      ...sourceSharedData,
      ...plan.sanitizedData,
    },
  });

  await syncSharedFieldsFromSource(cms, uid, plan, sourceLocale);

  return uid === BOAT_UID
    ? findBoatRow(cms, plan.documentId, plan.locale, "draft")
    : findExperienceRow(cms, plan.documentId, plan.locale, "draft");
}

async function assertSingleDraft(cms: StrapiLike, uid: string, documentId: string, locale: Locale): Promise<boolean> {
  const rows = await findRows(cms, uid, documentId, locale);
  return rows.filter((row) => !row.publishedAt).length <= 1 && rows.filter((row) => Boolean(row.publishedAt)).length === 0;
}

function validateSavedDraft(saved: ExistingLocalization | null, plan: LocalizationPlan): boolean {
  return Boolean(
    saved &&
    saved.documentId === plan.documentId &&
    saved.locale === plan.locale &&
    !saved.publishedAt
  );
}

function isQueryBuilder(value: unknown): value is {
  select(field: string): any;
  where(params: Record<string, unknown>): any;
  limit(count: number): any;
  transacting(trx: unknown): any;
  forUpdate?: () => any;
  then: Promise<unknown>["then"];
} {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.select === "function" &&
    typeof candidate.where === "function" &&
    typeof candidate.limit === "function" &&
    typeof candidate.transacting === "function" &&
    typeof candidate.then === "function"
  );
}

async function lockDocumentRows(cms: StrapiLike, uid: string, documentId: string, trx: unknown): Promise<void> {
  const tableName = cms.db.metadata?.get(uid)?.tableName;
  if (!trx || !tableName || !cms.db.getConnection) return;

  const maybeQuery = cms.db.getConnection(tableName);
  if (!isQueryBuilder(maybeQuery)) return;

  let query = maybeQuery
    .select("id")
    .where({ document_id: documentId })
    .limit(1)
    .transacting(trx);

  if (isRecord(query) && typeof query.forUpdate === "function") {
    query = query.forUpdate();
  }

  try {
    await query;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/for update|sqlite/i.test(message)) return;
    throw error;
  }
}

export function createAdminTranslationService(cms: StrapiLike) {
  return {
    async saveDraft(body: unknown) {
      if (!isRecord(body) || (body.dryRun !== true && body.dryRun !== false) || body.overwrite === true) {
        return { status: 400, body: { ok: false, code: "invalid_save_draft_payload" } };
      }

      if (body.dryRun === false && body.confirmSaveDraft !== true) {
        return { status: 400, body: { ok: false, code: "confirm_save_draft_required" } };
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
      if (!safeTargetLocales.length) {
        return { status: 400, body: { ok: false, code: "target_locales_required" } };
      }

      const boatPlans = await Promise.all(safeTargetLocales.map((locale) => (
        planBoatLocale(cms, boatDocumentId, sourceLocale, locale, pickTranslation(aiBoatTranslations, locale))
      )));

      const experienceInputs: Array<{ documentId: string; locale: Locale; translation: JsonObject }> = [];
      const experiencePlans: LocalizationPlan[] = [];
      for (const item of aiExperiences) {
        if (!isRecord(item)) continue;
        const documentId = asString(item.sourceDocumentId);
        const translations = isRecord(item.translations) ? item.translations : null;
        if (!documentId || !translations) continue;

        for (const locale of safeTargetLocales) {
          const translation = pickTranslation(translations, locale);
          experienceInputs.push({ documentId, locale, translation });
          experiencePlans.push(await planExperienceLocale(cms, documentId, sourceLocale, locale, translation));
        }
      }

      const blockers = aggregateBlockers(boatPlans, experiencePlans);
      const warnings = aggregateWarnings(boatPlans, experiencePlans);
      if (body.dryRun === true) {
        return {
          status: 200,
          body: {
            ok: true,
            code: "dry_run_ready",
            mode: "dry-run",
            doesWrite: false,
            doesPublish: false,
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

      if (blockers.length) {
        return failureResponse({
          status: 409,
          reason: "blocked",
          message: "Save-draft blocked by localization safety checks.",
          boatDocumentId,
          sourceLocale,
          targetLocales: safeTargetLocales,
          boatPlans,
          experiencePlans,
          warnings,
          written: [],
          skipped: [],
        });
      }

      return cms.db.transaction(async ({ trx } = {}) => {
        const written: string[] = [];
        const skipped: string[] = [];

        for (const plan of boatPlans) {
          await lockDocumentRows(cms, BOAT_UID, boatDocumentId, trx);
          const freshPlan = await planBoatLocale(
            cms,
            boatDocumentId,
            sourceLocale,
            plan.locale,
            pickTranslation(aiBoatTranslations, plan.locale)
          );
          if (freshPlan.blocked) {
            throw failureResponse({
              status: 409,
              reason: "blocked",
              message: `Boat ${localeLabel(freshPlan.locale)} became blocked before write: ${freshPlan.operation}.`,
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

          if (!freshPlan.doesWrite) {
            skipped.push(`Boat ${localeLabel(freshPlan.locale)}: no draft field changes.`);
            continue;
          }

          let savedBoatDraft: ExistingLocalization | null = null;
          try {
            savedBoatDraft = await writeLocalization(cms, BOAT_UID, freshPlan, sourceLocale);
          } catch (error) {
            throw failureResponse({
              reason: freshPlan.operation === "CREATE_MISSING_LOCALIZATION" ? "boat_create_failed" : "boat_update_failed",
              message: safeFailureMessage(error, "Boat draft save failed."),
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

          if (!validateSavedDraft(savedBoatDraft, freshPlan) || !(await assertSingleDraft(cms, BOAT_UID, freshPlan.documentId, freshPlan.locale))) {
            throw failureResponse({
              status: 409,
              reason: "invalid_result",
              message: "Boat save did not produce exactly one target-locale draft with the same documentId.",
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

          written.push(`Boat ${localeLabel(freshPlan.locale)}: ${freshPlan.fieldsToWrite.join(", ")}`);
        }

        for (let index = 0; index < experienceInputs.length; index += 1) {
          const input = experienceInputs[index];
          await lockDocumentRows(cms, EXPERIENCE_UID, input.documentId, trx);
          const freshPlan = await planExperienceLocale(cms, input.documentId, sourceLocale, input.locale, input.translation);
          if (freshPlan.blocked) {
            throw failureResponse({
              status: 409,
              reason: "blocked",
              message: `Route ${freshPlan.documentId} ${localeLabel(freshPlan.locale)} became blocked before write: ${freshPlan.operation}.`,
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

          if (!freshPlan.doesWrite) {
            skipped.push(`Route ${freshPlan.documentId} ${localeLabel(freshPlan.locale)}: no draft field changes.`);
            continue;
          }

          let savedExperienceDraft: ExistingLocalization | null = null;
          try {
            savedExperienceDraft = await writeLocalization(cms, EXPERIENCE_UID, freshPlan, sourceLocale);
          } catch (error) {
            throw failureResponse({
              reason: freshPlan.operation === "CREATE_MISSING_LOCALIZATION" ? "experience_create_failed" : "experience_update_failed",
              message: safeFailureMessage(error, "Route draft save failed."),
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

          if (!validateSavedDraft(savedExperienceDraft, freshPlan) || !(await assertSingleDraft(cms, EXPERIENCE_UID, freshPlan.documentId, freshPlan.locale))) {
            throw failureResponse({
              status: 409,
              reason: "invalid_result",
              message: "Route save did not produce exactly one target-locale draft with the same documentId.",
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

          written.push(`Route ${freshPlan.documentId} ${localeLabel(freshPlan.locale)}: ${freshPlan.fieldsToWrite.join(", ")}`);
        }

        return {
          status: 200,
          body: {
            ok: true,
            code: "saved_draft",
            mode: "save-draft",
            doesWrite: written.length > 0,
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
      }).catch((error) => {
        if (isRecord(error) && typeof error.status === "number" && isRecord(error.body)) {
          return error;
        }
        throw error;
      });
    },
  };
}

export default () => createAdminTranslationService(strapi);
