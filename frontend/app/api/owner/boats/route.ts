import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOwner as getFreshOwnerAuth } from "@/lib/auth/ownerApi";
import { verifyOwnerMedia } from "@/lib/auth/ownerMedia";
import {
  asPropulsion,
  asVesselType,
  boatTypeFromVesselType,
  defaultPropulsionForVesselType,
  type Propulsion,
  type VesselType,
} from "@/lib/boatClassification";

type JsonObject = Record<string, unknown>;

type ParsedCreateBoatBody = {
  title: string;
  description?: string;
  listingType: "rent" | "sale";
  vesselType: VesselType;
  propulsion: Propulsion;
  capacity: number;
  lengthM: number | null;
  year: number | null;
  engineHp: number | null;
  rentPriceHour: number | null;
  rentPriceDay: number | null;
  rentPriceWeek: number | null;
  minRentalHours: number | null;
  salePrice: number | null;
  ownerPhone?: string;
  homeMarinaId: number | null;
  imageIds?: number[];
  ownerEmail?: string;
  currency: "EUR";
  locale: string;
  instantBooking: boolean;
};

type StrapiUsersMe = {
  id: number;
  username?: string;
  email?: string;
};

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error(
      "STRAPI_URL is not configured"
    );
  }

  return configured.replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function extractNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}


