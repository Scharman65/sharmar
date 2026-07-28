import { NextResponse } from "next/server";
import { MARKETPLACE_FEE_RATE } from "@/lib/pricing";
import { getAdminSessionStatus } from "@/lib/adminSession";
import {
  extractCmsAdminSummaryPayload,
  extractCmsBoatOwnerLinks,
  mergeBoatOwnerLinks,
} from "@/lib/adminUnifiedBoatWorkflow";

type JsonObject = Record<string, unknown>;
type RowStatus = "draft" | "published";
type StrapiLocale = "ru" | "en" | "sr-Latn-ME";

const PAGE_SIZE = 100;
const STRAPI_LOCALES: StrapiLocale[] = ["ru", "en", "sr-Latn-ME"];

type CmsAdminSummary = {
  ok?: boolean;
  summary?: {
    totalBookingRequests?: unknown;
    totalPayments?: unknown;
    totalOwners?: unknown;
  };
  bookingRequests?: unknown[];
  payments?: unknown[];
  owners?: unknown[];
  boatOwnerLinks?: unknown[];
  warnings?: unknown[];
};

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error("STRAPI_URL is not configured");
  }

  return configured.replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function getCmsAdminSummaryToken(): string {
  return (process.env.PAYMENTS_ADMIN_TOKEN || process.env.SHARMAR_OWNER_ACTION_TOKEN || "").trim();
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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getAttributes(item: unknown): JsonObject | null {
  if (!isRecord(item)) return null;
  const attributes = isRecord(item.attributes) ? item.attributes : {};
  return { ...item, ...attributes };
}

function getRelatedCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value) && Array.isArray(value.data)) return value.data.length;
  if (isRecord(value) && value.data === null) return 0;
  if (isRecord(value) && value.id !== undefined) return 1;
  return 0;
}

function getFirstRelated(value: unknown): JsonObject | null {
  if (Array.isArray(value)) return getAttributes(value[0]);
  if (isRecord(value) && Array.isArray(value.data)) return getAttributes(value.data[0]);
  if (isRecord(value) && isRecord(value.data)) return getAttributes(value.data);
  return getAttributes(value);
}

function getTotal(json: unknown): number | null {
  const pagination = isRecord(json) && isRecord(json.meta) && isRecord(json.meta.pagination)
    ? json.meta.pagination
    : null;
  return pagination ? asNumber(pagination.total) : null;
}

function rowsFromJson(json: unknown): unknown[] {
  return isRecord(json) && Array.isArray(json.data) ? json.data : [];
}

function withQuery(path: string, params: string[]): string {
  return `${path}?${params.join("&")}`;
}

