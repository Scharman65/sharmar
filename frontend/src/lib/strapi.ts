type StrapiBoat = {
  id: number;
  documentId?: string;
  title?: string;
  slug?: string;
  boat_type?: string;
  capacity?: number;
  purposes?: Array<{
    id: number;
    title?: string;
  }>;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function fetchBoats(): Promise<StrapiBoat[]> {
  const baseUrl = requiredEnv("STRAPI_URL").replace(/\/$/, "");
  const token = requiredEnv("STRAPI_TOKEN");

  const url = `${baseUrl}/api/boats?populate=purposes&pagination[pageSize]=50&sort=title:asc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Strapi HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = await res.json();
  return (json?.data ?? []) as StrapiBoat[];
}

