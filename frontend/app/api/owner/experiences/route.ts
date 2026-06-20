import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

type CreateExperienceBody = {
  boatId?: number;
  title?: string;
  durationHours?: number;
  price?: number;
  shortDescription?: string;
  fullDescription?: string;
  includedServices?: string;
  meetingPoint?: string;
  maxGuests?: number;
  sortOrder?: number;
  coverId?: number;
  galleryIds?: number[];
  locale?: string;
};

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
  locale: string;
};

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

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    const headerToken = m?.[1]?.trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = req.cookies.get("sharmar_owner_session")?.value?.trim();
  return cookieToken || null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
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
  const locale = asString(body.locale) || "en";

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
  if (!["en", "ru", "sr-Latn-ME", "me"].includes(locale)) {
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
      locale: locale === "me" ? "sr-Latn-ME" : locale,
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

async function getOwner(req: NextRequest) {
  const userJwt = getBearerToken(req);

  if (!userJwt) {
    return { ok: false as const, status: 401, error: "Missing Authorization Bearer token" };
  }

  const me = await strapiJson("/api/users/me", { method: "GET" }, userJwt);

  if (!me.ok || !isRecord(me.json)) {
    return { ok: false as const, status: 401, error: "User authentication failed" };
  }

  const id = extractNumberId(me.json.id);
  const email = asString(me.json.email);

  if (!id || !email) {
    return { ok: false as const, status: 401, error: "User authentication failed" };
  }

  return {
    ok: true as const,
    userJwt,
    owner: {
      id,
      email,
      username: asString(me.json.username),
    },
  };
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

async function countBoatExperiences(boatId: number, serverToken: string): Promise<{ ok: true; count: number } | { ok: false; status: number; error: string; details: unknown }> {
  const res = await strapiJson(
    `/api/experiences?filters[boat][id][$eq]=${boatId}&pagination[pageSize]=1`,
    { method: "GET" },
    serverToken
  );

  if (!res.ok) {
    return { ok: false, status: 502, error: "Could not count experiences", details: res.json };
  }

  const meta = isRecord(res.json) && isRecord(res.json.meta) ? res.json.meta : null;
  const pagination = meta && isRecord(meta.pagination) ? meta.pagination : null;
  const total = pagination ? extractNumberId(pagination.total) : null;

  return { ok: true, count: total ?? 0 };
}

export async function GET(req: NextRequest) {
  const ownerRes = await getOwner(req);
  if (!ownerRes.ok) {
    return NextResponse.json(
      { ok: false, error: ownerRes.error },
      { status: ownerRes.status, headers: { "cache-control": "no-store" } }
    );
  }

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
  const ownerBoatIds = allBoats
    .filter((boat) => isRecord(boat) && getBoatOwnerId(boat) === ownerRes.owner.id)
    .map((boat) => extractNumberId((boat as JsonObject).id))
    .filter((id): id is number => id !== null);

  if (!ownerBoatIds.length) {
    return NextResponse.json(
      { ok: true, experiences: [] },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }

  const qs = new URLSearchParams();
  qs.set("pagination[pageSize]", "100");
  qs.append("sort[0]", "sort_order:asc");
  qs.append("sort[1]", "createdAt:desc");
  ownerBoatIds.forEach((id, index) => {
    qs.append(`filters[boat][id][$in][${index}]`, String(id));
  });
  qs.append("populate[boat][fields][0]", "id");
  qs.append("populate[boat][fields][1]", "title");
  qs.append("populate[boat][fields][2]", "slug");

  const experiencesRes = await strapiJson(`/api/experiences?${qs.toString()}`, { method: "GET" }, serverToken);

  if (!experiencesRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not load experiences", status: experiencesRes.status, details: experiencesRes.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const rows = isRecord(experiencesRes.json) && Array.isArray(experiencesRes.json.data) ? experiencesRes.json.data : [];

  return NextResponse.json(
    { ok: true, experiences: rows },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const ownerRes = await getOwner(req);
  if (!ownerRes.ok) {
    return NextResponse.json(
      { ok: false, error: ownerRes.error },
      { status: ownerRes.status, headers: { "cache-control": "no-store" } }
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

  const parsed = parseCreateExperienceBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const p = parsed.data;
  const boatRes = await getOwnerBoat(p.boatId, ownerRes.owner.id, serverToken);

  if (!boatRes.ok) {
    return NextResponse.json(
      { ok: false, error: boatRes.error, details: "details" in boatRes ? boatRes.details : undefined },
      { status: boatRes.status, headers: { "cache-control": "no-store" } }
    );
  }

  const countRes = await countBoatExperiences(p.boatId, serverToken);
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
      is_active: true,
      boat: p.boatId,
      publishedAt: null,
      locale: p.locale,
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

  return NextResponse.json(
    { ok: true, experience: isRecord(createRes.json) ? createRes.json.data ?? null : null },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}
