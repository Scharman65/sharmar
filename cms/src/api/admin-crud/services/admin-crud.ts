import { randomBytes } from "node:crypto";

type AdminCrudEntity = "owner" | "document" | "boat" | "experience" | "media";
type AdminCrudAction =
  | "create"
  | "update"
  | "attach_document"
  | "replace_document"
  | "unlink_document"
  | "unpublish"
  | "archive"
  | "restore"
  | "delete";

type JsonObject = Record<string, unknown>;

type CrudInput = {
  action?: AdminCrudAction;
  fields?: JsonObject;
  expectedUpdatedAt?: string | null;
  idempotencyKey?: string | null;
  changedFieldNames?: string[];
  actor?: string;
  confirmationPhrase?: string | null;
};

const ARCHIVE_SCHEMA_DECISION_REQUIRED = false;
const OWNER_ACCOUNT_CREATION_DECISION_REQUIRED = false;
const DOCUMENT_REQUIREMENT_DECISION = "PASSPORT_OR_ID";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ENTITY_CONFIG = {
  owner: {
    uid: "api::owner-profile.owner-profile",
    idKind: "numeric",
    confirmationPhrase: "УДАЛИТЬ ВЛАДЕЛЬЦА",
    fields: [
      "name",
      "email",
      "first_name",
      "last_name",
      "phone",
      "whatsapp_number",
      "country",
      "preferred_language",
      "company_name",
      "notes",
      "moderation_notes",
    ],
  },
  document: {
    uid: "plugin::upload.file",
    idKind: "numeric",
    confirmationPhrase: "УДАЛИТЬ ДОКУМЕНТ",
    fields: ["ownerProfileId", "mediaId", "documentType", "field", "notes", "replaceExisting"],
  },
  boat: {
    uid: "api::boat.boat",
    idKind: "documentId",
    confirmationPhrase: "УДАЛИТЬ ЛОДКУ",
    fields: [
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
      "archived_at",
    ],
  },
  experience: {
    uid: "api::experience.experience",
    idKind: "documentId",
    confirmationPhrase: "УДАЛИТЬ МАРШРУТ",
    fields: [
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
      "archived_at",
    ],
  },
  media: {
    uid: "plugin::upload.file",
    idKind: "numeric",
    confirmationPhrase: "УДАЛИТЬ ФАЙЛ",
    fields: ["name", "alternativeText", "caption", "folder", "entityType", "entityDocumentId", "relationField", "mediaId"],
  },
} satisfies Record<AdminCrudEntity, {
  uid: string;
  idKind: "numeric" | "documentId";
  confirmationPhrase: string;
  fields: string[];
}>;

const ENTITY_TYPES = new Set(Object.keys(ENTITY_CONFIG));
const DOCUMENT_FIELDS = new Set(["passport_document", "identity_document", "license_document"]);
const SENSITIVE_FIELD = /password|token|secret|cookie|authorization|email|phone|whatsapp/i;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asEntity(value: unknown): AdminCrudEntity | null {
  return typeof value === "string" && ENTITY_TYPES.has(value) ? value as AdminCrudEntity : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function cleanActor(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : "sharmar-admin";
}

function rawRows(result: unknown): JsonObject[] {
  if (isRecord(result) && Array.isArray(result.rows)) return result.rows.filter(isRecord);
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0].filter(isRecord);
  return [];
}

function pickAllowed(entity: AdminCrudEntity, fields: unknown): { ok: true; data: JsonObject; changedFieldNames: string[] } | { ok: false; code: string; fields?: string[] } {
  if (!isRecord(fields)) return { ok: false, code: "invalid_fields" };
  const allowed = new Set(ENTITY_CONFIG[entity].fields);
  const denied = Object.keys(fields).filter((field) => !allowed.has(field));
  if (denied.length) return { ok: false, code: "field_not_allowed", fields: denied.sort() };
  return {
    ok: true,
    data: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
    changedFieldNames: Object.keys(fields).filter((field) => !SENSITIVE_FIELD.test(field)).sort(),
  };
}

