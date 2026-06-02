const STRAPI_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";

type MediaFile = {
  id?: number;
  url?: string | null;
  alternativeText?: string | null;
  formats?: Record<string, { url?: string | null }> | null;
};

export type Marina = {
  id: number;
  documentId?: string | null;
  slug?: string | null;
  name?: string | null;
  region?: string | null;
  country?: string | null;
};

export type Boat = {
  id: number;
  slug: string;
  title?: string | null;
  description?: string | null;
  boat_type?: string | null;
  capacity?: number | null;
  length_m?: number | null;
  year?: number | null;
  engine_hp?: number | null;
  license_required?: boolean | null;
  skipper_available?: boolean | null;
  vesselType?: string | null;
  listing_type?: string | null;
    home_marina?: Marina | null;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  price_per_week?: number | null;
  sale_price?: number | null;
  deposit?: number | null;
  currency?: string | null;
  cover?: { url: string; alternativeText?: string | null } | null;
  images?: { id: number; url: string; alternativeText?: string | null }[];
  purposes?: { id: number; title?: string | null }[];
  verified_listing?: boolean | null;
  featured_listing?: boolean | null;
  reviewed_at?: string | null;
  isDemo?: boolean;
};

async function strapiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;

  const res = await fetch(`${STRAPI_URL}${path}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error(`Strapi request failed: ${res.status}`);
  return (await res.json()) as T;
}

function toStrapiLocale(locale?: string | null): string | null {
  if (!locale) return null;
  if (locale === "me") return "sr-Latn-ME";
  return locale;
}

function withLocale(path: string, locale?: string | null): string {
  const strapiLocale = toStrapiLocale(locale);
  if (!strapiLocale) return path;
  return path.includes("?")
    ? `${path}&locale=${encodeURIComponent(strapiLocale)}`
    : `${path}?locale=${encodeURIComponent(strapiLocale)}`;
}

async function strapiFetchWithFallback<T extends { data?: unknown }>(
  path: string,
  locale?: string | null
): Promise<T> {
  const primary = await strapiFetch<T>(withLocale(path, locale));
  const data: any = (primary as any)?.data;

  if ((Array.isArray(data) && data.length) || (data && !Array.isArray(data))) {
    return primary;
  }

  if (locale && locale !== "en") {
    return await strapiFetch<T>(withLocale(path, "en"));
  }

  return primary;
}

function absolutizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function pickBestMediaUrl(m?: MediaFile | null): string | null {
  return (
    m?.formats?.medium?.url ??
    m?.formats?.small?.url ??
    m?.formats?.large?.url ??
    m?.formats?.thumbnail?.url ??
    m?.url ??
    null
  ) ? absolutizeUrl(
    m?.formats?.medium?.url ??
    m?.formats?.small?.url ??
    m?.formats?.large?.url ??
    m?.formats?.thumbnail?.url ??
    m?.url ??
    ""
  ) : null;
}

function isDemoBoat(item: any): boolean {
  const slug = String(item?.slug ?? "").toLowerCase();
  const title = String(item?.title ?? "").toLowerCase();
  const documentId = String(item?.documentId ?? item?.document_id ?? "").toLowerCase();

  return (
    slug.startsWith("demo-") ||
    slug.includes("test") ||
    title.includes("test") ||
    documentId.startsWith("demo-")
  );
}

function normalizeBoat(item: any): Boat | null {
  const id = item?.id;
  if (typeof id !== "number") return null;

  return {
    id,
    slug: item.slug ?? String(id),
    title: item.title ?? null,
    description: item.description ?? null,
    boat_type: item.boat_type ?? null,
    capacity: item.capacity ?? null,
    length_m: item.length_m ?? null,
    year: item.year ?? null,
    engine_hp: item.engine_hp ?? null,
    license_required: item.license_required ?? null,
    skipper_available: item.skipper_available ?? null,
    vesselType: item.vesselType ?? null,
    listing_type: item.listing_type ?? null,
    price_per_hour: item.price_per_hour ?? null,
    price_per_day: item.price_per_day ?? null,
    price_per_week: item.price_per_week ?? null,
    sale_price: item.sale_price ?? null,
    deposit: item.deposit ?? null,
    verified_listing: item.verified_listing ?? false,
    featured_listing: item.featured_listing ?? false,
    reviewed_at: item.reviewed_at ?? null,
    home_marina: item.home_marina
      ? {
          id: item.home_marina.id,
          documentId: item.home_marina.documentId ?? null,
          slug: item.home_marina.slug ?? null,
          name: item.home_marina.name ?? null,
          region: item.home_marina.region ?? null,
          country: item.home_marina.country ?? null,
        }
      : null,
    cover: item.cover ? { url: pickBestMediaUrl(item.cover)!, alternativeText: item.cover.alternativeText ?? null } : null,
    images: Array.isArray(item.images)
      ? item.images.map((i: any) => ({ id: i.id, url: absolutizeUrl(i.url), alternativeText: i.alternativeText ?? null }))
      : [],
    purposes: Array.isArray(item.purposes)
      ? item.purposes.map((p: any) => ({ id: p.id, title: p.title ?? null }))
      : [],
    isDemo: isDemoBoat(item),
  };
}


function sortBoatsByMarketplaceRank(boats: Boat[]): Boat[] {
  return [...boats].sort((a, b) => {
    const aFeatured = a.featured_listing ? 1 : 0;
    const bFeatured = b.featured_listing ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;

    const aVerified = a.verified_listing ? 1 : 0;
    const bVerified = b.verified_listing ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;

    return a.id - b.id;
  });
}

export type BoatFilters = {
  listingType?: "rent" | "sale";
  homeMarinaSlug?: string;
  vesselType?: "motorboat" | "sailboat";
  boatType?: string;
};

export async function fetchBoats(locale?: string, filters?: BoatFilters): Promise<Boat[]> {
  const qs: string[] = ["populate=*"];
  qs.push("sort=documentId:asc");
  qs.push("filters[booking_enabled][$eq]=true");
  if (filters?.listingType) qs.push(`filters[listing_type][$eq]=${encodeURIComponent(filters.listingType)}`);
  if (filters?.homeMarinaSlug) qs.push(`filters[home_marina][slug][$eq]=${encodeURIComponent(filters.homeMarinaSlug)}`);
  if (filters?.vesselType) qs.push(`filters[vesselType][$eq]=${encodeURIComponent(filters.vesselType)}`);
  if (filters?.boatType) qs.push(`filters[boat_type][$eq]=${encodeURIComponent(filters.boatType)}`);
  const path = `/api/boats?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);
  return sortBoatsByMarketplaceRank((json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[]);
}

