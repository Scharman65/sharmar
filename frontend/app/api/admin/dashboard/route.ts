import { NextResponse } from "next/server";
import { MARKETPLACE_FEE_RATE } from "@/lib/pricing";
import { requireAdminSession } from "@/lib/adminSession";

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

type BoatOwnerLink = {
  boat_id: number | null;
  boat_document_id: string | null;
  boat_locale: string | null;
  owner_user_id: number | null;
  created_by_id: number | null;
  owner_profile_id: number | null;
  owner_email: string | null;
  owner_username: string | null;
  owner_display_name: string | null;
  owner_phone: string | null;
  owner_confirmed: boolean | null;
  owner_blocked: boolean | null;
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
    "fields[22]=reviewed_by",
    "populate[cover][fields][0]=id",
    "populate[images][fields][0]=id",
    "populate[experiences][fields][0]=id",
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
    "fields[2]=locale",
    "fields[3]=price",
    "fields[4]=duration_hours",
    "fields[5]=is_active",
    "fields[6]=publishedAt",
    "fields[7]=createdAt",
    "fields[8]=updatedAt",
    "populate[boat][fields][0]=title",
    "populate[boat][fields][1]=documentId",
  ]);
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
    experiences_count: getRelatedCount(row.experiences),
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
  };
}

function normalizeBoatOwnerLink(item: unknown): BoatOwnerLink | null {
  if (!isRecord(item)) return null;

  return {
    boat_id: asNumber(item.boat_id),
    boat_document_id: asString(item.boat_document_id),
    boat_locale: asString(item.boat_locale),
    owner_user_id: asNumber(item.owner_user_id),
    created_by_id: asNumber(item.created_by_id),
    owner_profile_id: asNumber(item.owner_profile_id),
    owner_email: asString(item.owner_email),
    owner_username: asString(item.owner_username),
    owner_display_name: asString(item.owner_display_name),
    owner_phone: asString(item.owner_phone),
    owner_confirmed: asBoolean(item.owner_confirmed),
    owner_blocked: asBoolean(item.owner_blocked),
  };
}

function boatOwnerDocumentLocaleKey(documentId: string | null | undefined, locale: string | null | undefined): string | null {
  return documentId && locale ? `${documentId}:${locale}` : null;
}

function mergeBoatOwnerLinks<T extends {
  id: number | null;
  documentId: string | null;
  locale: string | null;
  owner_user_id?: number | null;
  created_by_id?: number | null;
}>(
  boats: T[],
  rawLinks: unknown[] | undefined
) {
  const links = (rawLinks ?? [])
    .map(normalizeBoatOwnerLink)
    .filter((link): link is BoatOwnerLink => Boolean(link));

  const byId = new Map<number, BoatOwnerLink>();
  const byDocumentLocale = new Map<string, BoatOwnerLink>();

  for (const link of links) {
    if (link.boat_id !== null) byId.set(link.boat_id, link);

    const documentLocaleKey = boatOwnerDocumentLocaleKey(link.boat_document_id, link.boat_locale);
    if (documentLocaleKey) byDocumentLocale.set(documentLocaleKey, link);
  }

  return boats.map((boat) => {
    const documentLocaleKey = boatOwnerDocumentLocaleKey(boat.documentId, boat.locale);
    const link = (documentLocaleKey ? byDocumentLocale.get(documentLocaleKey) : null)
      ?? (boat.id !== null ? byId.get(boat.id) : null);

    if (!link) return boat;

    return {
      ...boat,
      owner_user_id: link.owner_user_id ?? boat.owner_user_id ?? null,
      created_by_id: link.created_by_id ?? boat.created_by_id ?? null,
      owner_profile_id: link.owner_profile_id,
      owner_email: link.owner_email,
      owner_username: link.owner_username,
      owner_display_name: link.owner_display_name,
      owner_phone: link.owner_phone,
      owner_confirmed: link.owner_confirmed,
      owner_blocked: link.owner_blocked,
    };
  });
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
    boatDocumentId: boat ? asString(boat.documentId) : null,
    boatTitle: boat ? asString(boat.title) : null,
    price: asNumber(row.price),
    duration_hours: asNumber(row.duration_hours),
    is_active: asBoolean(row.is_active),
    state: status === "published" || publishedAt ? "published" : "draft",
    publishedAt,
    created_at: asString(row.createdAt ?? row.created_at),
    updated_at: asString(row.updatedAt ?? row.updated_at),
  };
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
    occurred_at: asString(row.occurred_at),
  };
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
): Promise<{ rows: Array<{ item: unknown; status: RowStatus }>; totals: Record<RowStatus, number | null> }> {
  const rows: Array<{ item: unknown; status: RowStatus }> = [];
  const totals: Record<RowStatus, number> = { draft: 0, published: 0 };
  const seen = new Set<string>();

  for (const locale of STRAPI_LOCALES) {
    for (const status of ["draft", "published"] as const) {
      const path = pathForLocaleStatus(locale, status);
      const res = await strapiGet(path, serverToken);
      if (!res.ok) {
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

  return { rows, totals };
}

export async function GET() {
  const session = await requireAdminSession("dashboard");
  if (!session) {
    return NextResponse.json(
      { ok: false, code: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } }
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
  const [boatResult, experienceResult, eventResult, cmsSummaryResult] = await Promise.all([
    fetchRowsByStatus(boatQuery, serverToken, warnings),
    fetchRowsByStatus(experienceQuery, serverToken, warnings),
    strapiGet(moderationEventQuery(), serverToken),
    cmsAdminToken ? cmsAdminSummaryGet(cmsAdminToken) : Promise.resolve(null),
  ]);

  if (!eventResult.ok) {
    warnings.push(`Could not load moderation events: Strapi ${eventResult.status}`);
  }

  if (!cmsAdminToken) {
    warnings.push("CMS admin summary token missing; booking requests/payments/owners not loaded.");
  }

  let cmsSummary: CmsAdminSummary | null = null;
  if (cmsSummaryResult) {
    if (cmsSummaryResult.ok && isRecord(cmsSummaryResult.json)) {
      cmsSummary = cmsSummaryResult.json as CmsAdminSummary;
      if (Array.isArray(cmsSummary.warnings)) {
        warnings.push(...cmsSummary.warnings.filter((warning): warning is string => typeof warning === "string"));
      }
    } else {
      warnings.push(`Could not load CMS admin summary: Strapi ${cmsSummaryResult.status}`);
    }
  }

  const boats = mergeBoatOwnerLinks(
    boatResult.rows.map(({ item, status }) => normalizeBoat(item, status)),
    cmsSummary?.boatOwnerLinks
  );
  const experiences = experienceResult.rows
    .map(({ item, status }) => normalizeExperience(item, status))
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

  return NextResponse.json(
    {
      ok: true,
      summary: {
        totalBoats: draftBoats + publishedBoats,
        draftBoats,
        publishedBoats,
        boatsAwaitingReview,
        moderationCounts,
        totalOwners,
        totalExperiences:
          (experienceResult.totals.draft ?? 0) + (experienceResult.totals.published ?? 0),
        totalBookingRequests,
        totalPayments,
        defaultMarketplaceFeePercent: MARKETPLACE_FEE_RATE * 100,
      },
      boats,
      experiences,
      bookingRequests: Array.isArray(cmsSummary?.bookingRequests) ? cmsSummary.bookingRequests : [],
      payments: Array.isArray(cmsSummary?.payments) ? cmsSummary.payments : [],
      moderationEvents: eventResult.ok ? rowsFromJson(eventResult.json).map(normalizeModerationEvent) : [],
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
