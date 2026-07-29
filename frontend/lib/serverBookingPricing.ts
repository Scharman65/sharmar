import { calculateMarketplaceBreakdown } from "@/lib/pricing";

type JsonObj = Record<string, unknown>;

type BoatPricing = {
  id: number;
  documentId: string;
  slug: string;
  currency: string;
  pricePerDay: number | null;
  minRentalHours: number;
};

type ExperiencePricing = {
  id: number;
  documentId: string;
  title: string | null;
  durationHours: number;
  price: number;
  currency: string;
  boatDocumentId: string | null;
};

export type BookingPricingOk = {
  ok: true;
  boatId: number;
  boatDocumentId: string;
  routeId: number | null;
  routeDocumentId: string | null;
  routeTitle: string | null;
  durationHours: number;
  currency: string;
  ownerAmount: number;
  marketplaceFeeAmount: number;
  customerTotalAmount: number;
};

export type BookingPricingError =
  | "missing_boat_slug"
  | "boat_not_found"
  | "invalid_experience_identifier"
  | "experience_required"
  | "experience_not_found"
  | "experience_unpublished"
  | "experience_boat_mismatch"
  | "invalid_slot"
  | "route_duration_mismatch"
  | "rental_duration_mismatch"
  | "boat_fixed_duration_price_missing"
  | "pricing_failed";

export type BookingPricingFail = {
  ok: false;
  error: BookingPricingError;
  status: number;
};

export type BookingPricingResult = BookingPricingOk | BookingPricingFail;

export function isIsoUtcTimestamp(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(v);
}

export function isDocumentId(v: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(v.trim());
}

function isRecord(x: unknown): x is JsonObj {
  return typeof x === "object" && x !== null;
}

