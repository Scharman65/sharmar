const STRAPI_URL = (process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337").replace(/\/+$/, "");

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

  if (STRAPI_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_TOKEN}`;
  }

  const res = await fetch(`${STRAPI_URL}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(`Strapi request failed: ${res.status}`);
  return (await res.json()) as T;
}

function absolutizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${STRAPI_URL}${url}`;
  return `${STRAPI_URL}/${url}`;
}

function pickBestMediaUrl(m?: MediaFile | null): string | null {
  const raw =
    m?.formats?.medium?.url ??
    m?.formats?.small?.url ??
    m?.formats?.large?.url ??
    m?.formats?.thumbnail?.url ??
    m?.url ??
    null;

  return raw ? absolutizeUrl(raw) : null;
}

function normalizeBoat(item: Record<string, unknown>): Boat | null {
  const attrs =
    item.attributes && typeof item.attributes === "object"
      ? (item.attributes as Record<string, unknown>)
      : null;

  const base = attrs ?? item;

  const id = typeof item.id === "number" ? item.id : (typeof base.id === "number" ? (base.id as number) : null);
  if (id === null) return null;

  const slug = typeof base.slug === "string" && base.slug ? base.slug : String(id);

  const coverRaw = (base.cover as MediaFile | null | undefined) ?? null;
  const coverUrl = pickBestMediaUrl(coverRaw);

  const purposesRaw = base.purposes as Array<Record<string, unknown>> | null | undefined;
  const purposes = Array.isArray(purposesRaw)
    ? purposesRaw
        .map((p) => ({
          id: typeof p.id === "number" ? p.id : 0,
          title: typeof p.title === "string" ? p.title : null,
        }))
        .filter((p) => p.id !== 0)
    : [];

  const imagesRaw = base.images as Array<Record<string, unknown>> | null | undefined;
  const images = Array.isArray(imagesRaw)
    ? imagesRaw
        .map((img) => {
          const mid = typeof img.id === "number" ? img.id : null;
          const url = typeof img.url === "string" ? absolutizeUrl(img.url) : null;
          if (mid === null || url === null) return null;
          const alt = typeof img.alternativeText === "string" ? img.alternativeText : null;
          return { id: mid, url, alternativeText: alt };
        })
        .filter((x): x is { id: number; url: string; alternativeText: string | null } => Boolean(x))
    : [];

  return {
    id,
    slug,
    title: typeof base.title === "string" ? base.title : null,
    description: typeof base.description === "string" ? base.description : null,
    boat_type: typeof base.boat_type === "string" ? base.boat_type : null,
    capacity: typeof base.capacity === "number" ? base.capacity : null,
    license_required: typeof base.license_required === "boolean" ? base.license_required : null,
    skipper_available: typeof base.skipper_available === "boolean" ? base.skipper_available : null,
    cover: coverUrl ? { url: coverUrl, alternativeText: coverRaw?.alternativeText ?? null } : null,
    purposes,
    images,
  };
}

export async function fetchBoats(): Promise<Boat[]> {
  const json = await strapiFetch<{ data: Array<Record<string, unknown>> }>(
    "/api/boats?populate=*"
  );
  const items = Array.isArray(json.data) ? json.data : [];
  return items.map(normalizeBoat).filter((x): x is Boat => Boolean(x));
}

export async function fetchBoatBySlug(slug: string): Promise<Boat | null> {
  const json = await strapiFetch<{ data: Array<Record<string, unknown>> }>(
    `/api/boats?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`
  );
  const items = Array.isArray(json.data) ? json.data : [];
  if (!items.length) return null;
  return normalizeBoat(items[0]);
}