function normalizeInput(input: unknown, fallbackAction: AdminCrudAction): { ok: true; input: CrudInput & { action: AdminCrudAction; fields: JsonObject; actor: string } } | { ok: false; status: number; body: JsonObject } {
  if (!isRecord(input)) return { ok: false, status: 400, body: { ok: false, code: "invalid_payload" } };
  const action = asString(input.action) ?? fallbackAction;
  if (!["create", "update", "attach_document", "replace_document", "unlink_document", "unpublish", "archive", "restore", "delete"].includes(action)) {
    return { ok: false, status: 400, body: { ok: false, code: "invalid_action" } };
  }
  return {
    ok: true,
    input: {
      ...input,
      action: action as AdminCrudAction,
      fields: isRecord(input.fields) ? input.fields : {},
      actor: cleanActor(input.actor),
      expectedUpdatedAt: asString(input.expectedUpdatedAt),
      idempotencyKey: asString(input.idempotencyKey),
      confirmationPhrase: asString(input.confirmationPhrase),
    },
  };
}

function staleVersionMatches(row: JsonObject | null, expectedUpdatedAt: string | null | undefined): boolean {
  if (!expectedUpdatedAt) return false;
  const current = asString(row?.updatedAt ?? row?.updated_at);
  return Boolean(current && current === expectedUpdatedAt);
}

function buildModerationUpdate(entity: AdminCrudEntity, action: AdminCrudAction, fields: JsonObject): JsonObject {
  const data = { ...fields };
  if ((entity === "owner" || entity === "boat" || entity === "experience") && action === "archive") {
    data.archived_at = new Date().toISOString();
  }
  if ((entity === "owner" || entity === "boat" || entity === "experience") && action === "restore") {
    data.archived_at = null;
  }
  if (entity === "experience" && action === "unpublish") {
    data.is_active = false;
  }
  return data;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

function ownerNameParts(fields: JsonObject): { firstName: string; lastName: string } | null {
  const explicitFirst = asString(fields.first_name);
  const explicitLast = asString(fields.last_name);
  if (explicitFirst && explicitLast) return { firstName: explicitFirst, lastName: explicitLast };
  const name = asString(fields.name);
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || "Owner",
  };
}

function preferredLanguage(value: unknown): "en" | "ru" | "me" {
  return value === "ru" || value === "me" || value === "en" ? value : "en";
}

function generateTemporaryPassword(): string {
  return randomBytes(24).toString("base64url");
}

async function hashPassword(password: string): Promise<string> {
  const userService = strapi.plugin("users-permissions").service("user");
  const values = await userService.ensureHashedPasswords({ password });
  return values.password;
}

function documentField(value: unknown): "passport_document" | "identity_document" | null {
  if (value === "passport_document" || value === "passport") return "passport_document";
  if (value === "identity_document" || value === "identity") return "identity_document";
  return null;
}

function mediaRelationField(entityType: unknown, field: unknown): string | null {
  if (entityType === "boat" && (field === "cover" || field === "images")) return field;
  if (entityType === "experience" && (field === "cover" || field === "gallery")) return field;
  return null;
}

async function unlinkMediaRelation(trx: any, fileId: number, relatedId: number, relatedType: string, field: string) {
  await trx.raw(
    `
    delete from public.files_related_mph
    where file_id = ?
      and related_id = ?
      and related_type = ?
      and field = ?
    `,
    [fileId, relatedId, relatedType, field]
  );
}

async function attachMediaRelation(trx: any, fileId: number, relatedId: number, relatedType: string, field: string) {
  await trx.raw(
    `
    delete from public.files_related_mph
    where related_id = ?
      and related_type = ?
      and field = ?
      and field in ('passport_document', 'identity_document', 'cover')
    `,
    [relatedId, relatedType, field]
  );
  await trx.raw(
    `
    insert into public.files_related_mph (
      file_id,
      related_id,
      related_type,
      field,
      "order"
    )
    values (?, ?, ?, ?, 1)
    `,
    [fileId, relatedId, relatedType, field]
  );
}