function getStr(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

function getNum(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function rows(json: unknown): JsonObj[] {
  return isRecord(json) && Array.isArray(json.data)
    ? json.data.filter(isRecord)
    : [];
}

function localePriority(locale: string | null): string[] {
  const requested = locale === "me" ? "sr-Latn-ME" : locale;
  return Array.from(
    new Set(
      [requested, "en", "ru", "sr-Latn-ME"].filter(Boolean) as string[]
    )
  );
}

function diffHoursIso(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 3600000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function strapiFetch(path: string): Promise<unknown> {
  const base = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
  const apiToken = process.env.STRAPI_TOKEN ?? "";
  const url = new URL(path, base);
  const headers: Record<string, string> = {};
  if (apiToken) headers.authorization = `Bearer ${apiToken}`;

  const res = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const message = typeof json === "string" ? json : JSON.stringify(json);
    throw new Error(`Strapi GET failed: ${res.status} ${message}`);
  }

  return json;
}

function boatFromRow(row: JsonObj): BoatPricing | null {
  const id = getNum(row.id);
  const documentId = getStr(row.documentId);
  const slug = getStr(row.slug);
  if (!id || !documentId || !slug) return null;

  return {
    id,
    documentId,
    slug,
    currency: getStr(row.currency) || "EUR",
    pricePerDay: getNum(row.price_per_day),
    minRentalHours: Math.max(1, Math.ceil(getNum(row.min_rental_hours) || 1)),
  };
}

async function getBoatPricing(input: {
  slug: string;
  documentId: string | null;
  locale: string | null;
}): Promise<BoatPricing | null> {
  for (const locale of localePriority(input.locale)) {
    const qs = new URLSearchParams();
    qs.set("locale", locale);
    qs.set("status", "published");
    if (input.documentId) {
      qs.set("filters[documentId][$eq]", input.documentId);
    } else {
      qs.set("filters[slug][$eq]", input.slug);
    }
    qs.append("fields[0]", "id");
    qs.append("fields[1]", "documentId");
    qs.append("fields[2]", "slug");
    qs.append("fields[3]", "currency");
    qs.append("fields[4]", "min_rental_hours");
    qs.append("fields[5]", "locale");
    qs.append("fields[6]", "price_per_day");

    const match = rows(await strapiFetch(`/api/boats?${qs.toString()}`))
      .map(boatFromRow)
      .find((boat): boat is BoatPricing => {
        if (!boat) return false;
        return input.slug ? boat.slug === input.slug : true;
      });

    if (match) return match;
  }

  return null;
}

function routeFromRow(row: JsonObj): ExperiencePricing | null {
  const id = getNum(row.id);
  const documentId = getStr(row.documentId);
  const durationHours = getNum(row.duration_hours);
  const price = getNum(row.price);
  if (!id || !documentId || !durationHours || durationHours <= 0 || !price || price <= 0) return null;

  const boat = isRecord(row.boat) ? row.boat : null;

  return {
    id,
    documentId,
    title: getStr(row.title),
    durationHours,
    price,
    currency: getStr(row.currency) || "EUR",
    boatDocumentId: boat ? getStr(boat.documentId) : null,
  };
}

function addExperienceIdentifier(qs: URLSearchParams, identifier: {
  documentId: string | null;
  numericId: number | null;
}) {
  if (identifier.documentId) {
    qs.set("filters[documentId][$eq]", identifier.documentId);
  } else if (identifier.numericId) {
    qs.set("filters[id][$eq]", String(identifier.numericId));
  }
}

async function findExperience(input: {
  documentId: string | null;
  numericId: number | null;
  locale: string | null;
  status: "published" | "draft";
}): Promise<ExperiencePricing | null> {
  for (const locale of localePriority(input.locale)) {
    const qs = new URLSearchParams();
    qs.set("locale", locale);
    qs.set("status", input.status);
    qs.set("filters[is_active][$eq]", "true");
    qs.set("filters[archived_at][$null]", "true");
    addExperienceIdentifier(qs, input);
    qs.append("fields[0]", "id");
    qs.append("fields[1]", "documentId");
    qs.append("fields[2]", "title");
    qs.append("fields[3]", "duration_hours");
    qs.append("fields[4]", "price");
    qs.append("fields[5]", "currency");
    qs.append("fields[6]", "locale");
    qs.append("populate[boat][fields][0]", "documentId");
    qs.append("populate[boat][fields][1]", "slug");

    const route = rows(await strapiFetch(`/api/experiences?${qs.toString()}`))
      .map(routeFromRow)
      .find((item): item is ExperiencePricing => Boolean(item));

    if (route) return route;
  }

  return null;
}

function fail(error: BookingPricingError, status: number): BookingPricingFail {
  return { ok: false, error, status };
}

export async function resolveBookingPricing(input: {
  boatSlug: string;
  boatDocumentId?: string | null;
  experienceDocumentId?: string | null;
  experienceId?: number | null;
  slotStartUtc: string;
  slotEndUtc: string;
  locale?: string | null;
  requireExperience?: boolean;
}): Promise<BookingPricingResult> {
  const boatSlug = input.boatSlug.trim();
  if (!boatSlug) return fail("missing_boat_slug", 400);

  if (!isIsoUtcTimestamp(input.slotStartUtc) || !isIsoUtcTimestamp(input.slotEndUtc)) {
    return fail("invalid_slot", 400);
  }

  const boatDocumentId =
    input.boatDocumentId && isDocumentId(input.boatDocumentId)
      ? input.boatDocumentId.trim()
      : null;
  const rawExperienceDocumentId = input.experienceDocumentId?.trim() ?? "";
  if (rawExperienceDocumentId && !isDocumentId(rawExperienceDocumentId)) {
    return fail("invalid_experience_identifier", 400);
  }
  const experienceDocumentId = rawExperienceDocumentId || null;
  const numericExperienceId =
    Number.isSafeInteger(input.experienceId) && Number(input.experienceId) > 0
      ? Number(input.experienceId)
      : null;

  const hasExperience = Boolean(experienceDocumentId || numericExperienceId);
  if (input.requireExperience && !hasExperience) {
    return fail("experience_required", 400);
  }

  const boatPricing = await getBoatPricing({
    slug: boatSlug,
    documentId: boatDocumentId,
    locale: input.locale ?? null,
  });
  if (!boatPricing) return fail("boat_not_found", 404);

  const requestedHours = diffHoursIso(input.slotStartUtc, input.slotEndUtc);

  if (hasExperience) {
    const selectedExperience = await findExperience({
      documentId: experienceDocumentId,
      numericId: experienceDocumentId ? null : numericExperienceId,
      locale: input.locale ?? null,
      status: "published",
    });

    if (!selectedExperience) {
      const draftExperience = await findExperience({
        documentId: experienceDocumentId,
        numericId: experienceDocumentId ? null : numericExperienceId,
        locale: input.locale ?? null,
        status: "draft",
      });

      return fail(draftExperience ? "experience_unpublished" : "experience_not_found", 404);
    }

    if (selectedExperience.boatDocumentId !== boatPricing.documentId) {
      return fail("experience_boat_mismatch", 409);
    }

    const durationDiff = Math.abs(requestedHours - selectedExperience.durationHours);
    if (durationDiff > 1 / 60) {
      return fail("route_duration_mismatch", 409);
    }

    const ownerAmount = roundMoney(selectedExperience.price);
    const breakdown = calculateMarketplaceBreakdown(ownerAmount);
    if (!breakdown) return fail("pricing_failed", 500);

    return {
      ok: true,
      boatId: boatPricing.id,
      boatDocumentId: boatPricing.documentId,
      routeId: selectedExperience.id,
      routeDocumentId: selectedExperience.documentId,
      routeTitle: selectedExperience.title,
      durationHours: selectedExperience.durationHours,
      currency: selectedExperience.currency || boatPricing.currency,
      ownerAmount: breakdown.ownerAmount,
      marketplaceFeeAmount: breakdown.marketplaceFeeAmount,
      customerTotalAmount: breakdown.customerTotalAmount,
    };
  }

  const durationDiff = Math.abs(requestedHours - boatPricing.minRentalHours);
  if (durationDiff > 1 / 60) {
    return fail("rental_duration_mismatch", 409);
  }

  if (boatPricing.minRentalHours === 8 && boatPricing.pricePerDay && boatPricing.pricePerDay > 0) {
    const ownerAmount = roundMoney(boatPricing.pricePerDay);
    const breakdown = calculateMarketplaceBreakdown(ownerAmount);
    if (!breakdown) return fail("pricing_failed", 500);

    return {
      ok: true,
      boatId: boatPricing.id,
      boatDocumentId: boatPricing.documentId,
      routeId: null,
      routeDocumentId: null,
      routeTitle: null,
      durationHours: boatPricing.minRentalHours,
      currency: boatPricing.currency,
      ownerAmount: breakdown.ownerAmount,
      marketplaceFeeAmount: breakdown.marketplaceFeeAmount,
      customerTotalAmount: breakdown.customerTotalAmount,
    };
  }

  return fail("boat_fixed_duration_price_missing", 409);
}
