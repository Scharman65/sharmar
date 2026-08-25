import {
  planBoatModerationTransition,
  planExperienceModerationTransition,
  planOwnerModerationTransition,
} from "./state-machine";

type JsonObject = Record<string, unknown>;
type Locale = "ru" | "en" | "sr-Latn-ME";
type EntityType = "boat" | "experience" | "owner_profile";

const REQUIRED_LOCALES: Locale[] = ["ru", "en", "sr-Latn-ME"];

type StrapiLike = {
  db: {
    query(uid: string): {
      findMany(params: unknown): Promise<unknown[]>;
      findOne(params: unknown): Promise<unknown>;
      update(params: unknown): Promise<unknown>;
      create(params: unknown): Promise<unknown>;
    };
    connection: {
      raw(sql: string, bindings?: unknown[]): Promise<unknown>;
    };
    transaction<T>(callback: () => Promise<T>): Promise<T>;
  };
  documents(uid: string): {
    update(params: unknown): Promise<unknown>;
    publish(params: unknown): Promise<unknown>;
    unpublish(params: unknown): Promise<unknown>;
  };
};

type ModerationInput = {
  entityType: EntityType;
  documentId?: string;
  profileId?: number;
  action: string;
  comment?: string;
  actor: string;
  batchOperationId?: string;
};

type BoatRow = {
  id: number;
  documentId: string;
  locale: string | null;
  publishedAt: string | null;
  title: string | null;
  slug: string | null;
  moderation_status: string | null;
  capacity: number | null;
  owner_user_id: number | null;
  created_by_id: number | null;
  home_marina?: { id?: number | null; documentId?: string | null; name?: string | null } | null;
};

type ExperienceRow = {
  id: number;
  documentId: string;
  locale: string | null;
  publishedAt: string | null;
  title: string | null;
  slug: string | null;
  duration_hours: number | null;
  price: number | null;
  currency: string | null;
  max_guests: number | null;
  is_active: boolean | null;
  updatedAt: string | null;
  boat: BoatRow | null;
};

type ModerationEventRow = {
  id: number | null;
  action: string | null;
  previous_status: string | null;
  new_status: string | null;
  occurred_at: string | null;
  metadata: JsonObject | null;
};

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function cleanComment(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

function cleanActor(value: unknown): string {
  const actor = typeof value === "string" ? value.trim() : "";
  return actor.slice(0, 160) || "sharmar-admin";
}

function rawRows(value: unknown): JsonObject[] {
  if (isRecord(value) && Array.isArray(value.rows)) {
    return value.rows.filter(isRecord);
  }

  if (Array.isArray(value) && Array.isArray(value[0])) {
    return value[0].filter(isRecord);
  }

  return [];
}

function shapeBoatRow(value: unknown): BoatRow | null {
  if (!isRecord(value)) return null;

  const id = asNumber(value.id);
  const documentId = asString(value.documentId ?? value.document_id);

  if (!id || !documentId) return null;

  return {
    id,
    documentId,
    locale: asString(value.locale),
    publishedAt: asString(value.publishedAt ?? value.published_at),
    title: asString(value.title),
    slug: asString(value.slug),
    moderation_status: asString(value.moderation_status),
    capacity: asNumber(value.capacity),
    owner_user_id: asNumber(value.owner_user_id),
    created_by_id: asNumber(value.created_by_id),
    home_marina: isRecord(value.home_marina)
      ? {
          id: asNumber(value.home_marina.id),
          documentId: asString(value.home_marina.documentId),
          name: asString(value.home_marina.name),
        }
      : null,
  };
}

async function hydrateBoatMarinasFromRelationTable(
  cms: StrapiLike,
  rows: BoatRow[]
): Promise<BoatRow[]> {
  const missingIds = rows
    .filter((row) => !(row.home_marina?.id || row.home_marina?.documentId || row.home_marina?.name))
    .map((row) => row.id)
    .filter((id): id is number => Number.isFinite(id));

  if (!missingIds.length) return rows;

  const placeholders = missingIds.map(() => "?").join(", ");
  const result = await cms.db.connection.raw(
    `
      select
        link.boat_id,
        location.id,
        location.document_id,
        location.name
      from public.boats_home_marina_lnk link
      join public.locations location
        on location.id = link.location_id
      where link.boat_id in (${placeholders})
      order by link.boat_id, link.id
    `,
    missingIds
  );

  const marinaByBoatId = new Map<
    number,
    { id: number | null; documentId: string | null; name: string | null }
  >();

  for (const value of rawRows(result)) {
    const boatId = asNumber(value.boat_id);
    if (!boatId || marinaByBoatId.has(boatId)) continue;

    marinaByBoatId.set(boatId, {
      id: asNumber(value.id),
      documentId: asString(value.document_id),
      name: asString(value.name),
    });
  }

  return rows.map((row) => {
    if (row.home_marina?.id || row.home_marina?.documentId || row.home_marina?.name) return row;
    const fallback = marinaByBoatId.get(row.id);
    return fallback ? { ...row, home_marina: fallback } : row;
  });
}

function shapeExperienceRow(value: unknown): ExperienceRow | null {
  if (!isRecord(value)) return null;

  const id = asNumber(value.id);
  const documentId = asString(value.documentId ?? value.document_id);

  if (!id || !documentId) return null;

  return {
    id,
    documentId,
    locale: asString(value.locale),
    publishedAt: asString(value.publishedAt ?? value.published_at),
    title: asString(value.title),
    slug: asString(value.slug),
    duration_hours: asNumber(value.duration_hours),
    price: asNumber(value.price),
    currency: asString(value.currency),
    max_guests: asNumber(value.max_guests),
    is_active: asBoolean(value.is_active),
    updatedAt: asString(value.updatedAt ?? value.updated_at),
    boat: shapeBoatRow(value.boat),
  };
}

function shapeModerationEvent(value: unknown): ModerationEventRow | null {
  if (!isRecord(value)) return null;

  return {
    id: asNumber(value.id),
    action: asString(value.action),
    previous_status: asString(value.previous_status),
    new_status: asString(value.new_status),
    occurred_at: asString(value.occurred_at),
    metadata: isRecord(value.metadata) ? value.metadata : null,
  };
}

function isExperienceModerationEvent(
  event: ModerationEventRow,
  documentId: string
): boolean {
  return (
    event.metadata?.subjectEntityType === "experience" &&
    event.metadata?.subjectDocumentId === documentId
  );
}

function uniqueLocales(rows: Array<{ locale: string | null }>): Locale[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.locale)
        .filter(
          (locale): locale is Locale =>
            locale === "ru" ||
            locale === "en" ||
            locale === "sr-Latn-ME"
        )
    )
  );
}