async function safeCount(sql: string, bindings: unknown[] = []): Promise<number | null> {
  try {
    const result = await strapi.db.connection.raw(sql, bindings);
    const value = rawRows(result)[0]?.count;
    return asNumber(value) ?? 0;
  } catch {
    return null;
  }
}

async function createAuditEvent(input: {
  entity: AdminCrudEntity;
  identifier: string | number;
  action: string;
  previousStatus: string;
  newStatus: string;
  actor: string;
  changedFieldNames?: string[];
  dependencySnapshot?: JsonObject;
  idempotencyKey?: string | null;
}) {
  const entityType = input.entity === "owner" ? "owner_profile" : input.entity === "experience" ? "boat" : input.entity;
  const metadata: JsonObject = {
    adminCrud: true,
    subjectEntityType: input.entity,
    changedFieldNames: input.changedFieldNames ?? [],
    dependencySnapshot: input.dependencySnapshot ?? {},
  };
  if (input.entity === "experience") metadata.subjectDocumentId = String(input.identifier);
  if (input.idempotencyKey) metadata.idempotencyKeyDigest = `sha256:${input.idempotencyKey.slice(0, 16)}`;

  return strapi.db.query("api::moderation-event.moderation-event").create({
    data: {
      entity_type: entityType,
      entity_document_id: typeof input.identifier === "string" ? input.identifier : null,
      entity_id: typeof input.identifier === "number" ? input.identifier : null,
      action: input.action,
      previous_status: input.previousStatus,
      new_status: input.newStatus,
      comment: null,
      actor: input.actor,
      metadata,
      occurred_at: new Date().toISOString(),
    },
  });
}

async function findOne(entity: AdminCrudEntity, id: string) {
  const config = ENTITY_CONFIG[entity];
  if (config.idKind === "numeric") {
    const numericId = asNumber(id);
    if (!numericId) return null;
    return strapi.db.query(config.uid).findOne({ where: { id: numericId } });
  }
  return strapi.db.query(config.uid).findOne({ where: { documentId: id } });
}

async function findMany(entity: AdminCrudEntity) {
  const config = ENTITY_CONFIG[entity];
  if (entity === "document") {
    const result = await strapi.db.connection.raw(
      `
      select distinct
        f.id,
        f.name,
        f.url,
        f.mime,
        f.size,
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        frm.field,
        frm.related_id as "ownerProfileId"
      from public.files f
      join public.files_related_mph frm
        on frm.file_id = f.id
      where frm.related_type = 'api::owner-profile.owner-profile'
        and frm.field in ('passport_document', 'identity_document')
      order by f.updated_at desc nulls last, f.id desc
      limit 100
      `
    );
    return rawRows(result);
  }
  if (entity === "media") {
    const result = await strapi.db.connection.raw(
      `
      select distinct
        f.id,
        f.name,
        f.url,
        f.mime,
        f.size,
        f.created_at as "createdAt",
        f.updated_at as "updatedAt"
      from public.files f
      where not exists (
        select 1
        from public.files_related_mph frm
        where frm.file_id = f.id
          and frm.related_type = 'api::owner-profile.owner-profile'
          and frm.field in ('passport_document', 'identity_document', 'license_document')
      )
      order by f.updated_at desc nulls last, f.id desc
      limit 100
      `
    );
    return rawRows(result);
  }
  return strapi.db.query(config.uid).findMany({
    orderBy: { updatedAt: "desc" },
    limit: 100,
  });
}

async function mediaUsageCount(fileId: number): Promise<number | null> {
  return safeCount(
    "select count(*)::int as count from public.files_related_mph where file_id = ?",
    [fileId]
  );
}

