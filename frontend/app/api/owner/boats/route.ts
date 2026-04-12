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
  rentPriceDay?: number | null;
  rentPriceWeek?: number | null;
  marina?: string;
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
  rentPriceDay: number | null;
  rentPriceWeek: number | null;
  marina: string | null;
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
  return (process.env.STRAPI_TOKEN || "").trim();
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

async function findLocationIdByName(name: string, serverToken: string): Promise<number | null> {
  const q = encodeURI(name);
  const res = await strapiFetchJson(
    `/api/locations?filters[name][$eqi]=${q}&pagination[pageSize]=1&fields[0]=name`,
    { method: "GET" },
    serverToken
  );

  if (!res.ok || !isRecord(res.json) || !Array.isArray(res.json.data) || res.json.data.length === 0) {
    return null;
  }

  const first = res.json.data[0];
  if (!isRecord(first) || typeof first.id !== "number") {
    return null;
  }

  return first.id;
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
  const rentPriceDay = body.rentPriceDay == null ? null : asNumber(body.rentPriceDay);
  const rentPriceWeek = body.rentPriceWeek == null ? null : asNumber(body.rentPriceWeek);
  const marinaRaw = asString(body.marina);
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

  if (rentPriceDay != null && (rentPriceDay < 0 || rentPriceDay > 100000000)) {
    return { ok: false, error: "rentPriceDay is out of range" };
  }

  if (rentPriceWeek != null && (rentPriceWeek < 0 || rentPriceWeek > 100000000)) {
    return { ok: false, error: "rentPriceWeek is out of range" };
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
      rentPriceDay,
      rentPriceWeek,
      marina: marinaRaw || null,
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

  let homeMarinaId: number | null = null;
  if (p.marina) {
    homeMarinaId = await findLocationIdByName(p.marina, serverToken);
    if (!homeMarinaId) {
      return NextResponse.json(
        { ok: false, error: `Unknown marina: ${p.marina}` },
        { status: 400, headers: { "cache-control": "no-store" } }
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
      boat_type: boatTypeFromVesselType(p.vesselType),
      capacity: p.capacity,
      length_m: p.lengthM ?? null,
      year: p.year ?? null,
      engine_hp: p.engineHp ?? null,
      price_per_day: p.rentPriceDay ?? null,
      price_per_week: p.rentPriceWeek ?? null,
      currency: p.currency ?? "EUR",
      owner: me.id,
      locale: p.locale || "en",
      ...(homeMarinaId ? { home_marina: homeMarinaId } : {}),
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
      { ok: false, error: "Failed to create boat", details: createRes.json },
      { status: createRes.status, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, data: createRes.json },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