function missingPublishLocales(rows: Array<{ locale: string | null }>): Locale[] {
  const locales = new Set(uniqueLocales(rows));

  return REQUIRED_LOCALES.filter((locale) => !locales.has(locale));
}

function incompletePublishLocales(rows: BoatRow[]): Locale[] {
  return REQUIRED_LOCALES.filter((locale) => {
    const row = rows.find((candidate) => candidate.locale === locale);
    return !row?.title || !row?.slug;
  });
}

async function ownerProfileForUser(
  cms: StrapiLike,
  userId: number
): Promise<{ id: number; verificationStatus: string | null } | null> {
  const result = await cms.db.connection.raw(
    `
    select
      op.id,
      op.verification_status
    from public.owner_profiles op
    inner join public.owner_profiles_user_lnk link
      on link.owner_profile_id = op.id
    where link.user_id = ?
    order by op.id desc
    limit 1
    `,
    [userId]
  );

  const row = rawRows(result)[0];
  const id = row ? asNumber(row.id) : null;

  if (!row || !id) return null;

  return {
    id,
    verificationStatus: asString(row.verification_status),
  };
}

async function boatMediaCount(
  cms: StrapiLike,
  boatIds: number[]
): Promise<number> {
  if (!boatIds.length) return 0;

  const result = await cms.db.connection.raw(
    `
    select count(distinct relation.file_id)::int as count
    from public.files_related_mph relation
    where
      relation.related_type = 'api::boat.boat'
      and relation.related_id = any(?::int[])
      and relation.field in ('cover', 'images')
    `,
    [boatIds]
  );

  return asNumber(rawRows(result)[0]?.count) ?? 0;
}

async function ownerDocumentCount(
  cms: StrapiLike,
  profileId: number
): Promise<number> {
  const result = await cms.db.connection.raw(
    `
    select count(distinct relation.file_id)::int as count
    from public.files_related_mph relation
    where
      relation.related_type = 'api::owner-profile.owner-profile'
      and relation.related_id = ?
      and relation.field in (
        'passport_document',
        'identity_document',
        'license_document'
      )
    `,
    [profileId]
  );

  return asNumber(rawRows(result)[0]?.count) ?? 0;
}

async function experienceMediaCount(
  cms: StrapiLike,
  experienceIds: number[]
): Promise<number> {
  if (!experienceIds.length) return 0;

  const result = await cms.db.connection.raw(
    `
    select count(distinct relation.file_id)::int as count
    from public.files_related_mph relation
    where
      relation.related_type = 'api::experience.experience'
      and relation.related_id = any(?::int[])
      and relation.field in ('cover', 'gallery')
    `,
    [experienceIds]
  );

  return asNumber(rawRows(result)[0]?.count) ?? 0;
}

async function createAuditEvent(
  cms: StrapiLike,
  input: {
    entityType: EntityType;
    entityDocumentId?: string | null;
    entityId?: number | null;
    action: string;
    previousStatus: string;
    newStatus: string;
    comment: string;
    actor: string;
    metadata?: JsonObject;
  }
) {
  return cms.db.query("api::moderation-event.moderation-event").create({
    data: {
      entity_type: input.entityType,
      entity_document_id: input.entityDocumentId ?? null,
      entity_id: input.entityId ?? null,
      action: input.action,
      previous_status: input.previousStatus,
      new_status: input.newStatus,
      comment: input.comment || null,
      actor: input.actor,
      metadata: input.metadata ?? {},
      occurred_at: new Date().toISOString(),
    },
  });
}