async function strapiGet(path: string, serverToken: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers: serverToken ? { Authorization: `Bearer ${serverToken}` } : {},
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

async function cmsAdminSummaryGet(adminToken: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}/api/admin-dashboard/summary`, {
    method: "GET",
    headers: { "x-admin-token": adminToken },
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

function boatQuery(locale: StrapiLocale, status: RowStatus): string {
  return withQuery("/api/boats", [
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "sort[0]=createdAt:desc",
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=listing_type",
    "fields[3]=boat_type",
    "fields[4]=vesselType",
    "fields[5]=propulsion",
    "fields[6]=publishedAt",
    "fields[7]=createdAt",
    "fields[8]=updatedAt",
    "fields[9]=locale",
    "fields[10]=documentId",
    "fields[11]=price_per_hour",
    "fields[12]=price_per_day",
    "fields[13]=price_per_week",
    "fields[14]=sale_price",
    "fields[15]=currency",
    "fields[16]=instant_booking",
    "fields[17]=contacts_visible",
    "fields[18]=moderation_status",
    "fields[19]=moderation_comment",
    "fields[20]=submitted_for_review_at",
    "fields[21]=reviewed_at",
    "fields[23]=archived_at",
    "fields[24]=description",
    "fields[25]=capacity",
    "fields[26]=year",
    "fields[27]=length_m",
    "fields[28]=engine_hp",
    "fields[29]=min_rental_hours",
    "populate[cover][fields][0]=id",
    "populate[cover][fields][1]=url",
    "populate[cover][fields][2]=alternativeText",
    "populate[images][fields][0]=id",
    "populate[images][fields][1]=url",
    "populate[images][fields][2]=alternativeText",
    "populate[experiences][fields][0]=id",
    "populate[home_marina][fields][0]=name",
    "populate[home_marina][fields][1]=slug",
  ]);
}

function experienceQuery(locale: StrapiLocale, status: RowStatus): string {
  return withQuery("/api/experiences", [
    `locale=${encodeURIComponent(locale)}`,
    `status=${status}`,
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "sort[0]=createdAt:desc",
    "fields[0]=title",
    "fields[1]=documentId",
    "fields[2]=slug",
    "fields[3]=locale",
    "fields[4]=short_description",
    "fields[5]=full_description",
    "fields[6]=included_services",
    "fields[7]=meeting_point",
    "fields[8]=price",
    "fields[9]=currency",
    "fields[10]=duration_hours",
    "fields[11]=max_guests",
    "fields[12]=is_active",
    "fields[13]=publishedAt",
    "fields[14]=createdAt",
    "fields[15]=updatedAt",
    "fields[16]=archived_at",
    "populate[cover][fields][0]=id",
    "populate[cover][fields][1]=url",
    "populate[cover][fields][2]=alternativeText",
    "populate[gallery][fields][0]=id",
    "populate[gallery][fields][1]=url",
    "populate[gallery][fields][2]=alternativeText",
    "populate[boat][fields][0]=title",
    "populate[boat][fields][1]=documentId",
    "populate[boat][fields][2]=locale",
    "populate[boat][fields][3]=publishedAt",
    "populate[boat][fields][4]=moderation_status",
  ]);
}

function mediaUrl(value: unknown): string | null {
  const row = getFirstRelated(value);
  const url = row ? asString(row.url) : null;
  if (!url) return null;
  return /^https?:\/\//i.test(url)
    ? url
    : `${getStrapiBase()}${url.startsWith("/") ? url : `/${url}`}`;
}

function mediaUrls(value: unknown): string[] {
  const rows = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.data)
      ? value.data
      : [];

  return rows
    .map((item) => {
      const row = getAttributes(item);
      const url = row ? asString(row.url) : null;
      if (!url) return null;
      return /^https?:\/\//i.test(url)
        ? url
        : `${getStrapiBase()}${url.startsWith("/") ? url : `/${url}`}`;
    })
    .filter((url): url is string => Boolean(url));
}

function moderationEventQuery(): string {
  return withQuery("/api/moderation-events", [
    "pagination[pageSize]=50",
    "pagination[page]=1",
    "sort[0]=occurred_at:desc",
    "fields[0]=entity_type",
    "fields[1]=entity_document_id",
    "fields[2]=entity_id",
    "fields[3]=action",
    "fields[4]=previous_status",
    "fields[5]=new_status",
    "fields[6]=comment",
    "fields[7]=actor",
    "fields[8]=occurred_at",
    "fields[9]=metadata",
  ]);
}

function normalizeBoat(item: unknown, status: RowStatus) {
  const row = getAttributes(item) ?? {};
  const createdBy = getFirstRelated(row.createdBy);
  const publishedAt = asString(row.publishedAt);
  const isPublished = status === "published" || Boolean(publishedAt);

  return {
    id: asNumber(row.id),
    documentId: asString(row.documentId),
    locale: asString(row.locale),
    title: asString(row.title),
    description: asString(row.description),
    slug: asString(row.slug),
    listing_type: asString(row.listing_type),
    boat_type: asString(row.boat_type),
    vessel_type: asString(row.vesselType),
    propulsion: asString(row.propulsion),
    owner_user_id: asNumber(row.owner_user_id),
    created_by_id: createdBy ? asNumber(createdBy.id) : null,
    state: isPublished ? "published" : "draft",
    publishedAt,
    created_at: asString(row.createdAt ?? row.created_at),
    updated_at: asString(row.updatedAt ?? row.updated_at),
    cover_count: getRelatedCount(row.cover),
    images_count: getRelatedCount(row.images),
    cover_url: mediaUrl(row.cover),
    image_urls: mediaUrls(row.images),
    experiences_count: getRelatedCount(row.experiences),
    marina_name: asString(getFirstRelated(row.home_marina)?.name),
    marina_slug: asString(getFirstRelated(row.home_marina)?.slug),
    capacity: asNumber(row.capacity),
    year: asNumber(row.year),
    length_m: asNumber(row.length_m),
    engine_hp: asNumber(row.engine_hp),
    min_rental_hours: asNumber(row.min_rental_hours),
    price_per_hour: asNumber(row.price_per_hour),
    price_per_day: asNumber(row.price_per_day),
    price_per_week: asNumber(row.price_per_week),
    sale_price: asNumber(row.sale_price),
    currency: asString(row.currency),
    instant_booking: asBoolean(row.instant_booking),
    contacts_visible: asBoolean(row.contacts_visible),
    moderation_status: asString(row.moderation_status) || "draft",
    moderation_comment: asString(row.moderation_comment),
    submitted_for_review_at: asString(row.submitted_for_review_at),
    reviewed_at: asString(row.reviewed_at),
    reviewed_by: asString(row.reviewed_by),
    archived_at: asString(row.archived_at),
  };
}

function normalizeExperience(item: unknown, status: RowStatus) {
  const row = getAttributes(item) ?? {};
  const boat = getFirstRelated(row.boat);
  const publishedAt = asString(row.publishedAt);

  return {
    id: asNumber(row.id),
    documentId: asString(row.documentId),
    locale: asString(row.locale),
    title: asString(row.title),
    slug: asString(row.slug),
    short_description: asString(row.short_description),
    full_description: asString(row.full_description),
    included_services: asString(row.included_services),
    meeting_point: asString(row.meeting_point),
    boatDocumentId: boat ? asString(boat.documentId) : null,
    boatTitle: boat ? asString(boat.title) : null,
    boatLocale: boat ? asString(boat.locale) : null,
    boatState: boat && asString(boat.publishedAt) ? "published" : "draft",
    boatModerationStatus: boat ? asString(boat.moderation_status) : null,
    owner_user_id: boat ? asNumber(boat.owner_user_id) : null,
    created_by_id: boat ? asNumber(boat.created_by_id) : null,
    price: asNumber(row.price),
    currency: asString(row.currency),
    duration_hours: asNumber(row.duration_hours),
    max_guests: asNumber(row.max_guests),
    is_active: asBoolean(row.is_active),
    state: status === "published" || publishedAt ? "published" : "draft",
    publishedAt,
    archived_at: asString(row.archived_at),
    cover_count: getRelatedCount(row.cover),
    gallery_count: getRelatedCount(row.gallery),
    cover_url: mediaUrl(row.cover),
    gallery_urls: mediaUrls(row.gallery),
    created_at: asString(row.createdAt ?? row.created_at),
    updated_at: asString(row.updatedAt ?? row.updated_at),
  };
}

function latestEventByDocument(events: ReturnType<typeof normalizeModerationEvent>[], entityType: string) {
  const byDocument = new Map<string, ReturnType<typeof normalizeModerationEvent>>();

  for (const event of events) {
    const subjectType = moderationEventSubjectType(event);
    const subjectDocument = moderationEventSubjectDocument(event);
    if (subjectType !== entityType || !subjectDocument) continue;
    const current = byDocument.get(subjectDocument);
    if (!current || String(event.occurred_at ?? "") > String(current.occurred_at ?? "")) {
      byDocument.set(subjectDocument, event);
    }
  }

  return byDocument;
}

function enrichExperiences(
  rows: ReturnType<typeof normalizeExperience>[],
  eventRows: ReturnType<typeof normalizeModerationEvent>[],
  boatRows: ReturnType<typeof normalizeBoat>[]
) {
  const latestEvents = latestEventByDocument(eventRows, "experience");
  const boatByDocument = new Map(
    boatRows
      .filter((boat) => boat.documentId)
      .map((boat) => [boat.documentId as string, boat])
  );
  const localesByDocument = rows.reduce<Map<string, Set<string>>>((acc, row) => {
    if (!row.documentId) return acc;
    const set = acc.get(row.documentId) ?? new Set<string>();
    if (row.locale) set.add(row.locale);
    acc.set(row.documentId, set);
    return acc;
  }, new Map());

  return rows.map((row) => {
    const latestEvent = row.documentId ? latestEvents.get(row.documentId) : null;
    const linkedBoat = row.boatDocumentId ? boatByDocument.get(row.boatDocumentId) : null;
    const updatedAt = row.updated_at ?? "";
    const eventAt = latestEvent?.occurred_at ?? "";
    const staleApproval = latestEvent?.new_status === "approved" && updatedAt && eventAt && updatedAt > eventAt;
    const moderationStatus = row.state === "published"
      ? "published"
      : staleApproval
        ? "submitted"
        : latestEvent?.new_status ?? "submitted";
    const missingRequired = [
      !row.title ? "title" : null,
      !row.slug ? "slug" : null,
      row.duration_hours === null || row.duration_hours <= 0 ? "duration_hours" : null,
      row.price === null || row.price <= 0 ? "price" : null,
      row.currency !== "EUR" ? "currency" : null,
      !row.boatDocumentId ? "boat" : null,
    ].filter((item): item is string => Boolean(item));
    const linkedBoatRecord = linkedBoat as JsonObject | undefined;

    return {
      ...row,
      moderation_status: moderationStatus,
      latest_moderation_action: latestEvent?.action ?? null,
      latest_moderation_at: latestEvent?.occurred_at ?? null,
      stale_after_approval: staleApproval,
      available_locales: row.documentId ? Array.from(localesByDocument.get(row.documentId) ?? []) : [],
      missing_required_fields: missingRequired,
      translation_complete: row.documentId
        ? ["ru", "en", "sr-Latn-ME"].every((locale) => localesByDocument.get(row.documentId!)?.has(locale))
        : false,
      owner_user_id: row.owner_user_id ?? linkedBoat?.owner_user_id ?? null,
      created_by_id: row.created_by_id ?? linkedBoat?.created_by_id ?? null,
      owner_display_name: linkedBoatRecord ? asString(linkedBoatRecord.owner_display_name) : null,
      owner_email: linkedBoatRecord ? asString(linkedBoatRecord.owner_email) : null,
      owner_profile_id: linkedBoatRecord ? asNumber(linkedBoatRecord.owner_profile_id) : null,
      boatState: row.boatState === "published" || linkedBoat?.state === "published" ? "published" : "draft",
      boatModerationStatus: row.boatModerationStatus ?? linkedBoat?.moderation_status ?? null,
    };
  });
}

function normalizeModerationEvent(item: unknown) {
  const row = getAttributes(item) ?? {};

  return {
    id: asNumber(row.id),
    entity_type: asString(row.entity_type),
    entity_document_id: asString(row.entity_document_id),
    entity_id: asNumber(row.entity_id),
    action: asString(row.action),
    previous_status: asString(row.previous_status),
    new_status: asString(row.new_status),
    comment: asString(row.comment),
    actor: asString(row.actor),
    metadata: isRecord(row.metadata) ? row.metadata : null,
    occurred_at: asString(row.occurred_at),
  };
}

function moderationEventSubjectDocument(event: ReturnType<typeof normalizeModerationEvent>): string | null {
  const metadata = isRecord(event.metadata) ? event.metadata : null;
  return asString(metadata?.subjectDocumentId) ?? event.entity_document_id;
}

function moderationEventSubjectType(event: ReturnType<typeof normalizeModerationEvent>): string | null {
  const metadata = isRecord(event.metadata) ? event.metadata : null;
  return asString(metadata?.subjectEntityType) ?? event.entity_type;
}

function normalizeOwnerDocuments(item: unknown): unknown {
  if (!isRecord(item)) return item;

  const documents = Array.isArray(item.documents)
    ? item.documents
    : [];

  return {
    ...item,
    documents: documents.map((document) => {
      if (!isRecord(document)) return document;

      const url = asString(document.url);

      return {
        ...document,
        url:
          url && !/^https?:\/\//i.test(url)
            ? `${getStrapiBase()}${url.startsWith("/") ? url : `/${url}`}`
            : url,
      };
    }),
  };
}

async function fetchRowsByStatus(
  pathForLocaleStatus: (locale: StrapiLocale, status: RowStatus) => string,
  serverToken: string,
  warnings: string[]
): Promise<{ rows: Array<{ item: unknown; status: RowStatus }>; totals: Record<RowStatus, number | null>; failed: number; attempted: number }> {
  const rows: Array<{ item: unknown; status: RowStatus }> = [];
  const totals: Record<RowStatus, number> = { draft: 0, published: 0 };
  const seen = new Set<string>();
  let failed = 0;
  let attempted = 0;

  for (const locale of STRAPI_LOCALES) {
    for (const status of ["draft", "published"] as const) {
      const path = pathForLocaleStatus(locale, status);
      attempted += 1;
      const res = await strapiGet(path, serverToken);
      if (!res.ok) {
        failed += 1;
        warnings.push(`Could not load ${locale} ${status} rows from ${path.split("?")[0]}: Strapi ${res.status}`);
        continue;
      }

      const total = getTotal(res.json);
      if (total !== null) totals[status] += total;

      const pageRows = rowsFromJson(res.json);
      if (total === null) totals[status] += pageRows.length;

      for (const item of pageRows) {
        const row = getAttributes(item) ?? {};
        const id = asNumber(row.id);
        const documentId = asString(row.documentId);
        const rowLocale = asString(row.locale) ?? locale;
        const key = id !== null
          ? `id:${id}:${rowLocale}:${status}`
          : `document:${documentId ?? "unknown"}:${rowLocale}:${status}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ item, status });
      }

      if (total !== null && total > PAGE_SIZE) {
        warnings.push(`${path.split("?")[0]} ${locale} ${status} count is capped at ${PAGE_SIZE} displayed rows.`);
      }
    }
  }

  return { rows, totals, failed, attempted };
}