function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];

  return v
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function normalizeOwnerLocale(locale: string | null): string | null {
  if (locale === "me") return "sr-Latn-ME";
  if (locale === "en" || locale === "ru" || locale === "sr-Latn-ME") return locale;
  return null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asListingType(v: unknown): "rent" | "sale" | null {
  return v === "rent" || v === "sale" ? v : null;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  const fallback = `boat-${Date.now()}`;
  const core = base || fallback;
  return `${core}-${Date.now()}`;
}

async function strapiFetchJson(
  path: string,
  init?: RequestInit,
  authToken?: string
): Promise<{ ok: true; status: number; json: unknown } | { ok: false; status: number; json: unknown }> {
  const url = `${getStrapiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, json };
  }

  return { ok: true, status: res.status, json };
}

function parseCreateBoatBody(body: unknown): { ok: true; data: ParsedCreateBoatBody } | { ok: false; error: string } {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const title = asString(body.title);
  const description = asString(body.description);
  const listingType = asListingType(body.listingType);
  const vesselType = asVesselType(body.vesselType);
  const propulsion = vesselType ? asPropulsion(body.propulsion) ?? defaultPropulsionForVesselType(vesselType) : null;
  const capacity = asNumber(body.capacity);
  const lengthM = body.lengthM == null ? null : asNumber(body.lengthM);
  const year = body.year == null ? null : asNumber(body.year);
  const engineHp = body.engineHp == null ? null : asNumber(body.engineHp);
  const rentPriceHour = body.rentPriceHour == null ? null : asNumber(body.rentPriceHour);
  const rentPriceDay = body.rentPriceDay == null ? null : asNumber(body.rentPriceDay);
  const rentPriceWeek = body.rentPriceWeek == null ? null : asNumber(body.rentPriceWeek);
  const minRentalHours = body.minRentalHours == null ? 1 : asNumber(body.minRentalHours);
  const salePrice = body.salePrice == null ? null : asNumber(body.salePrice);
  const ownerPhone = asString(body.ownerPhone);
  const homeMarinaId = body.homeMarinaId == null ? null : asNumber(body.homeMarinaId);
  const imageIds = asNumberArray(body.imageIds);
  const ownerEmail = asString(body.ownerEmail);
  const currencyRaw = asString(body.currency);
  const rawLocale = asString(body.locale);
  const locale = normalizeOwnerLocale(rawLocale) || "en";
  const instantBooking = body.instantBooking === true;

  if (!title) return { ok: false, error: "title is required" };
  if (!listingType) return { ok: false, error: "listingType must be rent or sale" };
  if (!vesselType) return { ok: false, error: "vesselType must be motorboat, sailboat, or catamaran" };
  if (body.propulsion != null && !asPropulsion(body.propulsion)) return { ok: false, error: "propulsion must be motor or sail" };
  if (capacity == null || capacity < 1) return { ok: false, error: "capacity must be >= 1" };

  if (lengthM != null && (lengthM <= 0 || lengthM > 200)) {
    return { ok: false, error: "lengthM is out of range" };
  }

  if (year != null && (year < 1900 || year > 2100)) {
    return { ok: false, error: "year is out of range" };
  }

  if (engineHp != null && (engineHp < 0 || engineHp > 100000)) {
    return { ok: false, error: "engineHp is out of range" };
  }

  if (rentPriceHour != null && (rentPriceHour < 0 || rentPriceHour > 100000000)) {
    return { ok: false, error: "rentPriceHour is out of range" };
  }

  if (rentPriceDay != null && (rentPriceDay < 0 || rentPriceDay > 100000000)) {
    return { ok: false, error: "rentPriceDay is out of range" };
  }

  if (rentPriceWeek != null && (rentPriceWeek < 0 || rentPriceWeek > 100000000)) {
    return { ok: false, error: "rentPriceWeek is out of range" };
  }

  if (minRentalHours == null || minRentalHours < 1 || minRentalHours > 24 || !Number.isInteger(minRentalHours)) {
    return { ok: false, error: "minRentalHours must be an integer from 1 to 24" };
  }

  if (listingType === "sale" && salePrice == null) {
    return { ok: false, error: "salePrice is required for sale listings" };
  }

  if (salePrice != null && (salePrice < 0 || salePrice > 1000000000)) {
    return { ok: false, error: "salePrice is out of range" };
  }

  if (ownerPhone && ownerPhone.length > 100) {
    return { ok: false, error: "ownerPhone is too long" };
  }

  if (homeMarinaId != null && (!Number.isInteger(homeMarinaId) || homeMarinaId <= 0)) {
    return { ok: false, error: "homeMarinaId is invalid" };
  }

  if (imageIds.length > 8) {
    return { ok: false, error: "Maximum 8 images per listing" };
  }

  if (ownerEmail && ownerEmail.length > 320) {
    return { ok: false, error: "ownerEmail is too long" };
  }

  const currency = "EUR" as const;
  if (currencyRaw && currencyRaw !== "EUR") {
    return { ok: false, error: "currency must be EUR" };
  }

  if (rawLocale && !normalizeOwnerLocale(rawLocale)) {
    return { ok: false, error: "locale is invalid" };
  }

  return {
    ok: true,
    data: {
      title,
      description: description || undefined,
      listingType,
      vesselType,
      propulsion: propulsion ?? defaultPropulsionForVesselType(vesselType),
      capacity,
      lengthM,
      year,
      engineHp,
      rentPriceHour,
      rentPriceDay,
      rentPriceWeek,
      minRentalHours,
      salePrice,
      ownerPhone: ownerPhone || undefined,
      homeMarinaId,
      imageIds: imageIds.length > 0 ? imageIds : undefined,
      ownerEmail: ownerEmail || undefined,
      currency,
      locale,
      instantBooking,
    },
  };
}


function collectMediaId(value: unknown): number | null {
  const primitiveId = extractNumberId(value);
  if (primitiveId !== null) return primitiveId;

  if (!isRecord(value)) return null;

  const directId = extractNumberId(value.id);
  if (directId !== null) return directId;

  const data = value.data;
  if (isRecord(data)) {
    const dataId = extractNumberId(data.id);
    if (dataId !== null) return dataId;
  }

  if (isRecord(data) && isRecord(data.attributes)) {
    const attributesId = extractNumberId(data.attributes.id);
    if (attributesId !== null) return attributesId;
  }

  const attributes = value.attributes;
  if (isRecord(attributes)) {
    const attributesId = extractNumberId(attributes.id);
    if (attributesId !== null) return attributesId;
  }

  return null;
}

function collectMediaIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(collectMediaId).filter((id): id is number => id !== null);
  }

  if (isRecord(value) && Array.isArray(value.data)) {
    return value.data.map(collectMediaId).filter((id): id is number => id !== null);
  }

  return [];
}

function collectBoatMediaFromRecord(
  item: unknown,
  coverIds: number[],
  imageIds: number[],
  visited: Set<unknown>
) {
  if (!isRecord(item) || visited.has(item)) return;
  visited.add(item);

  const coverId = collectMediaId(item.cover);
  if (coverId !== null) coverIds.push(coverId);

  imageIds.push(...collectMediaIds(item.images));

  const attributes = item.attributes;
  if (isRecord(attributes)) {
    collectBoatMediaFromRecord(attributes, coverIds, imageIds, visited);
  }

  const localizations = item.localizations;
  if (Array.isArray(localizations)) {
    localizations.forEach((localization) => collectBoatMediaFromRecord(localization, coverIds, imageIds, visited));
  } else if (isRecord(localizations)) {
    if (Array.isArray(localizations.data)) {
      localizations.data.forEach((localization) => collectBoatMediaFromRecord(localization, coverIds, imageIds, visited));
    } else {
      collectBoatMediaFromRecord(localizations.data, coverIds, imageIds, visited);
    }
  }
}

function uniqueNumberArray(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

function mediaIdsFromOwnerBoat(boat: unknown): { coverId: number | null; imageIds: number[] } {
  if (!isRecord(boat)) {
    return { coverId: null, imageIds: [] };
  }

  const coverId = extractNumberId(boat.cover_file_id);
  const rawImageIds = boat.image_file_ids;
  let imageIds: number[] = [];

  if (Array.isArray(rawImageIds)) {
    imageIds = rawImageIds.map(extractNumberId).filter((id): id is number => id !== null);
  } else if (typeof rawImageIds === "string") {
    imageIds = rawImageIds
      .replace(/[{}]/g, "")
      .split(",")
      .map((item) => extractNumberId(item.trim()))
      .filter((id): id is number => id !== null);
  }

  return {
    coverId,
    imageIds: uniqueNumberArray(imageIds),
  };
}

function hasMediaIds(media: { coverId: number | null; imageIds: number[] }): boolean {
  return media.coverId !== null || media.imageIds.length > 0;
}

async function fetchBoatMediaIdsByDocumentId(documentId: string, serverToken: string): Promise<{
  coverId: number | null;
  imageIds: number[];
}> {
  const baseQs = [
    `filters[documentId][$eq]=${encodeURIComponent(documentId)}`,
    "locale=all",
    "populate[cover]=true",
    "populate[images]=true",
    "populate[localizations][populate][cover]=true",
    "populate[localizations][populate][images]=true",
    "pagination[pageSize]=50",
  ];

  const queryVariants = [
    [...baseQs, "status=draft"],
    [...baseQs, "status=published"],
    baseQs,
    [...baseQs, "publicationState=preview"],
  ];

  const coverIds: number[] = [];
  const imageIds: number[] = [];

  for (const qs of queryVariants) {
    const res = await strapiFetchJson(`/api/boats?${qs.join("&")}`, { method: "GET" }, serverToken);
    if (!res.ok || !isRecord(res.json) || !Array.isArray(res.json.data)) continue;

    for (const item of res.json.data) {
      collectBoatMediaFromRecord(item, coverIds, imageIds, new Set());
    }
  }

  const documentQs = [
    "locale=all",
    "populate[cover]=true",
    "populate[images]=true",
    "populate[localizations][populate][cover]=true",
    "populate[localizations][populate][images]=true",
  ];

  for (const status of ["draft", "published", null]) {
    const qs = status ? [...documentQs, `status=${status}`] : documentQs;
    const res = await strapiFetchJson(`/api/boats/${encodeURIComponent(documentId)}?${qs.join("&")}`, { method: "GET" }, serverToken);
    if (!res.ok || !isRecord(res.json)) continue;

    if (Array.isArray(res.json.data)) {
      res.json.data.forEach((item) => collectBoatMediaFromRecord(item, coverIds, imageIds, new Set()));
    } else {
      collectBoatMediaFromRecord(res.json.data, coverIds, imageIds, new Set());
    }
  }

  const uniqueImages = uniqueNumberArray(imageIds);
  const coverId = uniqueNumberArray(coverIds)[0] ?? uniqueImages[0] ?? null;

  return {
    coverId,
    imageIds: uniqueImages,
  };
}

export async function POST(req: NextRequest) {
  const ownerAuth = await getFreshOwnerAuth(req);
  if (!ownerAuth.ok) {
    return NextResponse.json(
      { ok: false, error: ownerAuth.code },
      { status: ownerAuth.status, headers: { "cache-control": "no-store" } }
    );
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const parsed = parseCreateBoatBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const me = ownerAuth.auth.owner as StrapiUsersMe;
  const p = parsed.data;
  if (Array.isArray(p.imageIds) && p.imageIds.length > 0) {
    const mediaAllowed = await verifyOwnerMedia(me.id, p.imageIds);
    if (!mediaAllowed) {
      return NextResponse.json(
        { ok: false, error: "Media files are not available for this owner" },
        { status: 403, headers: { "cache-control": "no-store" } }
      );
    }
  }

  const createPayload = {
    data: {
      title: p.title,
      slug: slugify(p.title),
      description: p.description ?? "",
      listing_type: p.listingType,
      vesselType: p.vesselType,
      propulsion: p.propulsion,
      boat_type: boatTypeFromVesselType(p.vesselType),
      capacity: p.capacity,
      length_m: p.lengthM ?? null,
      year: p.year ?? null,
      engine_hp: p.engineHp ?? null,
      price_per_hour: p.rentPriceHour ?? null,
      price_per_day: p.rentPriceDay ?? null,
      price_per_week: p.rentPriceWeek ?? null,
      min_rental_hours: p.minRentalHours ?? 1,
      sale_price: p.salePrice ?? null,
      owner_phone: p.ownerPhone ?? "",
      ...(p.homeMarinaId ? { home_marina: p.homeMarinaId } : {}),
      owner_user_id: me.id,
      currency: p.currency ?? "EUR",
      instant_booking: p.listingType === "rent" ? p.instantBooking : false,
      contacts_visible: false,
      moderation_status: "draft",
      moderation_comment: null,
      submitted_for_review_at: null,
      reviewed_at: null,
      publishedAt: null,
      locale: p.locale || "en",
      ...(Array.isArray(p.imageIds) && p.imageIds.length > 0
        ? {
            cover: p.imageIds[0],
            images: p.imageIds,
          }
        : {}),
    },
  };

  const createRes = await strapiFetchJson(
    "/api/boats?status=draft",
    {
      method: "POST",
      body: JSON.stringify(createPayload),
    },
    serverToken
  );

  if (!createRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Strapi create failed",
        details: createRes.json,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const json = createRes.json;
  const data = isRecord(json) && isRecord(json.data) ? json.data : null;
  return NextResponse.json(
    {
      ok: true,
      boat: data
        ? {
            id: typeof data.id === "number" ? data.id : null,
            documentId: typeof data.documentId === "string" ? data.documentId : null,
          }
        : null,
      owner: {
        id: me.id,
        username: me.username ?? null,
        email: me.email ?? null,
      },
    },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  const ownerAuth = await getFreshOwnerAuth(req);
  if (!ownerAuth.ok) {
    return NextResponse.json(
      { ok: false, error: ownerAuth.code },
      { status: ownerAuth.status, headers: { "cache-control": "no-store" } }
    );
  }

  const serverToken = getServerToken();
  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  if (!isRecord(body) || typeof body.documentId !== "string" || !body.documentId.trim()) {
    return NextResponse.json(
      { ok: false, error: "documentId is required" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const documentId = body.documentId.trim();

  const parsed = parseCreateBoatBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const me = ownerAuth.auth.owner as StrapiUsersMe;

  const ownerBoatsRes = await strapiFetchJson(
    `/api/owner/boats-by-user?user_id=${me.id}`,
    { method: "GET" },
    serverToken
  );

  if (!ownerBoatsRes.ok || !isRecord(ownerBoatsRes.json) || !Array.isArray(ownerBoatsRes.json.boats)) {
    return NextResponse.json(
      { ok: false, error: "Could not verify boat ownership", details: ownerBoatsRes.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const ownedBoat = ownerBoatsRes.json.boats.find((item) => {
    return isRecord(item) && item.documentId === documentId;
  });

  if (!ownedBoat) {
    return NextResponse.json(
      { ok: false, error: "Boat not found for this owner" },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  const currentStatus = isRecord(ownedBoat) && typeof ownedBoat.moderation_status === "string"
    ? ownedBoat.moderation_status
    : "draft";
  if (["submitted", "under_review", "approved", "published", "archived"].includes(currentStatus)) {
    return NextResponse.json(
      { ok: false, error: "Boat cannot be edited in its current moderation status" },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }

  const p = parsed.data;

  const requestedImageIds = Array.isArray(p.imageIds) && p.imageIds.length > 0 ? p.imageIds : null;
  if (requestedImageIds) {
    const mediaAllowed = await verifyOwnerMedia(me.id, requestedImageIds);
    if (!mediaAllowed) {
      return NextResponse.json(
        { ok: false, error: "Media files are not available for this owner" },
        { status: 403, headers: { "cache-control": "no-store" } }
      );
    }
  }
  const ownerBoatMedia = requestedImageIds ? null : mediaIdsFromOwnerBoat(ownedBoat);
  const existingMedia =
    requestedImageIds || !ownerBoatMedia
      ? null
      : hasMediaIds(ownerBoatMedia)
        ? ownerBoatMedia
        : await fetchBoatMediaIdsByDocumentId(documentId, serverToken);
  const mediaUpdate: JsonObject = {};

  if (requestedImageIds) {
    mediaUpdate.cover = requestedImageIds[0];
    mediaUpdate.images = requestedImageIds;
  } else if (existingMedia) {
    if (existingMedia.coverId !== null) {
      mediaUpdate.cover = existingMedia.coverId;
    }
    if (existingMedia.imageIds.length > 0) {
      mediaUpdate.images = existingMedia.imageIds;
    }
  }

  const updatePayload = {
    data: {
      title: p.title,
      slug: isRecord(ownedBoat) && typeof ownedBoat.slug === "string" ? ownedBoat.slug : undefined,
      description: p.description ?? "",
      listing_type: p.listingType,
      vesselType: p.vesselType,
      propulsion: p.propulsion,
      boat_type: boatTypeFromVesselType(p.vesselType),
      capacity: p.capacity,
      length_m: p.lengthM ?? null,
      year: p.year ?? null,
      engine_hp: p.engineHp ?? null,
      price_per_hour: p.rentPriceHour ?? null,
      price_per_day: p.rentPriceDay ?? null,
      price_per_week: p.rentPriceWeek ?? null,
      min_rental_hours: p.minRentalHours ?? 1,
      sale_price: p.salePrice ?? null,
      owner_phone: p.ownerPhone ?? "",
      ...(p.homeMarinaId ? { home_marina: p.homeMarinaId } : {}),
      currency: p.currency ?? "EUR",
      instant_booking: p.listingType === "rent" ? p.instantBooking : false,
      moderation_status: "draft",
      publishedAt: null,
      ...mediaUpdate,
    },
  };

  const locale =
    isRecord(ownedBoat) &&
    typeof ownedBoat.locale === "string" &&
    ownedBoat.locale.trim()
      ? ownedBoat.locale.trim()
      : p.locale || "en";

  const updateRes = await strapiFetchJson(
    `/api/boats/${encodeURIComponent(documentId)}?locale=${encodeURIComponent(locale)}&status=draft`,
    {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    },
    serverToken
  );

  if (!updateRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "strapi_update_failed",
        error: "Strapi update failed",
        upstreamStatus: updateRes.status,
        details: updateRes.json,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const json = updateRes.json;
  const data = isRecord(json) && isRecord(json.data) ? json.data : null;

  return NextResponse.json(
    {
      ok: true,
      boat: data
        ? {
            id: typeof data.id === "number" ? data.id : null,
            documentId: typeof data.documentId === "string" ? data.documentId : null,
          }
        : null,
      owner: {
        id: me.id,
        username: me.username ?? null,
        email: me.email ?? null,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
