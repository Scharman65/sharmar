export type JsonObject = Record<string, unknown>;
export type Locale = "ru" | "en" | "sr-Latn-ME";
export type ContentType = "boat" | "experience";
export type LocalizationOperation =
  | "UPDATE_EXISTING_DRAFT"
  | "CREATE_MISSING_LOCALIZATION"
  | "NO_CHANGES"
  | "BLOCKED_ALREADY_PUBLISHED"
  | "BLOCKED_INVALID_DOCUMENT"
  | "BLOCKED_UNSUPPORTED_LOCALE"
  | "BLOCKED_DUPLICATE_RISK"
  | "BLOCKED_FORBIDDEN_FIELDS";

export type ExistingLocalization = {
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

export type FieldPlan = {
  field: string;
  status: "would-write" | "would-skip" | "blocked-forbidden";
  existingValuePresent: boolean;
};

export type LocalizationPlan = {
  contentType: ContentType;
  documentId: string;
  locale: Locale;
  operation: LocalizationOperation;
  action: LocalizationOperation;
  draftExists: boolean;
  publishedExists: boolean;
  draftId: number | null;
  publishedId: number | null;
  fieldsToWrite: string[];
  fieldsSkipped: string[];
  fieldPlans: FieldPlan[];
  blocked: boolean;
  warnings: string[];
  sanitizedData: JsonObject;
  doesWrite: boolean;
  doesPublish: false;
};

export type LocalizationPlanInput = {
  contentType: ContentType;
  documentId: string;
  sourceLocale: Locale | null;
  targetLocale: Locale | null;
  translation: JsonObject;
  sourceExists: boolean;
  draftRows: ExistingLocalization[];
  publishedRows: ExistingLocalization[];
};

export const SUPPORTED_LOCALES: Locale[] = ["en", "ru", "sr-Latn-ME"];
export const BOAT_ALLOWED_FIELDS = ["title", "description"] as const;
export const EXPERIENCE_ALLOWED_FIELDS = ["title", "short_description", "full_description", "included_services", "meeting_point"] as const;

const BOAT_SKIPPED_FIELDS = [
  "slug",
  "publishedAt",
  "owner",
  "owner_user_id",
  "contacts_visible",
  "verified_listing",
  "featured_listing",
  "reviewed_at",
  "prices",
  "currency",
  "capacity",
  "year",
  "engine",
  "media",
  "cover",
  "images",
  "marina",
  "brand",
  "extras",
  "purposes",
  "rate_plans",
  "booking fields",
];

const EXPERIENCE_SKIPPED_FIELDS = [
  "slug",
  "publishedAt",
  "price",
  "currency",
  "duration_hours",
  "max_guests",
  "sort_order",
  "is_active",
  "cover",
  "gallery",
  "boat",
];

const CONTENT_CONFIG = {
  boat: {
    allowedFields: BOAT_ALLOWED_FIELDS,
    skippedFields: BOAT_SKIPPED_FIELDS,
  },
  experience: {
    allowedFields: EXPERIENCE_ALLOWED_FIELDS,
    skippedFields: EXPERIENCE_SKIPPED_FIELDS,
  },
} satisfies Record<ContentType, { allowedFields: readonly string[]; skippedFields: string[] }>;

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function asLocale(value: unknown): Locale | null {
  return value === "en" || value === "ru" || value === "sr-Latn-ME" ? value : null;
}

export function asLocaleArray(value: unknown): Locale[] | null {
  if (!Array.isArray(value)) return null;
  const locales = value.map(asLocale).filter((locale): locale is Locale => locale !== null);
  return locales.length ? Array.from(new Set(locales)) : null;
}

export function frontendLocaleToStrapiLocale(value: unknown): Locale | null {
  if (value === "me") return "sr-Latn-ME";
  return asLocale(value);
}

export function localeLabel(locale: Locale): string {
  return locale === "sr-Latn-ME" ? "me" : locale;
}

export function validateWriteGate(params: {
  configuredToken?: string | null;
  requestToken?: string | null;
  writeEnabled?: boolean;
}): { ok: true } | { ok: false; status: number; code: string } {
  const configuredToken = params.configuredToken?.trim() ?? "";
  const requestToken = params.requestToken?.trim() ?? "";

  if (!configuredToken) return { ok: false, status: 503, code: "admin_translation_internal_token_missing" };
  if (!requestToken || requestToken !== configuredToken) return { ok: false, status: 401, code: "unauthorized" };
  if (params.writeEnabled !== true) return { ok: false, status: 403, code: "write_not_enabled" };

  return { ok: true };
}

export function meaningfulText(value: unknown): string | null {
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

function firstRow(rows: ExistingLocalization[]): ExistingLocalization | null {
  return rows.length === 1 ? rows[0] : null;
}

function blockedPlan(params: {
  input: LocalizationPlanInput;
  operation: LocalizationOperation;
  warnings: string[];
  fieldPlans?: FieldPlan[];
}): LocalizationPlan {
  return {
    contentType: params.input.contentType,
    documentId: params.input.documentId,
    locale: params.input.targetLocale ?? "en",
    operation: params.operation,
    action: params.operation,
    draftExists: params.input.draftRows.length > 0,
    publishedExists: params.input.publishedRows.length > 0,
    draftId: firstRow(params.input.draftRows)?.id ?? null,
    publishedId: firstRow(params.input.publishedRows)?.id ?? null,
    fieldsToWrite: [],
    fieldsSkipped: CONTENT_CONFIG[params.input.contentType].skippedFields,
    fieldPlans: params.fieldPlans ?? [],
    blocked: true,
    warnings: params.warnings,
    sanitizedData: {},
    doesWrite: false,
    doesPublish: false,
  };
}

export function planLocalization(input: LocalizationPlanInput): LocalizationPlan {
  const config = CONTENT_CONFIG[input.contentType];

  if (!input.sourceLocale || !input.targetLocale || !SUPPORTED_LOCALES.includes(input.sourceLocale) || !SUPPORTED_LOCALES.includes(input.targetLocale)) {
    return blockedPlan({
      input,
      operation: "BLOCKED_UNSUPPORTED_LOCALE",
      warnings: ["Source or target locale is not supported."],
    });
  }

  if (input.sourceLocale === input.targetLocale) {
    return blockedPlan({
      input,
      operation: "BLOCKED_UNSUPPORTED_LOCALE",
      warnings: ["Source and target locale must be different."],
    });
  }

  if (!input.documentId || !input.sourceExists) {
    return blockedPlan({
      input,
      operation: "BLOCKED_INVALID_DOCUMENT",
      warnings: ["Source document localization was not found."],
    });
  }

  if (input.draftRows.length > 1 || input.publishedRows.length > 1) {
    return blockedPlan({
      input,
      operation: "BLOCKED_DUPLICATE_RISK",
      warnings: ["More than one target localization row was found."],
    });
  }

  const draft = firstRow(input.draftRows);
  const published = firstRow(input.publishedRows);

  if (published) {
    return blockedPlan({
      input,
      operation: "BLOCKED_ALREADY_PUBLISHED",
      warnings: ["Target locale is already published and will not be changed by save-draft."],
    });
  }

  const allowedFields = new Set<string>(config.allowedFields);
  const forbiddenFields = Object.keys(input.translation).filter((field) => !allowedFields.has(field));
  if (forbiddenFields.length) {
    return blockedPlan({
      input,
      operation: "BLOCKED_FORBIDDEN_FIELDS",
      warnings: [`Forbidden fields in translation payload: ${forbiddenFields.sort().join(", ")}`],
      fieldPlans: forbiddenFields.sort().map((field) => ({
        field,
        status: "blocked-forbidden",
        existingValuePresent: false,
      })),
    });
  }

  if (!draft && !meaningfulText(input.translation.title)) {
    return blockedPlan({
      input,
      operation: "BLOCKED_INVALID_DOCUMENT",
      warnings: ["Title is required to create a missing draft localization."],
    });
  }

  const fieldsToWrite: string[] = [];
  const fieldPlans: FieldPlan[] = [];
  const sanitizedData: JsonObject = {};

  for (const field of config.allowedFields) {
    const plannedValue = meaningfulText(input.translation[field]);
    if (plannedValue === null) continue;

    const existingValue = draft ? draft[field as keyof ExistingLocalization] : null;
    const existingValuePresent = normalizeText(existingValue).length > 0;
    if (!draft || valuesDiffer(existingValue, plannedValue)) {
      fieldsToWrite.push(field);
      sanitizedData[field] = plannedValue;
      fieldPlans.push({ field, status: "would-write", existingValuePresent });
    } else {
      fieldPlans.push({ field, status: "would-skip", existingValuePresent });
    }
  }

  const operation: LocalizationOperation = fieldsToWrite.length
    ? draft ? "UPDATE_EXISTING_DRAFT" : "CREATE_MISSING_LOCALIZATION"
    : "NO_CHANGES";

  return {
    contentType: input.contentType,
    documentId: input.documentId,
    locale: input.targetLocale,
    operation,
    action: operation,
    draftExists: Boolean(draft),
    publishedExists: false,
    draftId: draft?.id ?? null,
    publishedId: null,
    fieldsToWrite,
    fieldsSkipped: config.skippedFields,
    fieldPlans,
    blocked: false,
    warnings: operation === "NO_CHANGES" ? ["No draft field changes were detected."] : [],
    sanitizedData,
    doesWrite: operation === "UPDATE_EXISTING_DRAFT" || operation === "CREATE_MISSING_LOCALIZATION",
    doesPublish: false,
  };
}