async function updateBoatSharedFields(
  cms: StrapiLike,
  documentId: string,
  locales: Locale[],
  data: JsonObject
) {
  const targetLocales = locales.length ? locales : ["en"];

  for (const locale of targetLocales) {
    await cms.documents("api::boat.boat").update({
      documentId,
      locale,
      data,
    });
  }
}

async function updateExperienceSharedFields(
  cms: StrapiLike,
  documentId: string,
  locales: Locale[],
  data: JsonObject
) {
  const targetLocales = locales.length ? locales : ["en"];

  for (const locale of targetLocales) {
    await cms.documents("api::experience.experience").update({
      documentId,
      locale,
      data,
    });
  }
}

async function loadBoatRows(
  cms: StrapiLike,
  documentId: string
): Promise<BoatRow[]> {
  const rows = await cms.db.query("api::boat.boat").findMany({
    where: { documentId },
    select: [
      "id",
      "documentId",
      "locale",
      "publishedAt",
      "title",
      "slug",
      "moderation_status",
      "capacity",
      "owner_user_id",
      "created_by_id",
    ],
    populate: {
      home_marina: {
        select: ["id", "documentId", "name"],
      },
    },
    limit: 100,
  });

  const shapedRows = (Array.isArray(rows) ? rows : [])
    .map(shapeBoatRow)
    .filter((row): row is BoatRow => Boolean(row));

  return hydrateBoatMarinasFromRelationTable(cms, shapedRows);
}

async function loadLinkedExperienceRows(
  cms: StrapiLike,
  boatRows: BoatRow[]
): Promise<ExperienceRow[]> {
  const boatIds = boatRows.map((row) => row.id).filter(Boolean);
  if (!boatIds.length) return [];

  const linkedRows = await cms.db.query("api::experience.experience").findMany({
    where: {
      boat: {
        id: {
          $in: boatIds,
        },
      },
    },
    select: ["documentId"],
    populate: {
      boat: {
        select: [
          "id",
          "documentId",
          "locale",
          "publishedAt",
          "title",
          "slug",
          "moderation_status",
          "capacity",
          "owner_user_id",
          "created_by_id",
        ],
      },
    },
    limit: 100,
  });

  const documentIds = Array.from(new Set(
    (Array.isArray(linkedRows) ? linkedRows : [])
      .map((row) => asString(isRecord(row) ? row.documentId : null))
      .filter((documentId): documentId is string => Boolean(documentId))
  ));

  if (!documentIds.length) return [];

  const allRows = await cms.db.query("api::experience.experience").findMany({
    where: {
      documentId: {
        $in: documentIds,
      },
    },
    select: [
      "id",
      "documentId",
      "locale",
      "publishedAt",
      "title",
      "slug",
      "duration_hours",
      "price",
      "currency",
      "max_guests",
      "is_active",
      "updatedAt",
    ],
    populate: {
      boat: {
        select: [
          "id",
          "documentId",
          "locale",
          "publishedAt",
          "title",
          "slug",
          "moderation_status",
          "capacity",
          "owner_user_id",
          "created_by_id",
        ],
      },
    },
    limit: 300,
  });

  return (Array.isArray(allRows) ? allRows : [])
    .map(shapeExperienceRow)
    .filter((row): row is ExperienceRow => Boolean(row));
}

async function loadExperienceRows(
  cms: StrapiLike,
  documentId: string
): Promise<ExperienceRow[]> {
  const rows = await cms.db.query("api::experience.experience").findMany({
    where: { documentId },
    select: [
      "id",
      "documentId",
      "locale",
      "publishedAt",
      "title",
      "slug",
      "duration_hours",
      "price",
      "currency",
      "max_guests",
      "is_active",
      "updatedAt",
    ],
    populate: {
      boat: {
        select: [
          "id",
          "documentId",
          "locale",
          "publishedAt",
          "title",
          "slug",
          "moderation_status",
          "capacity",
          "owner_user_id",
          "created_by_id",
        ],
      },
    },
    limit: 100,
  });

  return (Array.isArray(rows) ? rows : [])
    .map(shapeExperienceRow)
    .filter((row): row is ExperienceRow => Boolean(row));
}

async function latestExperienceEvent(
  cms: StrapiLike,
  documentId: string
): Promise<ModerationEventRow | null> {
  // Keep Experience audit events compatible with the existing moderation-event
  // enum by anchoring them to the linked boat and storing the real subject in
  // metadata.
  const events = await cms.db
    .query("api::moderation-event.moderation-event")
    .findMany({
      where: {
        entity_type: "boat",
      },
      select: [
        "id",
        "action",
        "previous_status",
        "new_status",
        "occurred_at",
        "metadata",
      ],
      orderBy: { occurred_at: "desc" },
      limit: 200,
    });

  return (Array.isArray(events) ? events : [])
    .map(shapeModerationEvent)
    .find((event): event is ModerationEventRow =>
      Boolean(event && isExperienceModerationEvent(event, documentId))
    ) ?? null;
}