export async function fetchBoatBySlug(slug: string, locale?: string): Promise<Boat | null> {
  const json = await strapiFetchWithFallback<{ data: any[] }>(
    `/api/boats?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
    locale
  );
  return json.data?.[0] ? normalizeBoat(json.data[0]) : null;
}

export type AdvancedBoatFilters = {
  listingType: "rent" | "sale";
  boatTypes: string[]; // e.g. ["Sailboat", "Catamaran"]
  lengthMin?: number;
  lengthMax?: number;
  priceType?: "hour" | "half_day" | "day" | "sunset";
  priceMin?: number;
  priceMax?: number;
};

export async function fetchBoatsAdvanced(
  locale: string | undefined,
  filters: AdvancedBoatFilters
): Promise<Boat[]> {
  const qs: string[] = ["populate[0]=cover", "populate[1]=rate_plans"];

  qs.push("sort=documentId:asc");

  qs.push(`filters[listing_type][$eq]=${encodeURIComponent(filters.listingType)}`);

  if (filters.boatTypes?.length) {
    filters.boatTypes.forEach((t, i) => {
      qs.push(`filters[boat_type][$in][${i}]=${encodeURIComponent(t)}`);
    });
  }

  if (filters.lengthMin !== undefined) {
    qs.push(`filters[length_m][$gte]=${filters.lengthMin}`);
  }

  if (filters.lengthMax !== undefined) {
    qs.push(`filters[length_m][$lte]=${filters.lengthMax}`);
  }

  if (filters.priceType) {
    qs.push(`filters[rate_plans][type][$eq]=${encodeURIComponent(filters.priceType)}`);
  }

  if (typeof filters.priceMin === "number") {
    qs.push(`filters[rate_plans][price][$gte]=${filters.priceMin}`);
  }

  if (typeof filters.priceMax === "number") {
    qs.push(`filters[rate_plans][price][$lte]=${filters.priceMax}`);
  }

  const path = `/api/boats?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);

  return sortBoatsByMarketplaceRank((json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[]);
}


export async function fetchFeaturedBoats(
  locale?: string,
  limit: number = 6
): Promise<Boat[]> {
  const qs: string[] = [
    "populate=*",
    "pagination[pageSize]=" + String(limit),
    "filters[featured_listing][$eq]=true",
    "filters[booking_enabled][$eq]=true",
    "sort=documentId:asc"
  ];

  const path = `/api/boats?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);

  return sortBoatsByMarketplaceRank(
    (json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[]
  );
}


export type StrapiLocation = {
  id: number;
  documentId?: string | null;
  slug?: string | null;
  name?: string | null;
};

export async function fetchLocations(locale?: string): Promise<StrapiLocation[]> {
  const qs: string[] = [
    "pagination[pageSize]=200",
    "sort=slug:asc",
    "fields[0]=slug",
    "fields[1]=documentId",
    "fields[2]=name",
  ];
  const path = `/api/locations?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map((x: any) => ({
    id: x.id,
    documentId: x.documentId ?? null,
    slug: x.slug ?? null,
    name: x.name ?? null,
  }));
}