async function evaluateDependencies(entity: AdminCrudEntity, id: string) {
  const blockingReasons: string[] = [];
  const dependentCounts: JsonObject = {};
  let financialDependency = false;
  let publishedDependency = false;
  let sharedMediaCount = 0;

  if (entity === "owner") {
    const profileId = asNumber(id);
    const userRows = profileId ? rawRows(await strapi.db.connection.raw(
      "select user_id from public.owner_profiles_user_lnk where owner_profile_id = ? limit 1",
      [profileId]
    )) : [];
    const userId = asNumber(userRows[0]?.user_id);
    dependentCounts.boats = userId ? await safeCount("select count(*)::int as count from public.boats where owner_user_id = ? or created_by_id = ?", [userId, userId]) : null;
    dependentCounts.bookingRequests = userId ? await safeCount("select count(*)::int as count from public.booking_requests where owner_user_id = ?", [userId]) : null;
    dependentCounts.payments = await safeCount("select count(*)::int as count from public.payments");
    dependentCounts.dodoEvents = await safeCount("select count(*)::int as count from public.dodo_events");
  }

  if (entity === "boat") {
    dependentCounts.routes = await safeCount("select count(*)::int as count from public.experiences where document_id in (select e.document_id from public.experiences e join public.experiences_boat_lnk l on l.experience_id = e.id join public.boats b on b.id = l.boat_id where b.document_id = ?)", [id]);
    dependentCounts.bookingRequests = await safeCount("select count(*)::int as count from public.booking_requests_boat_lnk l join public.boats b on b.id = l.boat_id where b.document_id = ?", [id]);
    dependentCounts.payments = await safeCount("select count(*)::int as count from public.payments p join public.booking_requests br on br.id = p.booking_request_id join public.booking_requests_boat_lnk l on l.booking_request_id = br.id join public.boats b on b.id = l.boat_id where b.document_id = ?", [id]);
    dependentCounts.availability = await safeCount("select count(*)::int as count from public.boat_blackouts bb join public.boats b on b.id = bb.boat_id where b.document_id = ?", [id]);
  }

  if (entity === "experience") {
    dependentCounts.bookingRequests = await safeCount("select count(*)::int as count from public.booking_requests_experience_lnk l join public.experiences e on e.id = l.experience_id where e.document_id = ?", [id]);
    dependentCounts.payments = await safeCount("select count(*)::int as count from public.payments p join public.booking_requests br on br.id = p.booking_request_id join public.booking_requests_experience_lnk l on l.booking_request_id = br.id join public.experiences e on e.id = l.experience_id where e.document_id = ?", [id]);
  }

  if (entity === "document" || entity === "media") {
    const fileId = asNumber(id);
    dependentCounts.usage = fileId ? await mediaUsageCount(fileId) : null;
    sharedMediaCount = Math.max(0, Number(dependentCounts.usage ?? 0) - 1);
  }

  for (const [key, value] of Object.entries(dependentCounts)) {
    if (value === null) blockingReasons.push(`${key}_dependency_unknown`);
    if (typeof value === "number" && value > 0 && ["bookingRequests", "payments", "dodoEvents"].includes(key)) {
      financialDependency = true;
      blockingReasons.push(`${key}_present`);
    }
    if (typeof value === "number" && value > 0 && ["routes", "availability"].includes(key)) {
      blockingReasons.push(`${key}_present`);
    }
  }

  if (sharedMediaCount > 0) blockingReasons.push("shared_media_present");

  const canDelete = blockingReasons.length === 0;
  const canArchive = entity === "owner" || entity === "boat" || entity === "experience";

  return {
    canDelete,
    canArchive,
    blockingReasons,
    dependentCounts,
    sharedMediaCount,
    financialDependency,
    publishedDependency,
    requiredConfirmationPhrase: ENTITY_CONFIG[entity].confirmationPhrase,
    safeDeletePlan: canDelete
      ? ["reload current state", "verify confirmation phrase", "delete explicit entity only", "create moderation event"]
      : [],
  };
}

