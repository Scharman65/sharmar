export type AdminCrudEntity = "owner" | "document" | "boat" | "experience" | "media";

export type AdminCrudAction =
  | "create"
  | "update"
  | "attach_document"
  | "replace_document"
  | "unlink_document"
  | "unpublish"
  | "archive"
  | "restore"
  | "delete";

export type AdminCrudPayload = {
  action?: unknown;
  fields?: unknown;
  expectedUpdatedAt?: unknown;
  idempotencyKey?: unknown;
  confirmationPhrase?: unknown;
};

export type AdminCrudValidationResult =
  | {
      ok: true;
      action: AdminCrudAction;
      fields: Record<string, unknown>;
      changedFieldNames: string[];
      expectedUpdatedAt: string | null;
      idempotencyKey: string | null;
      confirmationPhrase: string | null;
    }
  | {
      ok: false;
      code:
        | "invalid_payload"
        | "invalid_action"
        | "invalid_fields"
        | "field_not_allowed"
        | "confirmation_phrase_required"
        | "archive_schema_decision_required"
        | "owner_account_creation_decision_required"
        | "stale_version_required";
      fields?: string[];
      expectedPhrase?: string;
    };

export const ADMIN_CRUD_ENTITIES: AdminCrudEntity[] = [
  "owner",
  "document",
  "boat",
  "experience",
  "media",
];

export const ARCHIVE_SCHEMA_DECISION_REQUIRED = true;
export const OWNER_ACCOUNT_CREATION_DECISION_REQUIRED = true;

export const ADMIN_CRUD_ROUTES = {
  owner: "/api/admin/owners",
  document: "/api/admin/documents",
  boat: "/api/admin/boats",
  experience: "/api/admin/experiences",
  media: "/api/admin/media",
} satisfies Record<AdminCrudEntity, string>;

export const REQUIRED_CONFIRMATION_PHRASES = {
  owner: "УДАЛИТЬ ВЛАДЕЛЬЦА",
  document: "УДАЛИТЬ ДОКУМЕНТ",
  boat: "УДАЛИТЬ ЛОДКУ",
  experience: "УДАЛИТЬ МАРШРУТ",
  media: "УДАЛИТЬ ФАЙЛ",
} satisfies Record<AdminCrudEntity, string>;

export const ALLOWED_ADMIN_FIELDS = {
  owner: [
    "first_name",
    "last_name",
    "phone",
    "whatsapp_number",
    "country",
    "preferred_language",
    "company_name",
    "notes",
  ],
  document: [
    "ownerProfileId",
    "mediaId",
    "documentType",
    "field",
    "notes",
  ],
  boat: [
    "title",
    "slug",
    "description",
    "listing_type",
    "vesselType",
    "propulsion",
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
    "price_per_hour",
    "price_per_day",
    "price_per_week",
    "deposit",
    "sale_price",
    "min_rental_hours",
    "instant_booking",
    "contacts_visible",
    "home_marina",
    "cover",
    "images",
    "owner_user_id",
    "owner_profile_id",
    "moderation_comment",
  ],
  experience: [
    "title",
    "slug",
    "duration_hours",
    "price",
    "currency",
    "short_description",
    "full_description",
    "included_services",
    "meeting_point",
    "max_guests",
    "sort_order",
    "is_active",
    "cover",
    "gallery",
    "boat",
    "boatDocumentId",
  ],
  media: [
    "name",
    "alternativeText",
    "caption",
    "folder",
  ],
} satisfies Record<AdminCrudEntity, string[]>;

const WRITE_ACTIONS = new Set<AdminCrudAction>([
  "create",
  "update",
  "attach_document",
  "replace_document",
  "unlink_document",
  "unpublish",
  "archive",
  "restore",
  "delete",
]);

const DESTRUCTIVE_ACTIONS = new Set<AdminCrudAction>([
  "unlink_document",
  "unpublish",
  "archive",
  "restore",
  "delete",
]);

export function isAdminCrudEntity(value: unknown): value is AdminCrudEntity {
  return typeof value === "string" && ADMIN_CRUD_ENTITIES.includes(value as AdminCrudEntity);
}

export function isAdminCrudAction(value: unknown): value is AdminCrudAction {
  return (
    value === "create" ||
    value === "update" ||
    value === "attach_document" ||
    value === "replace_document" ||
    value === "unlink_document" ||
    value === "unpublish" ||
    value === "archive" ||
    value === "restore" ||
    value === "delete"
  );
}

export function requiresModerationWrite(action: AdminCrudAction): boolean {
  return WRITE_ACTIONS.has(action);
}

export function isDestructiveAction(action: AdminCrudAction): boolean {
  return DESTRUCTIVE_ACTIONS.has(action);
}

export function archiveSupported(entity: AdminCrudEntity): boolean {
  return entity === "boat" || entity === "experience";
}

export function restoreSupported(): boolean {
  return false;
}

export function allowedFieldsForEntity(entity: AdminCrudEntity): string[] {
  return ALLOWED_ADMIN_FIELDS[entity];
}

export function sanitizeChangedFieldNames(fields: Record<string, unknown>): string[] {
  return Object.keys(fields)
    .filter((field) => !/password|token|secret|cookie|authorization|email|phone|whatsapp/i.test(field))
    .sort();
}

export function requiredConfirmationPhrase(entity: AdminCrudEntity): string {
  return REQUIRED_CONFIRMATION_PHRASES[entity];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function validateAdminCrudPayload(
  entity: AdminCrudEntity,
  raw: AdminCrudPayload,
  fallbackAction: AdminCrudAction
): AdminCrudValidationResult {
  if (!isRecord(raw)) return { ok: false, code: "invalid_payload" };

  const action = raw.action === undefined ? fallbackAction : raw.action;
  if (!isAdminCrudAction(action)) return { ok: false, code: "invalid_action" };

  if (action === "archive" && !archiveSupported(entity)) {
    return { ok: false, code: "archive_schema_decision_required" };
  }

  if (action === "restore" && !restoreSupported()) {
    return { ok: false, code: "archive_schema_decision_required" };
  }

  if (entity === "owner" && action === "create") {
    return { ok: false, code: "owner_account_creation_decision_required" };
  }

  const fields = raw.fields === undefined ? {} : raw.fields;
  if (!isRecord(fields)) return { ok: false, code: "invalid_fields" };

  const allowed = new Set(allowedFieldsForEntity(entity));
  const denied = Object.keys(fields).filter((field) => !allowed.has(field));
  if (denied.length) return { ok: false, code: "field_not_allowed", fields: denied.sort() };

  const expectedUpdatedAt = cleanString(raw.expectedUpdatedAt, 80);
  if ((action === "update" || action === "delete") && !expectedUpdatedAt) {
    return { ok: false, code: "stale_version_required" };
  }

  const confirmationPhrase = cleanString(raw.confirmationPhrase, 120);
  if (action === "delete") {
    const expectedPhrase = requiredConfirmationPhrase(entity);
    if (confirmationPhrase !== expectedPhrase) {
      return { ok: false, code: "confirmation_phrase_required", expectedPhrase };
    }
  }

  return {
    ok: true,
    action,
    fields,
    changedFieldNames: sanitizeChangedFieldNames(fields),
    expectedUpdatedAt,
    idempotencyKey: cleanString(raw.idempotencyKey, 160),
    confirmationPhrase,
  };
}