function maxUpdatedAt(rows: ExperienceRow[]): string | null {
  return rows
    .map((row) => row.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function experienceCurrentStatus(
  rows: ExperienceRow[],
  latestEvent: ModerationEventRow | null
): string {
  if (rows.some((row) => row.publishedAt)) {
    return "published";
  }

  const latestStatus = latestEvent?.new_status || null;
  if (latestStatus === "approved") {
    const updatedAt = maxUpdatedAt(rows);
    if (updatedAt && latestEvent?.occurred_at && updatedAt > latestEvent.occurred_at) {
      return "submitted";
    }
  }

  return latestStatus || "submitted";
}

function incompleteExperiencePublishLocales(rows: ExperienceRow[]): Locale[] {
  return REQUIRED_LOCALES.filter((locale) => {
    const row = rows.find((candidate) => candidate.locale === locale);
    return (
      !row?.title ||
      !row?.slug ||
      row.duration_hours === null ||
      row.duration_hours <= 0 ||
      row.price === null ||
      row.price <= 0 ||
      row.currency !== "EUR"
    );
  });
}

function experienceGuestCapacityBlocker(
  rows: ExperienceRow[]
): string | null {
  if (
    rows.some(
      (row) =>
        row.max_guests === null ||
        !Number.isInteger(row.max_guests) ||
        row.max_guests < 1
    )
  ) {
    return "route_max_guests_required";
  }

  if (
    rows.some(
      (row) =>
        row.boat?.capacity === null ||
        row.boat?.capacity === undefined ||
        !Number.isInteger(row.boat.capacity) ||
        row.boat.capacity < 1
    )
  ) {
    return "route_boat_capacity_required";
  }

  if (
    rows.some(
      (row) =>
        row.max_guests !== null &&
        row.boat?.capacity !== null &&
        row.boat?.capacity !== undefined &&
        row.max_guests > row.boat.capacity
    )
  ) {
    return "route_max_guests_exceeds_boat_capacity";
  }

  return null;
}

async function linkedBoatReadyForExperiencePublish(
  cms: StrapiLike,
  boatDocumentId: string
): Promise<{ ok: true; ownerUserId: number } | { ok: false; code: string; metadata?: JsonObject }> {
  const rows = await loadBoatRows(cms, boatDocumentId);

  if (!rows.length) {
    return { ok: false, code: "boat_not_found" };
  }

  const ownerUserId =
    rows[0]?.owner_user_id ??
    rows[0]?.created_by_id ??
    null;

  if (!ownerUserId) {
    return { ok: false, code: "boat_owner_missing" };
  }

  const ownerProfile = await ownerProfileForUser(cms, ownerUserId);
  if (!ownerProfile || ownerProfile.verificationStatus !== "approved") {
    return {
      ok: false,
      code: "owner_not_approved",
      metadata: {
        ownerProfileId: ownerProfile?.id ?? null,
        ownerVerificationStatus: ownerProfile?.verificationStatus ?? null,
      },
    };
  }

  const boatPublished = rows.some(
    (row) => row.publishedAt && row.moderation_status === "published"
  );

  if (!boatPublished) {
    return { ok: false, code: "linked_boat_not_published" };
  }

  return { ok: true, ownerUserId };
}

function duplicateLocales(rows: Array<{ locale: string | null; publishedAt?: string | null }>): Locale[] {
  return REQUIRED_LOCALES.filter((locale) => {
    const localeRows = rows.filter((row) => row.locale === locale);
    const drafts = localeRows.filter((row) => !row.publishedAt);
    const published = localeRows.filter((row) => row.publishedAt);
    return drafts.length > 1 || published.length > 1;
  });
}

function publishableStatus(status: string | null, publishedAt: string | null): boolean {
  const current = status || (publishedAt ? "published" : null);
  return current === "submitted" ||
    current === "under_review" ||
    current === "approved" ||
    current === "published";
}

function byDocument<T extends { documentId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    grouped.set(row.documentId, [...(grouped.get(row.documentId) ?? []), row]);
  }
  return grouped;
}

async function planUnifiedBoatPublication(
  cms: StrapiLike,
  documentId: string
) {
  const boatRows = await loadBoatRows(cms, documentId);
  const blockers: string[] = [];

  if (!boatRows.length) {
    return { ok: false as const, status: 404, body: { ok: false, code: "boat_not_found", blockers } };
  }

  const missingBoatLocales = missingPublishLocales(boatRows);
  const incompleteBoatLocales = incompletePublishLocales(boatRows);
  const duplicateBoatLocales = duplicateLocales(boatRows);
  if (missingBoatLocales.length) blockers.push("required_boat_locales_missing");
  if (incompleteBoatLocales.length) blockers.push("required_boat_locales_incomplete");
  if (duplicateBoatLocales.length) blockers.push("duplicate_boat_localizations");
  if (!boatRows.every((row) => publishableStatus(row.moderation_status, row.publishedAt))) {
    blockers.push("boat_moderation_state_blocks_publication");
  }

  const ownerUserId = boatRows[0]?.owner_user_id ?? boatRows[0]?.created_by_id ?? null;
  if (!ownerUserId) blockers.push("boat_owner_missing");

  let ownerProfile: { id: number; verificationStatus: string | null } | null = null;
  if (ownerUserId) {
    ownerProfile = await ownerProfileForUser(cms, ownerUserId);
    if (!ownerProfile || ownerProfile.verificationStatus !== "approved") {
      blockers.push("owner_not_approved");
    } else {
      const documentCount = await ownerDocumentCount(cms, ownerProfile.id);
      if (documentCount < 1) blockers.push("owner_document_required");
    }
  }

  const mediaCount = await boatMediaCount(cms, boatRows.map((row) => row.id));
  if (mediaCount < 1) blockers.push("boat_media_required");
  if (!boatRows.some((row) => row.home_marina?.id || row.home_marina?.documentId || row.home_marina?.name)) {
    blockers.push("marina_required");
  }

  const experienceRows = await loadLinkedExperienceRows(cms, boatRows);
  const experienceGroups = byDocument(experienceRows);
  if (!experienceGroups.size) blockers.push("linked_routes_required");

  const experiencePlans: Array<{
    documentId: string;
    rows: ExperienceRow[];
    missingLocales: Locale[];
    incompleteLocales: Locale[];
    duplicateLocales: Locale[];
  }> = [];

  for (const [experienceDocumentId, rows] of experienceGroups) {
    const latestEvent = await latestExperienceEvent(cms, experienceDocumentId);
    const currentStatus = experienceCurrentStatus(rows, latestEvent);
    const missingLocales = missingPublishLocales(rows);
    const incompleteLocales = incompleteExperiencePublishLocales(rows);
    const duplicateRouteLocales = duplicateLocales(rows);
    if (missingLocales.length) blockers.push(`route_required_locales_missing:${experienceDocumentId}`);
    if (incompleteLocales.length) blockers.push(`route_required_locales_incomplete:${experienceDocumentId}`);
    if (duplicateRouteLocales.length) blockers.push(`duplicate_route_localizations:${experienceDocumentId}`);
    const capacityBlocker = experienceGuestCapacityBlocker(rows);
    if (capacityBlocker) {
      blockers.push(`${capacityBlocker}:${experienceDocumentId}`);
    }
    if (!rows.every((row) => row.boat?.documentId === documentId)) {
      blockers.push(`invalid_boat_route_relation:${experienceDocumentId}`);
    }
    if (!publishableStatus(currentStatus, rows.some((row) => row.publishedAt) ? "published" : null)) {
      blockers.push(`route_moderation_state_blocks_publication:${experienceDocumentId}`);
    }
    const routeMedia = await experienceMediaCount(cms, rows.map((row) => row.id));
    if (routeMedia < 1) blockers.push(`route_media_required:${experienceDocumentId}`);
    experiencePlans.push({
      documentId: experienceDocumentId,
      rows,
      missingLocales,
      incompleteLocales,
      duplicateLocales: duplicateRouteLocales,
    });
  }

  if (blockers.length) {
    return {
      ok: false as const,
      status: 409,
      body: {
        ok: false,
        code: "unified_publication_blocked",
        blockers: Array.from(new Set(blockers)),
        missingBoatLocales,
        incompleteBoatLocales,
        duplicateBoatLocales,
      },
    };
  }

  return {
    ok: true as const,
    boatRows,
    experiencePlans,
    ownerUserId,
    ownerProfileId: ownerProfile?.id ?? null,
  };
}

async function publishUnifiedBoat(
  cms: StrapiLike,
  input: ModerationInput
) {
  const documentId = asString(input.documentId);
  if (!documentId) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "document_id_required" },
    };
  }

  const actor = cleanActor(input.actor);
  const batchOperationId = asString(input.batchOperationId) ?? `boat-publication:${documentId}:${Date.now()}`;
  const plan = await planUnifiedBoatPublication(cms, documentId);
  if (plan.ok === false) return plan;

  const now = new Date().toISOString();
  const published: Array<{ uid: string; documentId: string; locale: Locale }> = [];
  const boatWasPublished = new Set(
    plan.boatRows
      .filter((row) => row.publishedAt)
      .map((row) => row.locale)
      .filter((locale): locale is Locale => Boolean(locale))
  );
  const routeWasPublished = new Map<string, Set<string>>();
  for (const routePlan of plan.experiencePlans) {
    routeWasPublished.set(
      routePlan.documentId,
      new Set(routePlan.rows.filter((row) => row.publishedAt).map((row) => row.locale).filter(Boolean) as string[])
    );
  }

  try {
    await cms.db.transaction(async () => {
      await updateBoatSharedFields(cms, documentId, REQUIRED_LOCALES, {
        moderation_status: "published",
        moderation_comment: null,
        reviewed_by: actor,
        reviewed_at: now,
      });

      for (const locale of REQUIRED_LOCALES) {
        await cms.documents("api::boat.boat").publish({ documentId, locale });
        published.push({ uid: "api::boat.boat", documentId, locale });
      }

      for (const routePlan of plan.experiencePlans) {
        await updateExperienceSharedFields(cms, routePlan.documentId, REQUIRED_LOCALES, {
          is_active: true,
        });
        for (const locale of REQUIRED_LOCALES) {
          await cms.documents("api::experience.experience").publish({
            documentId: routePlan.documentId,
            locale,
          });
          published.push({ uid: "api::experience.experience", documentId: routePlan.documentId, locale });
        }
      }

      await createAuditEvent(cms, {
        entityType: "boat",
        entityDocumentId: documentId,
        entityId: plan.boatRows[0]?.id ?? null,
        action: "publish_logical_boat",
        previousStatus: plan.boatRows[0]?.moderation_status ?? "approved",
        newStatus: "published",
        comment: "",
        actor,
        metadata: {
          batchOperationId,
          locales: REQUIRED_LOCALES,
          ownerUserId: plan.ownerUserId,
          ownerProfileId: plan.ownerProfileId,
          routeDocumentIds: plan.experiencePlans.map((routePlan) => routePlan.documentId),
        },
      });
    });
  } catch {
    for (const item of published.reverse()) {
      const wasPublished = item.uid === "api::boat.boat"
        ? boatWasPublished.has(item.locale)
        : routeWasPublished.get(item.documentId)?.has(item.locale);
      if (wasPublished) continue;
      try {
        await cms.documents(item.uid).unpublish({
          documentId: item.documentId,
          locale: item.locale,
        });
      } catch {
        // Compensation is best-effort; the caller receives a failed batch result.
      }
    }

    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        code: "unified_publication_failed",
        message: "Unified boat publication failed and compensation was attempted.",
        batchOperationId,
      },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      code: "unified_publication_completed",
      message: "Лодка, переводы и маршруты опубликованы.",
      boatDocumentId: documentId,
      routeDocumentIds: plan.experiencePlans.map((routePlan) => routePlan.documentId),
      batchOperationId,
      doesPublish: true,
    },
  };
}