async function validateExperienceBoat(fields: JsonObject) {
  const boatDocumentId = asString(fields.boatDocumentId);
  if (!boatDocumentId) return { ok: true };
  const boat = await strapi.db.query("api::boat.boat").findOne({
    where: { documentId: boatDocumentId },
    select: ["id", "documentId", "owner_user_id", "created_by_id"],
  });
  if (!boat) return { ok: false, code: "boat_not_found" };
  return { ok: true };
}

async function createOwner(fields: JsonObject, input: CrudInput & { action: AdminCrudAction; fields: JsonObject; actor: string }) {
  const email = normalizeEmail(fields.email);
  const names = ownerNameParts(fields);
  const whatsappNumber = asString(fields.whatsapp_number ?? fields.phone);
  if (!email || !names || !whatsappNumber) {
    return { status: 400, body: { ok: false, code: "invalid_owner_create_fields" } };
  }

  const existing = await strapi.db.connection.raw(
    "select id from public.up_users where lower(email) = lower(?) or lower(username) = lower(?) limit 1",
    [email, email]
  );
  if (existing?.rows?.length) return { status: 409, body: { ok: false, code: "duplicate_email" } };

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await hashPassword(temporaryPassword);
  const now = new Date().toISOString();

  const result = await strapi.db.connection.transaction(async (trx) => {
    const userRows = await trx.raw(
      `
      insert into public.up_users (
        document_id,
        username,
        email,
        provider,
        password,
        confirmed,
        blocked,
        must_change_password,
        created_at,
        updated_at,
        published_at
      )
      values (?, ?, ?, 'local', ?, true, false, true, ?::timestamptz, ?::timestamptz, ?::timestamptz)
      returning id, document_id as "documentId", email, username, must_change_password
      `,
      [`owner-user-${randomBytes(10).toString("hex")}`, email, email, hashedPassword, now, now, now]
    );
    const user = userRows?.rows?.[0];
    if (!user?.id) throw Object.assign(new Error("owner_user_create_failed"), { status: 500 });

    const profileRows = await trx.raw(
      `
      insert into public.owner_profiles (
        document_id,
        first_name,
        last_name,
        phone,
        whatsapp_number,
        country,
        preferred_language,
        email_verified,
        whatsapp_verified,
        verification_status,
        notes,
        session_version,
        created_at,
        updated_at,
        published_at
      )
      values (?, ?, ?, nullif(?, ''), ?, nullif(?, ''), ?, false, false, 'new', nullif(?, ''), 0, ?::timestamptz, ?::timestamptz, ?::timestamptz)
      returning id, document_id as "documentId", first_name, last_name, preferred_language, verification_status, created_at, updated_at
      `,
      [
        `owner-profile-user-${user.id}`,
        names.firstName,
        names.lastName,
        asString(fields.phone) ?? "",
        whatsappNumber,
        asString(fields.country) ?? "",
        preferredLanguage(fields.preferred_language),
        asString(fields.notes ?? fields.moderation_notes) ?? "",
        now,
        now,
        now,
      ]
    );
    const profile = profileRows?.rows?.[0];
    if (!profile?.id) throw Object.assign(new Error("owner_profile_create_failed"), { status: 500 });

    await trx.raw(
      "insert into public.owner_profiles_user_lnk (owner_profile_id, user_id) values (?, ?)",
      [profile.id, user.id]
    );

    return { user, profile };
  });

  await createAuditEvent({
    entity: "owner",
    identifier: Number(result.profile.id),
    action: "owner_created",
    previousStatus: "missing",
    newStatus: "new",
    actor: input.actor,
    changedFieldNames: ["first_name", "last_name", "preferred_language"],
    idempotencyKey: input.idempotencyKey,
  });

  return {
    status: 201,
    body: {
      ok: true,
      entity: "owner",
      row: result.profile,
      oneTimeSecret: true,
      temporaryPassword,
    },
  };
}

