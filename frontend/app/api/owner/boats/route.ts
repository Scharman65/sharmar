import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

type CreateBoatBody = {
  title?: string;
  description?: string;
  listingType?: "rent" | "sale";
  vesselType?: "motorboat" | "sailboat";
  capacity?: number;
  lengthM?: number | null;
  year?: number | null;
  engineHp?: number | null;
  rentPriceHour?: number | null;
  rentPriceDay?: number | null;
  rentPriceWeek?: number | null;
  salePrice?: number | null;
  ownerPhone?: string;
  imageIds?: number[];
  ownerEmail?: string;
  currency?: "EUR";
  locale?: string;
};

type ParsedCreateBoatBody = {
  title: string;
  description?: string;
  listingType: "rent" | "sale";
  vesselType: "motorboat" | "sailboat";
  capacity: number;
  lengthM: number | null;
  year: number | null;
  engineHp: number | null;
  rentPriceHour: number | null;
  rentPriceDay: number | null;
  rentPriceWeek: number | null;
  salePrice: number | null;
  ownerPhone?: string;
  imageIds?: number[];
  ownerEmail?: string;
  currency: "EUR";
  locale: string;
};

type StrapiUsersMe = {
  id: number;
  username?: string;
  email?: string;
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
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
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

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asListingType(v: unknown): "rent" | "sale" | null {
  return v === "rent" || v === "sale" ? v : null;
}

function asVesselType(v: unknown): "motorboat" | "sailboat" | null {
  return v === "motorboat" || v === "sailboat" ? v : null;
}

function boatTypeFromVesselType(vesselType: "motorboat" | "sailboat"): "Motorboat" | "Sailboat" {
  return vesselType === "motorboat" ? "Motorboat" : "Sailboat";
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
  const capacity = asNumber(body.capacity);
  const lengthM = body.lengthM == null ? null : asNumber(body.lengthM);
  const year = body.year == null ? null : asNumber(body.year);
  const engineHp = body.engineHp == null ? null : asNumber(body.engineHp);
  const rentPriceHour = body.rentPriceHour == null ? null : asNumber(body.rentPriceHour);
  const rentPriceDay = body.rentPriceDay == null ? null : asNumber(body.rentPriceDay);
  const rentPriceWeek = body.rentPriceWeek == null ? null : asNumber(body.rentPriceWeek);
  const salePrice = body.salePrice == null ? null : asNumber(body.salePrice);
  const ownerPhone = asString(body.ownerPhone);
  const imageIds = asNumberArray(body.imageIds);
  const ownerEmail = asString(body.ownerEmail);
  const currencyRaw = asString(body.currency);
  const locale = asString(body.locale) || "en";

  if (!title) return { ok: false, error: "title is required" };
  if (!listingType) return { ok: false, error: "listingType must be rent or sale" };
  if (!vesselType) return { ok: false, error: "vesselType must be motorboat or sailboat" };
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

  if (listingType === "sale" && salePrice == null) {
    return { ok: false, error: "salePrice is required for sale listings" };
  }

  if (salePrice != null && (salePrice < 0 || salePrice > 1000000000)) {
    return { ok: false, error: "salePrice is out of range" };
  }

  if (ownerPhone && ownerPhone.length > 100) {
    return { ok: false, error: "ownerPhone is too long" };
  }

  if (imageIds.length > 8) {
    return { ok: false, error: "Maximum 8 images per listing" };
  }

  if (ownerEmail && ownerEmail.length > 320) {
    return { ok: false, error: "ownerEmail is too long" };
  }

  const currency: "EUR" = "EUR";
  if (currencyRaw && currencyRaw !== "EUR") {
    return { ok: false, error: "currency must be EUR" };
  }

  return {
    ok: true,
    data: {
      title,
      description: description || undefined,
      listingType,
      vesselType,
      capacity,
      lengthM,
      year,
      engineHp,
      rentPriceHour,
      rentPriceDay,
      rentPriceWeek,
      salePrice,
      ownerPhone: ownerPhone || undefined,
      imageIds: imageIds.length > 0 ? imageIds : undefined,
      ownerEmail: ownerEmail || undefined,
      currency,
      locale,
    },
  };
}

export async function POST(req: NextRequest) {
  const userJwt = getBearerToken(req);
  if (!userJwt) {
    return NextResponse.json(
      { ok: false, error: "Missing Authorization Bearer token" },
      { status: 401, headers: { "cache-control": "no-store" } }
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

  const meRes = await strapiFetchJson("/api/users/me", { method: "GET" }, userJwt);
  if (!meRes.ok || !isRecord(meRes.json) || typeof meRes.json.id !== "number") {
    return NextResponse.json(
      { ok: false, error: "User authentication failed" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const me = meRes.json as StrapiUsersMe;
  const p = parsed.data;

  const createPayload = {
    data: {
      title: p.title,
      slug: slugify(p.title),
      description: p.description ?? "",
      listing_type: p.listingType,
      vesselType: p.vesselType,
      boat_type: boatTypeFromVesselType(p.vesselType),
      capacity: p.capacity,
      length_m: p.lengthM ?? null,
      year: p.year ?? null,
      engine_hp: p.engineHp ?? null,
      price_per_hour: p.rentPriceHour ?? null,
      price_per_day: p.rentPriceDay ?? null,
      price_per_week: p.rentPriceWeek ?? null,
      sale_price: p.salePrice ?? null,
      owner_phone: p.ownerPhone ?? "",
      owner_email: p.ownerEmail || me.email || "owner@sharmar.me",
      owner_user_email: me.email ?? p.ownerEmail ?? "",
      currency: p.currency ?? "EUR",
      booking_enabled: false,
      contacts_visible: false,
      publishedAt: null,
      locale: p.locale || "en",
    },
  };

  const createRes = await strapiFetchJson(
    "/api/boats",
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
  const documentId = data && typeof data.documentId === "string" ? data.documentId : null;

  if (documentId) {
    await strapiFetchJson(
      `/api/boats/${encodeURIComponent(documentId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          data: {
            publishedAt: null,
            booking_enabled: false,
            contacts_visible: false,
            ...(Array.isArray(p.imageIds) && p.imageIds.length > 0
              ? {
                  cover: p.imageIds[0],
                  images: p.imageIds,
                }
              : {}),
          },
        }),
      },
      serverToken
    );
  }

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