async function moderateBoat(
  cms: StrapiLike,
  input: ModerationInput
) {
  const documentId = asString(input.documentId);

  if (!documentId) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "document_id_required" },
    };
  }

  const rows = await loadBoatRows(cms, documentId);

  if (!rows.length) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, code: "boat_not_found" },
    };
  }

  const currentStatus = rows[0]?.moderation_status || "draft";
  const comment = cleanComment(input.comment);
  const actor = cleanActor(input.actor);
  const transition = planBoatModerationTransition({
    currentStatus,
    action: input.action,
    comment,
  });

  if (transition.ok !== true) {
    return {
      ok: false,
      status:
        transition.code === "comment_required"
          ? 400
          : transition.code === "transition_not_allowed"
            ? 409
            : 400,
      body: {
        ok: false,
        code: transition.code,
        currentStatus,
        action: input.action,
      },
    };
  }

  const ownerUserId =
    rows[0]?.owner_user_id ??
    rows[0]?.created_by_id ??
    null;

  if (
    (input.action === "approve" ||
      input.action === "publish") &&
    !ownerUserId
  ) {
    return {
      ok: false,
      status: 409,
      body: { ok: false, code: "boat_owner_missing" },
    };
  }

  if (
    (input.action === "approve" ||
      input.action === "publish") &&
    ownerUserId
  ) {
    const ownerProfile = await ownerProfileForUser(cms, ownerUserId);

    if (
      !ownerProfile ||
      ownerProfile.verificationStatus !== "approved"
    ) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "owner_not_approved",
          ownerProfileId: ownerProfile?.id ?? null,
          ownerVerificationStatus:
            ownerProfile?.verificationStatus ?? null,
        },
      };
    }
  }

  const locales = uniqueLocales(rows);

  if (input.action === "publish") {
    const missingLocales = missingPublishLocales(rows);
    const incompleteLocales = incompletePublishLocales(rows);

    if (missingLocales.length) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "required_locales_missing",
          missingLocales,
        },
      };
    }

    if (incompleteLocales.length) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "required_locales_incomplete",
          incompleteLocales,
        },
      };
    }

    const mediaCount = await boatMediaCount(
      cms,
      rows.map((row) => row.id)
    );

    if (mediaCount < 1) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "boat_media_required",
        },
      };
    }
  }

  const now = new Date().toISOString();

  const updateData: JsonObject = {
    moderation_status: transition.nextStatus,
    moderation_comment: comment || null,
    reviewed_by: actor,
    reviewed_at: now,
  };

  if (input.action === "start_review") {
    updateData.moderation_comment = null;
  }

  await cms.db.transaction(async () => {
    if (
      input.action === "unpublish" ||
      (input.action === "archive" &&
        currentStatus === "published")
    ) {
      for (const locale of locales) {
        await cms.documents("api::boat.boat").unpublish({
          documentId,
          locale,
        });
      }
    }

    if (input.action === "publish") {
      // Strapi copies the current draft into the published row.
      // Store the final moderation state before publish() so both rows match.
      await updateBoatSharedFields(
        cms,
        documentId,
        locales,
        updateData
      );

      for (const locale of REQUIRED_LOCALES) {
        await cms.documents("api::boat.boat").publish({
          documentId,
          locale,
        });
      }
    } else {
      await updateBoatSharedFields(
        cms,
        documentId,
        locales,
        updateData
      );
    }

    await createAuditEvent(cms, {
      entityType: "boat",
      entityDocumentId: documentId,
      entityId: rows[0]?.id ?? null,
      action: input.action,
      previousStatus: currentStatus,
      newStatus: transition.nextStatus,
      comment,
      actor,
      metadata: {
        locales,
        ownerUserId,
      },
    });
  });

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      entityType: "boat",
      documentId,
      action: input.action,
      previousStatus: currentStatus,
      moderationStatus: transition.nextStatus,
      comment: comment || null,
      reviewedAt: now,
      reviewedBy: actor,
    },
  };
}

