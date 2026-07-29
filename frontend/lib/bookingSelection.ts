import type { AvailabilitySlot } from "./availability";
import { calculateMarketplaceBreakdown, type MarketplaceBreakdown } from "./pricing";

export type BookingRoute = {
  id: number;
  documentId?: string | null;
  title?: string | null;
  duration_hours?: number | null;
  price?: number | null;
  currency?: string | null;
  cover?: { url: string; alternativeText?: string | null } | null;
};

export type BookingSelectionSummary = {
  routeId: number;
  routeDocumentId: string | null;
  routeTitle: string;
  durationHours: number;
  slotStartUtc: string;
  slotEndUtc: string;
  basePrice: number;
  marketplaceFee: number;
  customerTotal: number;
  currency: string;
};

function slotKey(slot: AvailabilitySlot): string {
  return `${slot.slot_start_utc}-${slot.slot_end_utc}`;
}

export function getRouteDurationHours(route: BookingRoute | null): number | null {
  const duration = Number(route?.duration_hours);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

export function getRoutePriceBreakdown(route: BookingRoute | null): MarketplaceBreakdown | null {
  const price = Number(route?.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return calculateMarketplaceBreakdown(price);
}

export function getConsecutiveSlots(slots: AvailabilitySlot[], startSlot: AvailabilitySlot | null): AvailabilitySlot[] {
  if (!startSlot) return [];

  const sorted = [...slots].sort((a, b) => Date.parse(a.slot_start_utc) - Date.parse(b.slot_start_utc));
  const startIndex = sorted.findIndex((slot) => slotKey(slot) === slotKey(startSlot));
  if (startIndex < 0) return [];

  const consecutive = [sorted[startIndex]];

  for (let index = startIndex + 1; index < sorted.length; index += 1) {
    const previous = consecutive[consecutive.length - 1];
    const current = sorted[index];
    if (previous.slot_end_utc !== current.slot_start_utc) break;
    consecutive.push(current);
  }

  return consecutive;
}

export function localDateKey(isoUtc: string, timeZone: string): string | null {
  const date = new Date(isoUtc);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function buildSlotRangeForDuration(
  slots: AvailabilitySlot[],
  startSlot: AvailabilitySlot | null,
  durationHours: number | null,
  timeZone: string
): AvailabilitySlot | null {
  if (!startSlot || !durationHours || !Number.isFinite(durationHours) || durationHours <= 0) return null;

  const startMs = Date.parse(startSlot.slot_start_utc);
  if (!Number.isFinite(startMs)) return null;

  const end = new Date(startMs + durationHours * 60 * 60 * 1000);
  const slotEndUtc = end.toISOString();
  const sameLocalDate = localDateKey(startSlot.slot_start_utc, timeZone) === localDateKey(slotEndUtc, timeZone);
  if (!sameLocalDate) return null;

  const consecutive = getConsecutiveSlots(slots, startSlot);
  const last = consecutive[consecutive.length - 1];
  if (!last || Date.parse(last.slot_end_utc) < Date.parse(slotEndUtc)) return null;

  return {
    slot_start_utc: startSlot.slot_start_utc,
    slot_end_utc: slotEndUtc,
  };
}

export function getValidStartSlotsForDuration(
  slots: AvailabilitySlot[],
  durationHours: number | null,
  timeZone: string
): AvailabilitySlot[] {
  if (!durationHours || !Number.isFinite(durationHours) || durationHours <= 0) return [];
  return slots.filter((slot) => buildSlotRangeForDuration(slots, slot, durationHours, timeZone) !== null);
}

export function buildBookingSelectionSummary(input: {
  route: BookingRoute | null;
  slotRange: AvailabilitySlot | null;
  fallbackCurrency?: string | null;
}): BookingSelectionSummary | null {
  const route = input.route;
  const slotRange = input.slotRange;
  const durationHours = getRouteDurationHours(route);
  const breakdown = getRoutePriceBreakdown(route);

  if (!route || !slotRange || !durationHours || !breakdown) return null;

  return {
    routeId: route.id,
    routeDocumentId: route.documentId ?? null,
    routeTitle: route.title || "Route",
    durationHours,
    slotStartUtc: slotRange.slot_start_utc,
    slotEndUtc: slotRange.slot_end_utc,
    basePrice: breakdown.ownerAmount,
    marketplaceFee: breakdown.marketplaceFeeAmount,
    customerTotal: breakdown.customerTotalAmount,
    currency: route.currency || input.fallbackCurrency || "EUR",
  };
}

export function buildBookingRequestParams(input: {
  lang: string;
  boatId: number | string;
  boatSlug: string;
  boatTitle: string;
  boatDocumentId?: string | null;
  route: BookingRoute;
  slotRange: AvailabilitySlot;
  guests?: number | null;
}): string {
  const params = new URLSearchParams({
    boatId: String(input.boatId),
    boatSlug: input.boatSlug,
    boatTitle: input.boatTitle,
    slug: input.boatSlug,
    title: input.boatTitle,
    slot_start_utc: input.slotRange.slot_start_utc,
    slot_end_utc: input.slotRange.slot_end_utc,
    experienceId: String(input.route.id),
  });

  if (input.boatDocumentId) {
    params.set("boatDocumentId", input.boatDocumentId);
    params.set("documentId", input.boatDocumentId);
  }
  if (input.route.documentId) params.set("experienceDocumentId", input.route.documentId);
  if (input.route.title) params.set("experienceTitle", input.route.title);
  if (input.route.duration_hours !== null && input.route.duration_hours !== undefined) {
    params.set("routeDurationHours", String(input.route.duration_hours));
  }
  if (input.guests && Number.isFinite(input.guests) && input.guests > 0) {
    params.set("guests", String(Math.floor(input.guests)));
  }

  return `/${input.lang}/request?${params.toString()}`;
}
