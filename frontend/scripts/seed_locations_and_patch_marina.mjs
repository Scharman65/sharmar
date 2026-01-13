const BASE = process.env.STRAPI_BASE_URL || "https://api.sharmar.me";
const TOKEN = process.env.STRAPI_WRITE_TOKEN;

if (!TOKEN) {
  console.error("ERROR: STRAPI_WRITE_TOKEN is missing (do NOT print it).");
  process.exit(1);
}

async function req(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = json?.error?.message || text || `${res.status}`;
    throw new Error(`HTTP ${res.status} ${path}: ${msg}`);
  }
  return json;
}

async function findLocationBySlug(slug) {
  const q = `/api/locations?locale=en&filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1`;
  const j = await req(q);
  return (j?.data || [])[0] || null;
}

async function createLocation(slug, name) {
  // Strapi v5 usually accepts top-level payload (no {data:{...}}). We'll try both.
  const payloadA = { slug, name };
  try {
    return await req(`/api/locations?locale=en`, { method: "POST", body: payloadA });
  } catch (e) {
    const payloadB = { data: payloadA };
    return await req(`/api/locations?locale=en`, { method: "POST", body: payloadB });
  }
}

async function ensureLocation(slug, name) {
  const existing = await findLocationBySlug(slug);
  if (existing) return existing;
  const created = await createLocation(slug, name);
  const row = (created?.data && !Array.isArray(created.data)) ? created.data : (created?.data || [])[0];
  if (row) return row;
  // Fallback: re-fetch
  const again = await findLocationBySlug(slug);
  if (!again) throw new Error(`Failed to create location ${slug}`);
  return again;
}

async function listBoatsEn() {
  // include home_marina so we can detect missing
  const q = `/api/boats?locale=en&pagination[pageSize]=200&fields[0]=slug&populate[home_marina][fields][0]=slug&sort=slug:asc`;
  const j = await req(q);
  return j?.data || [];
}

async function setBoatHomeMarina(boatId, marinaId) {
  // Try v5 payload first (top-level), then {data:{...}}
  const payloadA = { home_marina: marinaId };
  try {
    return await req(`/api/boats/${boatId}?locale=en`, { method: "PUT", body: payloadA });
  } catch (e) {
    const payloadB = { data: payloadA };
    return await req(`/api/boats/${boatId}?locale=en`, { method: "PUT", body: payloadB });
  }
}

(async () => {
  // Seed minimal set (можно расширять список потом)
  const seed = [
    ["kotor", "Kotor"],
  ];

  for (const [slug, name] of seed) {
    const loc = await ensureLocation(slug, name);
    console.log(`OK location: ${slug} (id=${loc?.id ?? "?"})`);
  }

  const kotor = await findLocationBySlug("kotor");
  if (!kotor?.id) throw new Error("Kotor location not found after seeding.");
  const kotorId = kotor.id;

  const boats = await listBoatsEn();
  const missing = boats.filter(b => !b.home_marina);
  console.log(`boats_total=${boats.length} missing_home_marina=${missing.length}`);

  for (const b of missing) {
    await setBoatHomeMarina(b.id, kotorId);
    console.log(`OK boat patched: ${b.slug} -> kotor`);
  }

  console.log("DONE");
})().catch(e => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