async function moderateExperience(
  cms: StrapiLike,
  input: ModerationInput
) {
  const documentId = asString(input.documentId);

  if (!documentId) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "document_id_required" },
    };
  }

  const rows = await loadExperienceRows(cms, documentId);

  if (!rows.length) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, code: "experience_not_found" },
    };
  }

  const latestEvent = await latestExperienceEvent(cms, documentId);
  const currentStatus = experienceCurrentStatus(rows, latestEvent);
  const comment = cleanComment(input.comment);
  const actor = cleanActor(input.actor);
  const transition = planExperienceModerationTransition({
    currentStatus,
    action: input.action,
    comment,
  });

  if (transition.ok !== true) {
    return {
      ok: false,
      status:
        transition.code === "comment_required"
          ? 400
          : transition.code === "transition_not_allowed"
            ? 409
            : 400,
      body: {
        ok: false,
        code: transition.code,
        currentStatus,
        action: input.action,
      },
    };
  }

  const locales = uniqueLocales(rows);
  const linkedBoat = rows.find((row) => row.boat)?.boat ?? null;
  const linkedBoatDocumentId = linkedBoat?.documentId ?? null;

  if (
    (input.action === "approve" ||
      input.action === "publish") &&
    !linkedBoatDocumentId
  ) {
    return {
      ok: false,
      status: 409,
      body: { ok: false, code: "experience_boat_required" },
    };
  }

  if (input.action === "approve" || input.action === "publish") {
    const capacityBlocker = experienceGuestCapacityBlocker(rows);

    if (capacityBlocker) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: capacityBlocker,
        },
      };
    }
  }

  let ownerUserId: number | null =
    linkedBoat?.owner_user_id ??
    linkedBoat?.created_by_id ??
    null;

  if (
    (input.action === "approve" ||
      input.action === "publish") &&
    linkedBoatDocumentId
  ) {
    const boatReady = await linkedBoatReadyForExperiencePublish(
      cms,
      linkedBoatDocumentId
    );

    if (boatReady.ok === false && input.action === "publish") {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: boatReady.code,
          ...(boatReady.metadata ?? {}),
        },
      };
    }

    if (boatReady.ok === false && input.action === "approve") {
      if (boatReady.code === "boat_not_found" || boatReady.code === "boat_owner_missing") {
        return {
          ok: false,
          status: 409,
          body: { ok: false, code: boatReady.code },
        };
      }
    }

    if (boatReady.ok === true) {
      ownerUserId = boatReady.ownerUserId;
    } else if (ownerUserId) {
      const ownerProfile = await ownerProfileForUser(cms, ownerUserId);
      if (!ownerProfile || ownerProfile.verificationStatus !== "approved") {
        return {
          ok: false,
          status: 409,
          body: {
            ok: false,
            code: "owner_not_approved",
            ownerProfileId: ownerProfile?.id ?? null,
            ownerVerificationStatus:
              ownerProfile?.verificationStatus ?? null,
          },
        };
      }
    }
  }

  if (input.action === "publish") {
    const missingLocales = missingPublishLocales(rows);
    const incompleteLocales = incompleteExperiencePublishLocales(rows);

    if (currentStatus !== "approved") {
      return {
        ok: false,
        status: 409,
        body: { ok: false, code: "experience_not_approved" },
      };
    }

    if (missingLocales.length) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "required_locales_missing",
          missingLocales,
        },
      };
    }

    if (incompleteLocales.length) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "required_locales_incomplete",
          incompleteLocales,
        },
      };
    }
  }

  const now = new Date().toISOString();
  const updateData: JsonObject = {
    is_active: input.action === "publish",
  };

  if (
    input.action === "reject" ||
    input.action === "request_changes" ||
    input.action === "archive" ||
    input.action === "unpublish"
  ) {
    updateData.is_active = false;
  }

  await cms.db.transaction(async () => {
    if (
      input.action === "unpublish" ||
      (input.action === "archive" &&
        currentStatus === "published")
    ) {
      for (const locale of locales) {
        await cms.documents("api::experience.experience").unpublish({
          documentId,
          locale,
        });
      }
    }

    await updateExperienceSharedFields(
      cms,
      documentId,
      locales,
      updateData
    );

    if (input.action === "publish") {
      for (const locale of REQUIRED_LOCALES) {
        await cms.documents("api::experience.experience").publish({
          documentId,
          locale,
        });
      }
    }

    await createAuditEvent(cms, {
      entityType: "boat",
      entityDocumentId: linkedBoatDocumentId,
      entityId: linkedBoat?.id ?? null,
      action: input.action,
      previousStatus: currentStatus,
      newStatus: transition.nextStatus,
      comment,
      actor,
      metadata: {
        subjectEntityType: "experience",
        subjectDocumentId: documentId,
        subjectId: rows[0]?.id ?? null,
        locales,
        boatDocumentId: linkedBoatDocumentId,
        ownerUserId,
      },
    });
  });

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      entityType: "experience",
      documentId,
      action: input.action,
      previousStatus: currentStatus,
      moderationStatus: transition.nextStatus,
      comment: comment || null,
      reviewedAt: now,
      reviewedBy: actor,
      boatDocumentId: linkedBoatDocumentId,
    },
  };
}

