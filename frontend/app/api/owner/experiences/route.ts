import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOwner as getFreshOwnerAuth } from "@/lib/auth/ownerApi";
import { verifyOwnerMedia } from "@/lib/auth/ownerMedia";

type JsonObject = Record<string, unknown>;

type ParsedCreateExperienceBody = {
  boatId: number;
  title: string;
  durationHours: number;
  price: number;
  shortDescription: string | null;
  fullDescription: string | null;
  includedServices: string | null;
  meetingPoint: string | null;
  maxGuests: number | null;
  sortOrder: number;
  coverId: number | null;
  galleryIds: number[];
  locale: string | null;
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

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function normalizeOwnerLocale(locale: string | null): string | null {
  if (locale === "me") return "sr-Latn-ME";
  if (locale === "en" || locale === "ru" || locale === "sr-Latn-ME") return locale;
  return null;
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asInteger(v: unknown): number | null {
  const n = asNumber(v);
  return n !== null && Number.isInteger(n) ? n : null;
}

function asNumberArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];

  return v
    .map((item) => asInteger(item))
    .filter((item): item is number => item !== null && item > 0);
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return `${base || "experience"}-${Date.now()}`;
}

async function strapiJson(
  path: string,
  init?: RequestInit,
  authToken?: string
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const url = `${getStrapiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers || {});
  if (init?.body !== undefined) headers.set("Content-Type", "application/json");
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

  return { ok: res.ok, status: res.status, json };
}

function parseCreateExperienceBody(body: unknown): { ok: true; data: ParsedCreateExperienceBody } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Invalid JSON body" };

  const boatId = asInteger(body.boatId);
  const title = asString(body.title);
  const durationHours = asNumber(body.durationHours);
  const price = asNumber(body.price);
  const shortDescription = asString(body.shortDescription);
  const fullDescription = asString(body.fullDescription);
  const includedServices = asString(body.includedServices);
  const meetingPoint = asString(body.meetingPoint);
  const maxGuests = body.maxGuests == null ? null : asInteger(body.maxGuests);
  const sortOrder = body.sortOrder == null ? 100 : asInteger(body.sortOrder);
  const coverId = body.coverId == null ? null : asInteger(body.coverId);
  const galleryIds = asNumberArray(body.galleryIds);
  const rawLocale = asString(body.locale) || asString(body.sourceLocale);
  const locale = normalizeOwnerLocale(rawLocale);

  if (!boatId || boatId <= 0) return { ok: false, error: "boatId is required" };
  if (!title) return { ok: false, error: "title is required" };
  if (title.length > 140) return { ok: false, error: "title is too long" };
  if (durationHours == null || durationHours <= 0 || durationHours > 24) {
    return { ok: false, error: "durationHours must be between 0 and 24" };
  }
  if (price == null || price <= 0 || price > 1000000) {
    return { ok: false, error: "price must be between 0 and 1000000" };
  }
  if (maxGuests != null && (maxGuests < 1 || maxGuests > 200)) {
    return { ok: false, error: "maxGuests is out of range" };
  }
  if (sortOrder == null || sortOrder < 0 || sortOrder > 10000) {
    return { ok: false, error: "sortOrder is out of range" };
  }
  if (coverId != null && coverId <= 0) return { ok: false, error: "coverId is invalid" };
  if (galleryIds.length > 10) return { ok: false, error: "Maximum 10 gallery images" };
  if (rawLocale && !locale) {
    return { ok: false, error: "locale is invalid" };
  }

  return {
    ok: true,
    data: {
      boatId,
      title,
      durationHours,
      price,
      shortDescription,
      fullDescription,
      includedServices,
      meetingPoint,
      maxGuests,
      sortOrder,
      coverId,
      galleryIds,
      locale,
    },
  };
}

function extractNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getBoatOwnerId(boat: JsonObject): number | null {
  return extractNumberId(boat.owner_user_id);
}

async function getOwnerBoat(boatId: number, ownerId: number, serverToken: string) {
  const res = await strapiJson(
    `/api/owner/boats-by-user?user_id=${ownerId}`,
    { method: "GET" },
    serverToken
  );

  if (!res.ok) {
    return { ok: false as const, status: 502, error: "Could not load owner boats", details: res.json };
  }

  const rows = isRecord(res.json) && Array.isArray(res.json.boats) ? res.json.boats : [];
  const boat = rows.find((item) => isRecord(item) && extractNumberId(item.id) === boatId) as JsonObject | undefined;

  if (!boat) {
    return { ok: false as const, status: 403, error: "Boat does not belong to owner" };
  }

  if (boat.listing_type !== "rent") {
    return { ok: false as const, status: 409, error: "Experiences are allowed only for rental boats" };
  }

  return { ok: true as const, boat };
}

function getExperienceStableKey(experience: unknown): string | null {
  if (!isRecord(experience)) return null;

  const documentId = asString(experience.documentId);
  if (documentId) return `document:${documentId}`;

  const id = extractNumberId(experience.id);
  return id !== null ? `id:${id}` : null;
}

function dedupeExperiences(rows: unknown[]): JsonObject[] {
  const seen = new Set<string>();
  const deduped: JsonObject[] = [];

  rows.forEach((row, index) => {
    if (!isRecord(row)) return;

    const key = getExperienceStableKey(row) ?? `row:${index}`;
    if (seen.has(key)) return;

    seen.add(key);
    deduped.push(row);
  });

  return deduped;
}

async function countBoatExperiences(
  boat: JsonObject,
  fallbackBoatId: number,
  serverToken: string
): Promise<{ ok: true; count: number } | { ok: false; status: number; error: string; details: unknown }> {
  const documentId = asString(boat.documentId);
  const qs = new URLSearchParams();
  qs.set("pagination[pageSize]", "100");
  qs.set("filters[archived_at][$null]", "true");

  if (documentId) {
    qs.set("filters[boat][documentId][$eq]", documentId);
  } else {
    qs.set("filters[boat][id][$eq]", String(fallbackBoatId));
  }

  const res = await strapiJson(`/api/experiences?${qs.toString()}`, { method: "GET" }, serverToken);

  if (!res.ok) {
    return { ok: false, status: 502, error: "Could not count experiences", details: res.json };
  }

  const rows = isRecord(res.json) && Array.isArray(res.json.data) ? res.json.data : [];
  return { ok: true, count: dedupeExperiences(rows).length };
}

export async function GET(req: NextRequest) {
  const freshAuth = await getFreshOwnerAuth(req);
  if (!freshAuth.ok) {
    return NextResponse.json(
      { ok: false, error: freshAuth.code },
      { status: freshAuth.status, headers: { "cache-control": "no-store" } }
    );
  }
  const ownerRes = { ok: true as const, userJwt: freshAuth.auth.userJwt, owner: freshAuth.auth.owner };

  const serverToken = getServerToken();
  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const boatsRes = await strapiJson(
    `/api/owner/boats-by-user?user_id=${ownerRes.owner.id}`,
    { method: "GET" },
    serverToken
  );

  if (!boatsRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not load owner boats", status: boatsRes.status, details: boatsRes.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const allBoats = isRecord(boatsRes.json) && Array.isArray(boatsRes.json.boats) ? boatsRes.json.boats : [];
  const ownerBoats = allBoats.filter((boat) => isRecord(boat) && getBoatOwnerId(boat) === ownerRes.owner.id) as JsonObject[];

  const ownerBoatDocumentIds = ownerBoats
    .map((boat) => (typeof boat.documentId === "string" && boat.documentId.trim() ? boat.documentId.trim() : null))
    .filter((documentId): documentId is string => documentId !== null);

  const ownerBoatIds = ownerBoats
    .map((boat) => extractNumberId(boat.id))
    .filter((id): id is number => id !== null);

  if (!ownerBoatDocumentIds.length && !ownerBoatIds.length) {
    return NextResponse.json(
      { ok: true, experiences: [] },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const qs = new URLSearchParams();
  qs.set("pagination[pageSize]", "100");
  qs.set("filters[archived_at][$null]", "true");
  qs.append("sort[0]", "sort_order:asc");
  qs.append("sort[1]", "createdAt:desc");

  if (ownerBoatDocumentIds.length) {
    ownerBoatDocumentIds.forEach((documentId, index) => {
      qs.append(`filters[boat][documentId][$in][${index}]`, documentId);
    });
  } else {
    ownerBoatIds.forEach((id, index) => {
      qs.append(`filters[boat][id][$in][${index}]`, String(id));
    });
  }
  qs.append("populate[boat][fields][0]", "id");
  qs.append("populate[boat][fields][1]", "documentId");
  qs.append("populate[boat][fields][2]", "title");
  qs.append("populate[boat][fields][3]", "slug");
  qs.append("populate[cover][fields][0]", "url");
  qs.append("populate[cover][fields][1]", "alternativeText");
  qs.append("populate[cover][fields][2]", "formats");

  const experiencesRes = await strapiJson(`/api/experiences?${qs.toString()}`, { method: "GET" }, serverToken);

  if (!experiencesRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not load experiences", status: experiencesRes.status, details: experiencesRes.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const rows = isRecord(experiencesRes.json) && Array.isArray(experiencesRes.json.data) ? experiencesRes.json.data : [];

  return NextResponse.json(
    { ok: true, experiences: dedupeExperiences(rows) },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const freshAuth = await getFreshOwnerAuth(req);
  if (!freshAuth.ok) {
    return NextResponse.json(
      { ok: false, error: freshAuth.code },
      { status: freshAuth.status, headers: { "cache-control": "no-store" } }
    );
  }
  const ownerRes = { ok: true as const, userJwt: freshAuth.auth.userJwt, owner: freshAuth.auth.owner };

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

  const parsed = parseCreateExperienceBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const p = parsed.data;
  const requestedMediaIds = [p.coverId, ...p.galleryIds].filter((id): id is number => typeof id === "number");
  if (requestedMediaIds.length > 0) {
    const mediaAllowed = await verifyOwnerMedia(ownerRes.owner.id, requestedMediaIds);
    if (!mediaAllowed) {
      return NextResponse.json(
        { ok: false, error: "Media files are not available for this owner" },
        { status: 403, headers: { "cache-control": "no-store" } }
      );
    }
  }
  const boatRes = await getOwnerBoat(p.boatId, ownerRes.owner.id, serverToken);

  if (!boatRes.ok) {
    return NextResponse.json(
      { ok: false, error: boatRes.error, details: "details" in boatRes ? boatRes.details : undefined },
      { status: boatRes.status, headers: { "cache-control": "no-store" } }
    );
  }

  const countRes = await countBoatExperiences(boatRes.boat, p.boatId, serverToken);
  if (!countRes.ok) {
    return NextResponse.json(
      { ok: false, error: countRes.error, details: countRes.details },
      { status: countRes.status, headers: { "cache-control": "no-store" } }
    );
  }

  if (countRes.count >= 3) {
    return NextResponse.json(
      { ok: false, error: "Maximum 3 experiences per boat" },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }

  const locale = p.locale || normalizeOwnerLocale(asString(boatRes.boat.locale)) || "en";

  const createPayload = {
    data: {
      title: p.title,
      slug: slugify(p.title),
      duration_hours: p.durationHours,
      price: p.price,
      currency: "EUR",
      short_description: p.shortDescription,
      full_description: p.fullDescription,
      included_services: p.includedServices,
      meeting_point: p.meetingPoint,
      max_guests: p.maxGuests,
      sort_order: p.sortOrder,
      is_active: false,
      boat: p.boatId,
      publishedAt: null,
      locale,
      ...(p.coverId ? { cover: p.coverId } : {}),
      ...(p.galleryIds.length ? { gallery: p.galleryIds } : {}),
    },
  };

  const createRes = await strapiJson(
    "/api/experiences",
    {
      method: "POST",
      body: JSON.stringify(createPayload),
    },
    serverToken
  );

  if (!createRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Strapi create experience failed", status: createRes.status, details: createRes.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const createdExperience = isRecord(createRes.json) ? createRes.json.data ?? null : null;

  return NextResponse.json(
    {
      ok: true,
      experience: createdExperience,
      boat: {
        id: p.boatId,
        documentId: asString(boatRes.boat.documentId),
      },
      relation: {
        boatId: p.boatId,
        boatDocumentId: asString(boatRes.boat.documentId),
        confirmed: true,
      },
      publicationState: "draft",
      is_active: false,
    },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}