async function attachDocument(fields: JsonObject, input: CrudInput & { action: AdminCrudAction; fields: JsonObject; actor: string }) {
  const ownerProfileId = asNumber(fields.ownerProfileId);
  const mediaId = asNumber(fields.mediaId);
  const field = documentField(fields.field ?? fields.documentType);
  if (!ownerProfileId || !mediaId || !field) {
    return { status: 400, body: { ok: false, code: "invalid_document_attach_fields" } };
  }

  const owner = await strapi.db.query("api::owner-profile.owner-profile").findOne({ where: { id: ownerProfileId } });
  if (!owner) return { status: 404, body: { ok: false, code: "owner_profile_not_found" } };
  if (asString((owner as JsonObject).archived_at)) return { status: 409, body: { ok: false, code: "owner_archived" } };

  const previousRows = await strapi.db.connection.raw(
    `
    select file_id
    from public.files_related_mph
    where related_type = 'api::owner-profile.owner-profile'
      and related_id = ?
      and field = ?
    order by "order" asc, id asc
    `,
    [ownerProfileId, field]
  );
  const previousIds = rawRows(previousRows).map((row) => asNumber(row.file_id)).filter((id): id is number => id !== null);

  await strapi.db.connection.transaction(async (trx) => {
    await attachMediaRelation(trx, mediaId, ownerProfileId, "api::owner-profile.owner-profile", field);
    await trx.raw(
      `
      update public.owner_profiles
      set
        documents_uploaded_at = coalesce(documents_uploaded_at, now()),
        verification_status = case
          when verification_status in ('approved', 'blocked') then verification_status
          else 'documents_uploaded'
        end,
        updated_at = now()
      where id = ?
      `,
      [ownerProfileId]
    );
  });

  for (const oldId of previousIds.filter((id) => id !== mediaId)) {
    const usage = await mediaUsageCount(oldId);
    if (usage === 0) {
      const oldFile = await strapi.db.query("plugin::upload.file").findOne({ where: { id: oldId } });
      if (oldFile) await strapi.plugin("upload").service("upload").remove(oldFile);
    }
  }

  await createAuditEvent({
    entity: "document",
    identifier: mediaId,
    action: previousIds.length ? "document_replaced" : "document_added",
    previousStatus: previousIds.length ? "existing" : "missing",
    newStatus: "documents_uploaded",
    actor: input.actor,
    changedFieldNames: [field],
    idempotencyKey: input.idempotencyKey,
  });

  return { status: 200, body: { ok: true, entity: "document", attached: true, ownerProfileId, field } };
}

async function attachMedia(fields: JsonObject, input: CrudInput & { action: AdminCrudAction; fields: JsonObject; actor: string }) {
  const mediaId = asNumber(fields.mediaId);
  const entityType = asEntity(fields.entityType);
  const documentId = asString(fields.entityDocumentId);
  const relationField = mediaRelationField(fields.entityType, fields.relationField);
  if (!mediaId) return { status: 400, body: { ok: false, code: "invalid_media_id" } };
  if (!entityType || !(entityType === "boat" || entityType === "experience") || !documentId || !relationField) {
    return { status: 400, body: { ok: false, code: "invalid_media_relation" } };
  }
  const row = await strapi.db.query(ENTITY_CONFIG[entityType].uid).findOne({ where: { documentId } });
  if (!row) return { status: 404, body: { ok: false, code: "entity_not_found" } };
  const relatedId = asNumber((row as JsonObject).id);
  if (!relatedId) return { status: 409, body: { ok: false, code: "entity_id_missing" } };

  await strapi.db.connection.transaction(async (trx) => {
    await attachMediaRelation(trx, mediaId, relatedId, ENTITY_CONFIG[entityType].uid, relationField);
  });

  await createAuditEvent({
    entity: "media",
    identifier: mediaId,
    action: "media_attached",
    previousStatus: "missing",
    newStatus: "attached",
    actor: input.actor,
    changedFieldNames: [relationField],
    idempotencyKey: input.idempotencyKey,
  });

  return { status: 200, body: { ok: true, entity: "media", attached: true } };
}

