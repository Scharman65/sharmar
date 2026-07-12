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
const BOAT_UID = "api::boat.boat";
const EXPERIENCE_UID = "api::experience.experience";

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

async function findBoatRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingLocalization | null> {
  const row = await strapi.documents(BOAT_UID as never).findOne({
    documentId,
    locale,
    status,
    fields: ["id", "documentId", "locale", "publishedAt", "title", "description"],
  } as never);

  return shapeExistingRow(isRecord(row) ? row : null);
}

async function findExperienceRow(documentId: string, locale: Locale, status: "draft" | "published"): Promise<ExistingLocalization | null> {
  const row = await strapi.documents(EXPERIENCE_UID as never).findOne({
    documentId,
    locale,
    status,
    fields: ["id", "documentId", "locale", "publishedAt", "title", "short_description", "full_description", "included_services", "meeting_point"],
    populate: { boat: { fields: ["documentId", "locale"] } },
  } as never);

  return shapeExistingRow(isRecord(row) ? row : null);
}

async function findRows(uid: string, documentId: string, locale: Locale): Promise<ExistingLocalization[]> {
  const rows = await strapi.db.query(uid as never).findMany({
    where: { documentId, locale },
    select: ["id", "documentId", "locale", "publishedAt", "title", "description", "short_description", "full_description", "included_services", "meeting_point"],
    limit: 10,
  } as never);

  return (Array.isArray(rows) ? rows : [])
    .map((row) => shapeExistingRow(isRecord(row) ? row : null))
    .filter((row): row is ExistingLocalization => row !== null);
}

async function sourceExists(uid: string, documentId: string, locale: Locale): Promise<boolean> {
  const rows = await findRows(uid, documentId, locale);
  return rows.some((row) => row.documentId === documentId && row.locale === locale);
}

async function planBoatLocale(documentId: string, sourceLocale: Locale, targetLocale: Locale, translation: JsonObject): Promise<LocalizationPlan> {
  const rows = await findRows(BOAT_UID, documentId, targetLocale);
  return planLocalization({
    contentType: "boat",
    documentId,
    sourceLocale,
    targetLocale,
    translation,
    sourceExists: await sourceExists(BOAT_UID, documentId, sourceLocale),
    draftRows: rows.filter((row) => !row.publishedAt),
    publishedRows: rows.filter((row) => Boolean(row.publishedAt)),
  });
}

async function planExperienceLocale(documentId: string, sourceLocale: Locale, targetLocale: Locale, translation: JsonObject): Promise<LocalizationPlan> {
  const rows = await findRows(EXPERIENCE_UID, documentId, targetLocale);
  return planLocalization({
    contentType: "experience",
    documentId,
    sourceLocale,
    targetLocale,
    translation,
    sourceExists: await sourceExists(EXPERIENCE_UID, documentId, sourceLocale),
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

async function writeLocalization(uid: string, plan: LocalizationPlan): Promise<ExistingLocalization | null> {
  if (!plan.doesWrite || !Object.keys(plan.sanitizedData).length) {
    return uid === BOAT_UID
      ? findBoatRow(plan.documentId, plan.locale, "draft")
      : findExperienceRow(plan.documentId, plan.locale, "draft");
  }

  await strapi.documents(uid as never).update({
    documentId: plan.documentId,
    locale: plan.locale,
    status: "draft",
    data: plan.sanitizedData,
  } as never);

  return uid === BOAT_UID
    ? findBoatRow(plan.documentId, plan.locale, "draft")
    : findExperienceRow(plan.documentId, plan.locale, "draft");
}

async function assertSingleDraft(uid: string, documentId: string, locale: Locale): Promise<boolean> {
  const rows = await findRows(uid, documentId, locale);
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
    if (!safeTargetLocales.length) {
      return { status: 400, body: { ok: false, code: "target_locales_required" } };
    }

    const boatPlans = await Promise.all(safeTargetLocales.map((locale) => (
      planBoatLocale(boatDocumentId, sourceLocale, locale, pickTranslation(aiBoatTranslations, locale))
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
        experiencePlans.push(await planExperienceLocale(documentId, sourceLocale, locale, translation));
      }
    }

    const blockers = aggregateBlockers(boatPlans, experiencePlans);
    const warnings = aggregateWarnings(boatPlans, experiencePlans);
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

    const written: string[] = [];
    const skipped: string[] = [];

    for (const plan of boatPlans) {
      const freshPlan = await planBoatLocale(
        boatDocumentId,
        sourceLocale,
        plan.locale,
        pickTranslation(aiBoatTranslations, plan.locale)
      );
      if (freshPlan.blocked) {
        return failureResponse({
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
        savedBoatDraft = await writeLocalization(BOAT_UID, freshPlan);
      } catch (error) {
        return failureResponse({
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

      if (!validateSavedDraft(savedBoatDraft, freshPlan) || !(await assertSingleDraft(BOAT_UID, freshPlan.documentId, freshPlan.locale))) {
        return failureResponse({
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
      const freshPlan = await planExperienceLocale(input.documentId, sourceLocale, input.locale, input.translation);
      if (freshPlan.blocked) {
        return failureResponse({
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
        savedExperienceDraft = await writeLocalization(EXPERIENCE_UID, freshPlan);
      } catch (error) {
        return failureResponse({
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

      if (!validateSavedDraft(savedExperienceDraft, freshPlan) || !(await assertSingleDraft(EXPERIENCE_UID, freshPlan.documentId, freshPlan.locale))) {
        return failureResponse({
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
  },
});