export async function GET() {
  const sessionStatus = await getAdminSessionStatus();
  if (!sessionStatus.authenticated) {
    return NextResponse.json(
      { ok: false, code: sessionStatus.code },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  if (!sessionStatus.session.permissions.includes("dashboard")) {
    return NextResponse.json(
      { ok: false, code: "missing_dashboard_permission" },
      { status: 403, headers: { "cache-control": "no-store" } }
    );
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return NextResponse.json(
      { ok: false, code: "strapi_token_missing" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const warnings: string[] = [];
  const cmsAdminToken = getCmsAdminSummaryToken();
  if (!cmsAdminToken) {
    return NextResponse.json(
      {
        ok: false,
        code: "cms_admin_summary_token_missing",
        warnings: ["CMS admin summary token missing; protected dashboard data not loaded."],
      },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const [boatResult, experienceResult, eventResult, cmsSummaryResult] = await Promise.all([
    fetchRowsByStatus(boatQuery, serverToken, warnings),
    fetchRowsByStatus(experienceQuery, serverToken, warnings),
    strapiGet(moderationEventQuery(), serverToken),
    cmsAdminSummaryGet(cmsAdminToken),
  ]);

  if (!eventResult.ok) {
    warnings.push(`Could not load moderation events: Strapi ${eventResult.status}`);
  }

  let cmsSummary: CmsAdminSummary | null = null;
  if (cmsSummaryResult.ok && isRecord(cmsSummaryResult.json)) {
    cmsSummary = extractCmsAdminSummaryPayload(cmsSummaryResult.json) as CmsAdminSummary | null;
    if (Array.isArray(cmsSummary?.warnings)) {
      warnings.push(...cmsSummary.warnings.filter((warning): warning is string => typeof warning === "string"));
    }
  } else {
    warnings.push(`Could not load CMS admin summary: Strapi ${cmsSummaryResult.status}`);
    return NextResponse.json(
      {
        ok: false,
        code: cmsSummaryResult.status === 401 || cmsSummaryResult.status === 403
          ? "cms_admin_summary_unauthorized"
          : "cms_admin_summary_unavailable",
        warnings,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  if (!cmsSummary) {
    return NextResponse.json(
      {
        ok: false,
        code: "cms_admin_summary_invalid",
        warnings: [...warnings, "CMS admin summary response was invalid."],
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  if (boatResult.failed > 0 && boatResult.rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "strapi_boat_query_failed",
        warnings,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const boats = mergeBoatOwnerLinks(
    boatResult.rows.map(({ item, status }) => normalizeBoat(item, status)),
    extractCmsBoatOwnerLinks(cmsSummary)
  );
  const moderationEvents = eventResult.ok ? rowsFromJson(eventResult.json).map(normalizeModerationEvent) : [];
  const experiences = enrichExperiences(
    experienceResult.rows.map(({ item, status }) => normalizeExperience(item, status)),
    moderationEvents,
    boats
  )
    .slice(0, 50);

  const draftBoats = boatResult.totals.draft ?? boats.filter((boat) => boat.state === "draft").length;
  const publishedBoats = boatResult.totals.published ?? boats.filter((boat) => boat.state === "published").length;
  const uniqueModerationBoats = Array.from(
    new Map(
      boats
        .filter((boat) => boat.documentId)
        .map((boat) => [boat.documentId, boat])
    ).values()
  );
  const moderationCounts = uniqueModerationBoats.reduce<Record<string, number>>((counts, boat) => {
    const moderationStatus = boat.moderation_status || "draft";
    counts[moderationStatus] = (counts[moderationStatus] || 0) + 1;
    return counts;
  }, {});
  const boatsAwaitingReview =
    (moderationCounts.submitted || 0) +
    (moderationCounts.under_review || 0);
  const totalOwners = asNumber(cmsSummary?.summary?.totalOwners) ?? (Array.isArray(cmsSummary?.owners) ? cmsSummary.owners.length : null);
  const totalBookingRequests = asNumber(cmsSummary?.summary?.totalBookingRequests) ?? (Array.isArray(cmsSummary?.bookingRequests) ? cmsSummary.bookingRequests.length : null);
  const totalPayments = asNumber(cmsSummary?.summary?.totalPayments) ?? (Array.isArray(cmsSummary?.payments) ? cmsSummary.payments.length : null);
  const uniqueModerationExperiences = Array.from(
    new Map(
      experiences
        .filter((experience) => experience.documentId)
        .map((experience) => [experience.documentId, experience])
    ).values()
  );
  const experienceModerationCounts = uniqueModerationExperiences.reduce<Record<string, number>>((counts, experience) => {
    const moderationStatus = experience.moderation_status || "submitted";
    counts[moderationStatus] = (counts[moderationStatus] || 0) + 1;
    return counts;
  }, {});
  const experiencesWithoutBoat = uniqueModerationExperiences.filter((experience) => !experience.boatDocumentId).length;
  const experiencesWithIncompleteTranslations = uniqueModerationExperiences.filter((experience) => !experience.translation_complete).length;
  const logicalDraftBoats = uniqueModerationBoats.filter((boat) => boat.state !== "published").length;
  const logicalPublishedBoats = uniqueModerationBoats.filter((boat) => boat.state === "published").length;
  const logicalDraftExperiences = uniqueModerationExperiences.filter((experience) => experience.state !== "published").length;
  const logicalPublishedExperiences = uniqueModerationExperiences.filter((experience) => experience.state === "published").length;

  return NextResponse.json(
    {
      ok: true,
      summary: {
        totalBoats: uniqueModerationBoats.length,
        draftBoats: logicalDraftBoats,
        publishedBoats: logicalPublishedBoats,
        localizationRowBoats: draftBoats + publishedBoats,
        boatsAwaitingReview,
        moderationCounts,
        totalOwners,
        totalExperiences:
          uniqueModerationExperiences.length,
        draftExperiences: logicalDraftExperiences,
        publishedExperiences: logicalPublishedExperiences,
        localizationRowExperiences:
          (experienceResult.totals.draft ?? 0) + (experienceResult.totals.published ?? 0),
        experienceModerationCounts,
        experiencesAwaitingReview:
          (experienceModerationCounts.submitted || 0) +
          (experienceModerationCounts.under_review || 0),
        experiencesRejected: experienceModerationCounts.rejected || 0,
        experiencesReadyToPublish: experienceModerationCounts.approved || 0,
        experiencesPublished: experienceModerationCounts.published || 0,
        experiencesWithoutBoat,
        experiencesWithIncompleteTranslations,
        totalBookingRequests,
        totalPayments,
        defaultMarketplaceFeePercent: MARKETPLACE_FEE_RATE * 100,
      },
      boats,
      experiences,
      bookingRequests: Array.isArray(cmsSummary?.bookingRequests) ? cmsSummary.bookingRequests : [],
      payments: Array.isArray(cmsSummary?.payments) ? cmsSummary.payments : [],
      moderationEvents,
      owners: Array.isArray(cmsSummary?.owners)
        ? cmsSummary.owners.map(normalizeOwnerDocuments)
        : [],
      feeSettings: {
        defaultMarketplaceFeeRate: MARKETPLACE_FEE_RATE,
        defaultMarketplaceFeePercent: MARKETPLACE_FEE_RATE * 100,
        source: "frontend/lib/pricing.ts",
        bookingFields: ["owner_amount", "marketplace_fee_amount", "customer_total_amount"],
        notes: [
          "Booking request creation calculates customer_total_amount from owner amount and MARKETPLACE_FEE_RATE.",
          "Payment code reads marketplace_fee_amount when creating/inspecting payment intents.",
        ],
      },
      warnings,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
