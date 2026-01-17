const STRAPI_URL = (
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  "http://127.0.0.1:1337"
).replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";

type MediaFile = {
  id?: number;
  url?: string | null;
  alternativeText?: string | null;
  formats?: Record<string, { url?: string | null }> | null;
};

export type Boat = {
  documentId?: string | null;
  homeMarinaSlug?: string | null;
  homeMarina?: {
    id: number;
    slug: string | null;
    name: string | null;
    region: string | null;
  } | null;
  id: number;
  slug: string;
  title?: string | null;
  description?: string | null;
  boat_type?: string | null;
  capacity?: number | null;
  length_m?: number | null;
  engine_hp?: number | null;
  year?: number | null;
  license_required?: boolean | null;
  skipper_available?: boolean | null;
  vesselType?: string | null;
  listing_type?: string | null;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  price_per_week?: number | null;
  skipper_price_per_hour?: number | null;
  skipper_price_per_day?: number | null;
  deposit?: number | null;
  currency?: string | null;
  cover?: { url: string; alternativeText?: string | null } | null;
  images?: { id: number; url: string; alternativeText?: string | null }[];
  purposes?: { id: number; title?: string | null }[];
  brand?: string | null;
  builder?: any | null;
};

export type Location = {
  id: number;
  slug: string;
  name?: string | null;
};

async function strapiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;

  const res = await fetch(`${STRAPI_URL}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(`Strapi request failed: ${res.status}`);
  return (await res.json()) as T;
}

function withLocale(path: string, locale?: string | null): string {
  if (locale === "me") locale = "sr-Latn-ME";
  if (!locale) return path;
  return path.includes("?")
    ? `${path}&locale=${encodeURIComponent(locale)}`
    : `${path}?locale=${encodeURIComponent(locale)}`;
}

async function strapiFetchWithFallback<T extends { data?: unknown }>(
  path: string,
  locale?: string | null,
): Promise<T> {
  const primary = await strapiFetch<T>(withLocale(path, locale));
  const data: any = (primary as any)?.data;

  if ((Array.isArray(data) && data.length) || (data && !Array.isArray(data))) {
    return primary;
  }
  // IMPORTANT:
  // We must NEVER fallback to English for non-English locales, otherwise pages like /me may render EN text.
  // If a locale has no data, return the empty primary result and let the UI handle "not found"/empty state.
  return primary;
}

function absolutizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${STRAPI_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function pickBestMediaUrl(m?: MediaFile | null): string | null {
  return (m?.formats?.medium?.url ??
    m?.formats?.small?.url ??
    m?.formats?.large?.url ??
    m?.formats?.thumbnail?.url ??
    m?.url ??
    null)
    ? absolutizeUrl(
        m?.formats?.medium?.url ??
          m?.formats?.small?.url ??
          m?.formats?.large?.url ??
          m?.formats?.thumbnail?.url ??
          m?.url ??
          "",
      )
    : null;
}

function normalizeBoat(item: any): Boat | null {
  function pickHomeMarina(input: any) {
    if (!input) return null;

    let x: any = input;

    // Strapi v4 style: { data: { id, attributes } }
    if (x && typeof x === "object" && "data" in x) x = (x as any).data;

    // Strapi v4: { id, attributes: { name, slug, region } }
    if (
      x &&
      typeof x === "object" &&
      (x as any).attributes &&
      !(x as any).name
    ) {
      const id = typeof (x as any).id === "number" ? (x as any).id : null;
      const a = (x as any).attributes || {};
      const name = a.name ?? null;
      const slug = a.slug ?? null;
      const region = a.region ?? null;
      if (!id && !name && !slug) return null;
      return { id, name, slug, region };
    }

    // Strapi v5 style: { id, name, slug, region }
    if (x && typeof x === "object") {
      const id = typeof (x as any).id === "number" ? (x as any).id : null;
      const name = (x as any).name ?? (x as any).attributes?.name ?? null;
      const slug = (x as any).slug ?? (x as any).attributes?.slug ?? null;
      const region = (x as any).region ?? (x as any).attributes?.region ?? null;
      if (!id && !name && !slug) return null;
      return { id, name, slug, region };
    }

    return null;
  }

  const id = item?.id;
  if (typeof id !== "number") return null;

  return {
    id,
    documentId: item.documentId ?? null,
    slug: item.slug ?? String(id),
    title: item.title ?? null,
    description: item.description ?? null,
    boat_type: item.boat_type ?? null,
    capacity: item.capacity ?? null,

    year: item.year ?? null,
    length_m: item.length_m ?? null,
    brand: item.brand ?? item.brand?.data ?? null,
    builder: item.builder ?? item.builder?.data ?? null,
    license_required: item.license_required ?? null,
    skipper_available: item.skipper_available ?? null,
    vesselType: item.vessel_type ?? item.vesselType ?? null,
    listing_type: item.listing_type ?? null,
    homeMarina: pickHomeMarina(item.home_marina),
    homeMarinaSlug: pickHomeMarina(item.home_marina)?.slug ?? null,
    cover: item.cover
      ? {
          url: pickBestMediaUrl(item.cover)!,
          alternativeText: item.cover.alternativeText ?? null,
        }
      : null,
    images: Array.isArray(item.images)
      ? item.images
          .map((i: any) => ({
            id: i.id,
            url: pickBestMediaUrl(i) ?? absolutizeUrl(i.url),
            alternativeText: i.alternativeText ?? null,
          }))
          .filter((x: any) => x.id && x.url)
      : [],
    purposes: Array.isArray(item.purposes)
      ? item.purposes.map((p: any) => ({ id: p.id, title: p.title ?? null }))
      : [],
  };
}

export type BoatFilters = {
  listingType?: "rent" | "sale";
  vesselType?: "motorboat" | "sailboat";
  boatType?: string; // Strapi enum: "Motorboat" | "Sailboat" | "Catamaran" | "Superyacht" | ...
  homeMarinaSlug?: string | null;
};

export async function fetchBoats(
  locale?: string,
  filters?: BoatFilters,
): Promise<Boat[]> {
  const qs: string[] = [
    "populate[cover][fields][0]=url",
    "populate[cover][fields][1]=alternativeText",
    "populate[cover][fields][2]=formats",
    "populate[images][fields][0]=url",
    "populate[images][fields][1]=alternativeText",
    "populate[images][fields][2]=formats",
    "populate[purposes][fields][0]=title",
    "fields[0]=year",
    "fields[1]=length_m",
    "fields[2]=slug",
    "fields[3]=title",
    "populate[home_marina][fields][0]=name",
    "populate[home_marina][fields][1]=slug",
    "populate[home_marina][fields][2]=region",
  ];
  qs.push("sort=documentId:asc");
  if (filters?.listingType)
    qs.push(
      `filters[listing_type][$eq]=${encodeURIComponent(filters.listingType)}`,
    );
  if (filters?.vesselType)
    qs.push(
      `filters[vesselType][$eq]=${encodeURIComponent(filters.vesselType)}`,
    );
  if (filters?.boatType)
    qs.push(`filters[boat_type][$eq]=${encodeURIComponent(filters.boatType)}`);
  if (filters?.homeMarinaSlug)
    qs.push(
      `filters[home_marina][slug][$eq]=${encodeURIComponent(filters.homeMarinaSlug)}`,
    );
  const path = `/api/boats?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);
  return (json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[];
}

