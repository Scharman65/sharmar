import { NextRequest, NextResponse } from "next/server";
import { MARKETPLACE_FEE_RATE } from "@/lib/pricing";

type JsonObject = Record<string, unknown>;
type RowStatus = "draft" | "published";

const PAGE_SIZE = 100;

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

function getAdminToken(): string {
  return (process.env.ADMIN_TRANSLATION_TOKEN || "").trim();
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

function boatQuery(status: RowStatus): string {
  return withQuery("/api/boats", [
    "locale=all",
    `status=${status}`,
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "sort[0]=createdAt:desc",
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=listing_type",
    "fields[3]=boat_type",
    "fields[4]=vesselType",
    "fields[5]=owner_user_id",
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
    "populate[cover][fields][0]=id",
    "populate[images][fields][0]=id",
    "populate[experiences][fields][0]=id",
    "populate[createdBy][fields][0]=id",
  ]);
}

function experienceQuery(status: RowStatus): string {
  return withQuery("/api/experiences", [
    "locale=all",
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

function bookingQuery(): string {
  return withQuery("/api/booking-requests", [
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "sort[0]=createdAt:desc",
    "fields[0]=status",
    "fields[1]=owner_amount",
    "fields[2]=marketplace_fee_amount",
    "fields[3]=customer_total_amount",
    "fields[4]=currency",
    "fields[5]=createdAt",
  ]);
}

function paymentQuery(): string {
  return withQuery("/api/payments", [
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "sort[0]=createdAt:desc",
    "fields[0]=provider",
    "fields[1]=provider_intent_id",
    "fields[2]=amount_cents",
    "fields[3]=currency",
    "fields[4]=status",
    "fields[5]=createdAt",
  ]);
}

function usersQuery(): string {
  return withQuery("/api/users", [
    `pagination[pageSize]=${PAGE_SIZE}`,
    "pagination[page]=1",
    "fields[0]=id",
    "fields[1]=username",
    "fields[2]=email",
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

async function fetchRowsByStatus(
  pathForStatus: (status: RowStatus) => string,
  serverToken: string,
  warnings: string[]
): Promise<{ rows: Array<{ item: unknown; status: RowStatus }>; totals: Record<RowStatus, number | null> }> {
  const rows: Array<{ item: unknown; status: RowStatus }> = [];
  const totals: Record<RowStatus, number | null> = { draft: null, published: null };

  for (const status of ["draft", "published"] as const) {
    const res = await strapiGet(pathForStatus(status), serverToken);
    if (!res.ok) {
      warnings.push(`Could not load ${status} rows from ${pathForStatus(status).split("?")[0]}: Strapi ${res.status}`);
      continue;
    }

    const total = getTotal(res.json);
    totals[status] = total;
    const pageRows = rowsFromJson(res.json);
    rows.push(...pageRows.map((item) => ({ item, status })));

    if (total !== null && total > PAGE_SIZE) {
      warnings.push(`${pathForStatus(status).split("?")[0]} ${status} count is capped at ${PAGE_SIZE} displayed rows.`);
    }
  }

  return { rows, totals };
}

async function countCollection(path: string, serverToken: string, label: string, warnings: string[]): Promise<number | null> {
  const res = await strapiGet(path, serverToken);
  if (!res.ok) {
    warnings.push(`Could not load ${label}: Strapi ${res.status}`);
    return null;
  }

  const total = getTotal(res.json);
  if (total !== null) return total;

  const rows = Array.isArray(res.json) ? res.json : rowsFromJson(res.json);
  warnings.push(`${label} count is based on returned rows because Strapi did not return pagination metadata.`);
  return rows.length;
}

export async function GET(req: NextRequest) {
  const configuredToken = getAdminToken();
  if (!configuredToken) {
    return NextResponse.json(
      { ok: false, code: "admin_translation_token_missing" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  if (req.headers.get("x-admin-token") !== configuredToken) {
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
  const [boatResult, experienceResult, ownerCount, bookingCount, paymentCount] = await Promise.all([
    fetchRowsByStatus(boatQuery, serverToken, warnings),
    fetchRowsByStatus(experienceQuery, serverToken, warnings),
    countCollection(usersQuery(), serverToken, "owners/users", warnings),
    countCollection(bookingQuery(), serverToken, "booking requests", warnings),
    countCollection(paymentQuery(), serverToken, "payments", warnings),
  ]);

  const boats = boatResult.rows.map(({ item, status }) => normalizeBoat(item, status));
  const experiences = experienceResult.rows
    .map(({ item, status }) => normalizeExperience(item, status))
    .slice(0, 50);

  const draftBoats = boatResult.totals.draft ?? boats.filter((boat) => boat.state === "draft").length;
  const publishedBoats = boatResult.totals.published ?? boats.filter((boat) => boat.state === "published").length;

  return NextResponse.json(
    {
      ok: true,
      summary: {
        totalBoats: draftBoats + publishedBoats,
        draftBoats,
        publishedBoats,
        boatsAwaitingReview: draftBoats,
        totalOwners: ownerCount,
        totalExperiences:
          (experienceResult.totals.draft ?? 0) + (experienceResult.totals.published ?? 0),
        totalBookingRequests: bookingCount,
        totalPayments: paymentCount,
        defaultMarketplaceFeePercent: MARKETPLACE_FEE_RATE * 100,
      },
      boats,
      experiences,
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