export default {
  async list(entityValue: unknown) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    const rows = await findMany(entity);
    return { status: 200, body: { ok: true, entity, rows } };
  },

  async detail(entityValue: unknown, id: string) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    const row = await findOne(entity, id);
    if (!row) return { status: 404, body: { ok: false, code: "entity_not_found" } };
    return { status: 200, body: { ok: true, entity, row } };
  },

  async dependencies(entityValue: unknown, id: string) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    return { status: 200, body: { ok: true, entity, dependencies: await evaluateDependencies(entity, id) } };
  },

  async create(entityValue: unknown, rawInput: unknown) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    const normalized = normalizeInput(rawInput, "create");
    if (!normalized.ok) return normalized;
    const picked = pickAllowed(entity, normalized.input.fields);
    if (picked.ok !== true) return { status: 400, body: { ok: false, code: picked.code, fields: picked.fields } };
    if (entity === "owner") return createOwner(picked.data, normalized.input);
    if (entity === "document") return attachDocument(picked.data, normalized.input);
    if (entity === "media" && asNumber(picked.data.mediaId)) return attachMedia(picked.data, normalized.input);
    if (entity === "experience") {
      const boatCheck = await validateExperienceBoat(picked.data);
      if (!boatCheck.ok) return { status: 409, body: { ok: false, code: boatCheck.code } };
    }
    const created = await strapi.documents(ENTITY_CONFIG[entity].uid as never).create({
      data: picked.data,
      status: "draft",
    });
    const createdRecord = created as JsonObject;
    await createAuditEvent({
      entity,
      identifier: asString(createdRecord.documentId) ?? asNumber(createdRecord.id) ?? "created",
      action: "created",
      previousStatus: "missing",
      newStatus: "draft",
      actor: normalized.input.actor,
      changedFieldNames: picked.changedFieldNames,
      idempotencyKey: normalized.input.idempotencyKey,
    });
    return { status: 201, body: { ok: true, entity, row: created } };
  },

  async update(entityValue: unknown, id: string, rawInput: unknown) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    const normalized = normalizeInput(rawInput, "update");
    if (!normalized.ok) return normalized;
    if (normalized.input.action === "archive" && !(entity === "owner" || entity === "boat" || entity === "experience")) {
      return { status: 409, body: { ok: false, code: "archive_schema_decision_required", ARCHIVE_SCHEMA_DECISION_REQUIRED } };
    }
    if (normalized.input.action === "restore" && !(entity === "owner" || entity === "boat" || entity === "experience")) {
      return { status: 409, body: { ok: false, code: "archive_schema_decision_required", ARCHIVE_SCHEMA_DECISION_REQUIRED } };
    }
    if (normalized.input.action === "archive" && entity === "owner") {
      const dependencies = await evaluateDependencies(entity, id);
      const boats = Number(dependencies.dependentCounts.boats ?? 0);
      if (boats > 0 || dependencies.financialDependency) {
        return { status: 409, body: { ok: false, code: "archive_blocked_by_dependencies", dependencies } };
      }
    }
    const before = await findOne(entity, id);
    if (!before) return { status: 404, body: { ok: false, code: "entity_not_found" } };
    if (!staleVersionMatches(before, normalized.input.expectedUpdatedAt)) {
      return { status: 409, body: { ok: false, code: "stale_version" } };
    }
    const picked = pickAllowed(entity, normalized.input.fields);
    if (picked.ok !== true) return { status: 400, body: { ok: false, code: picked.code, fields: picked.fields } };
    if (entity === "experience") {
      const boatCheck = await validateExperienceBoat(picked.data);
      if (!boatCheck.ok) return { status: 409, body: { ok: false, code: boatCheck.code } };
    }
    const config = ENTITY_CONFIG[entity];
    const updateData = buildModerationUpdate(entity, normalized.input.action, picked.data);
    const row = config.idKind === "numeric"
      ? await strapi.db.query(config.uid).update({ where: { id: Number(id) }, data: updateData })
      : await strapi.documents(config.uid as never).update({ documentId: id, data: updateData });
    if ((entity === "boat" || entity === "experience") && (normalized.input.action === "unpublish" || normalized.input.action === "archive")) {
      await (strapi.documents(config.uid as never) as unknown as { unpublish: (params: { documentId: string }) => Promise<unknown> }).unpublish({ documentId: id });
    }
    await createAuditEvent({
      entity,
      identifier: config.idKind === "numeric" ? Number(id) : id,
      action: normalized.input.action === "restore" ? "restored" : normalized.input.action === "unpublish" ? "unpublished" : normalized.input.action === "archive" ? "archived" : "updated",
      previousStatus: asString((before as JsonObject).moderation_status ?? (before as JsonObject).verification_status ?? (before as JsonObject).publishedAt) ?? "existing",
      newStatus: normalized.input.action === "restore" ? "restored" : normalized.input.action === "unpublish" ? "unpublished" : normalized.input.action === "archive" ? "archived" : "updated",
      actor: normalized.input.actor,
      changedFieldNames: (normalized.input.action === "archive" || normalized.input.action === "restore")
        ? [...picked.changedFieldNames, "archived_at"]
        : normalized.input.action === "unpublish" && entity === "experience"
          ? [...picked.changedFieldNames, "is_active"]
          : picked.changedFieldNames,
      idempotencyKey: normalized.input.idempotencyKey,
    });
    return { status: 200, body: { ok: true, entity, row } };
  },

  async destroy(entityValue: unknown, id: string, rawInput: unknown) {
    const entity = asEntity(entityValue);
    if (!entity) return { status: 400, body: { ok: false, code: "invalid_entity_type" } };
    const normalized = normalizeInput(rawInput, "delete");
    if (!normalized.ok) return normalized;
    if (normalized.input.confirmationPhrase !== ENTITY_CONFIG[entity].confirmationPhrase) {
      return { status: 409, body: { ok: false, code: "confirmation_phrase_required" } };
    }
    const dependencies = await evaluateDependencies(entity, id);
    if (!dependencies.canDelete) {
      return { status: 409, body: { ok: false, code: "delete_blocked_by_dependencies", dependencies } };
    }
    const before = await findOne(entity, id);
    if (!before) return { status: 404, body: { ok: false, code: "entity_not_found" } };
    if (!staleVersionMatches(before, normalized.input.expectedUpdatedAt)) {
      return { status: 409, body: { ok: false, code: "stale_version" } };
    }
    const config = ENTITY_CONFIG[entity];
    if (entity === "document" || entity === "media") {
      const usage = await mediaUsageCount(Number(id));
      if (usage !== 0) return { status: 409, body: { ok: false, code: "media_still_used", usage } };
      await strapi.plugin("upload").service("upload").remove(before);
    } else if (config.idKind === "numeric") {
      await strapi.db.query(config.uid).delete({ where: { id: Number(id) } });
    } else {
      await strapi.documents(config.uid as never).delete({ documentId: id });
    }
    await createAuditEvent({
      entity,
      identifier: config.idKind === "numeric" ? Number(id) : id,
      action: "deleted",
      previousStatus: "existing",
      newStatus: "deleted",
      actor: normalized.input.actor,
      dependencySnapshot: dependencies,
      idempotencyKey: normalized.input.idempotencyKey,
    });
    return { status: 200, body: { ok: true, entity, deleted: true } };
  },
};
