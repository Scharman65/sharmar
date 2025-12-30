const STRAPI_URL = (process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337").replace(/\/+$/, "");
const STRAPI_TOKEN = process.env.STRAPI_TOKEN ?? "";

type MediaFile = {
  id?: number;
  url?: string | null;
  alternativeText?: string | null;
  formats?: Record<string, { url?: string | null }> | null;
};

export type Boat = {
  id: number;
  slug: string;
  title?: string | null;
  description?: string | null;
  boat_type?: string | null;
  capacity?: number | null;
  license_required?: boolean | null;
  skipper_available?: boolean | null;
  cover?: { url: string; alternativeText?: string | null } | null;
  images?: { id: number; url: string; alternativeText?: string | null }[];
  purposes?: { id: number; title?: string | null }[];
};

async function strapiFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (STRAPI_TOKEN) headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;

  const res = await fetch(`${STRAPI_URL}${path}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error(`Strapi request failed: ${res.status}`);
  return (await res.json()) as T;
}

function withLocale(path: string, locale?: string | null): string {
  if (!locale) return path;
  return path.includes("?")
    ? `${path}&locale=${encodeURIComponent(locale)}`
    : `${path}?locale=${encodeURIComponent(locale)}`;
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
    license_required: item.license_required ?? null,
    skipper_available: item.skipper_available ?? null,
    cover: item.cover ? { url: pickBestMediaUrl(item.cover)!, alternativeText: item.cover.alternativeText ?? null } : null,
    images: Array.isArray(item.images)
      ? item.images.map((i: any) => ({ id: i.id, url: absolutizeUrl(i.url), alternativeText: i.alternativeText ?? null }))
      : [],
    purposes: Array.isArray(item.purposes)
      ? item.purposes.map((p: any) => ({ id: p.id, title: p.title ?? null }))
      : [],
  };
}

export async function fetchBoats(locale?: string): Promise<Boat[]> {
  const json = await strapiFetchWithFallback<{ data: any[] }>("/api/boats?populate=*", locale);
  return (json.data ?? []).map(normalizeBoat).filter(Boolean) as Boat[];
}

export async function fetchBoatBySlug(slug: string, locale?: string): Promise<Boat | null> {
  const json = await strapiFetchWithFallback<{ data: any[] }>(
    `/api/boats?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
    locale
  );
  return json.data?.[0] ? normalizeBoat(json.data[0]) : null;
}