async function moderateOwner(
  cms: StrapiLike,
  input: ModerationInput
) {
  const profileId = asNumber(input.profileId);

  if (!profileId || !Number.isInteger(profileId) || profileId <= 0) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "profile_id_required" },
    };
  }

  const rawProfile = await cms.db
    .query("api::owner-profile.owner-profile")
    .findOne({
      where: { id: profileId },
      select: [
        "id",
        "verification_status",
        "email_verified",
        "whatsapp_verified",
        "documents_uploaded_at",
        "verified_at",
        "rejected_at",
        "rejection_reason",
      ],
    });

  const profile = isRecord(rawProfile) ? rawProfile : null;

  if (!profile) {
    return {
      ok: false,
      status: 404,
      body: { ok: false, code: "owner_profile_not_found" },
    };
  }

  const currentStatus =
    asString(profile.verification_status) || "new";
  const comment = cleanComment(input.comment);
  const actor = cleanActor(input.actor);
  const transition = planOwnerModerationTransition({
    currentStatus,
    action: input.action,
    comment,
  });

  if (transition.ok !== true) {
    return {
      ok: false,
      status:
        transition.code === "comment_required"
          ? 400
          : transition.code === "transition_not_allowed"
            ? 409
            : 400,
      body: {
        ok: false,
        code: transition.code,
        currentStatus,
        action: input.action,
      },
    };
  }

  if (
    input.action === "start_review" ||
    input.action === "approve" ||
    input.action === "verify"
  ) {
    if (asBoolean(profile.email_verified) !== true) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "owner_email_not_verified",
        },
      };
    }

    if (asBoolean(profile.whatsapp_verified) !== true) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "owner_whatsapp_not_verified",
        },
      };
    }

    const documents = await ownerDocumentCount(cms, profileId);

    if (documents < 1) {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          code: "owner_document_required",
        },
      };
    }
  }

  const now = new Date().toISOString();
  const data: JsonObject = {
    verification_status: transition.nextStatus,
  };

  if (input.action === "verify") {
    data.verified_at = now;
  } else if (input.action === "approve") {
    data.verified_at = now;
    data.rejected_at = null;
    data.rejection_reason = null;
    data.notes = `Reviewed by ${actor}`;
  } else if (
    input.action === "reject" ||
    input.action === "request_changes" ||
    input.action === "block"
  ) {
    data.rejection_reason = comment;
    data.rejected_at =
      input.action === "reject" ? now : null;
    data.notes = `Reviewed by ${actor}`;
  } else if (input.action === "start_review") {
    data.rejected_at = null;
    data.rejection_reason = null;
    data.notes = `Review started by ${actor}`;
  }

  await cms.db.transaction(async () => {
    await cms.db
      .query("api::owner-profile.owner-profile")
      .update({
        where: { id: profileId },
        data,
      });

    await createAuditEvent(cms, {
      entityType: "owner_profile",
      entityId: profileId,
      action: input.action,
      previousStatus: currentStatus,
      newStatus: transition.nextStatus,
      comment,
      actor,
      metadata: {},
    });
  });

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      entityType: "owner_profile",
      profileId,
      action: input.action,
      previousStatus: currentStatus,
      verificationStatus: transition.nextStatus,
      comment: comment || null,
      reviewedAt: now,
      reviewedBy: actor,
    },
  };
}

export function createAdminModerationService(cms: StrapiLike) {
  return {
    async moderate(input: ModerationInput) {
      if (!isRecord(input)) {
        return {
          ok: false,
          status: 400,
          body: { ok: false, code: "invalid_payload" },
        };
      }

      if (input.entityType === "boat") {
        if (input.action === "publish_logical_boat") {
          return publishUnifiedBoat(cms, input);
        }

        if (input.action === "publish") {
          return {
            ok: false,
            status: 409,
            body: {
              ok: false,
              code: "unified_publication_required",
            },
          };
        }

        return moderateBoat(cms, input);
      }

      if (input.entityType === "experience") {
        return moderateExperience(cms, input);
      }

      if (input.entityType === "owner_profile") {
        return moderateOwner(cms, input);
      }

      return {
        ok: false,
        status: 400,
        body: { ok: false, code: "invalid_entity_type" },
      };
    },
  };
}

export default () => createAdminModerationService(strapi as unknown as StrapiLike);