export async function fetchLocations(locale?: string): Promise<Location[]> {
  const qs: string[] = [];
  qs.push("sort=slug:asc");
  qs.push("pagination[pageSize]=200");
  qs.push("fields[0]=name");
  qs.push("fields[1]=slug");
  const path = `/api/locations?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);
  return (json.data ?? [])
    .map((x: any) => {
      const id = x?.id;
      if (typeof id !== "number") return null;
      return { id, slug: x.slug ?? String(id), name: x.name ?? null };
    })
    .filter(Boolean) as Location[];
}

export async function fetchBoatBySlug(
  slug: string,
  locale?: string,
): Promise<Boat | null> {
  const json = await strapiFetchWithFallback<{ data: any[] }>(
    `/api/boats?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[cover][fields][0]=url&populate[cover][fields][1]=alternativeText&populate[cover][fields][2]=formats&populate[images][fields][0]=url&populate[images][fields][1]=alternativeText&populate[images][fields][2]=formats&populate[purposes][fields][0]=title&populate[home_marina][fields][0]=name&populate[home_marina][fields][1]=slug&populate[home_marina][fields][2]=region`,
    locale,
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
  filters: AdvancedBoatFilters,
): Promise<Boat[]> {
  const qs: string[] = ["populate[0]=cover", "populate[1]=rate_plans"];

  qs.push("sort=documentId:asc");

  qs.push(
    `filters[listing_type][$eq]=${encodeURIComponent(filters.listingType)}`,
  );

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
    qs.push(
      `filters[rate_plans][type][$eq]=${encodeURIComponent(filters.priceType)}`,
    );
  }

  if (typeof filters.priceMin === "number") {
    qs.push(`filters[rate_plans][price][$gte]=${filters.priceMin}`);
  }

  if (typeof filters.priceMax === "number") {
    qs.push(`filters[rate_plans][price][$lte]=${filters.priceMax}`);
  }

  const path = `/api/boats?${qs.join("&")}`;
  const json = await strapiFetchWithFallback<{ data: any[] }>(path, locale);

  return (json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[];
}
