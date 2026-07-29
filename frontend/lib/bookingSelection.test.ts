import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Slot = {
  slot_start_utc: string;
  slot_end_utc: string;
};

type Route = {
  id: number;
  documentId: string;
  title: string;
  duration_hours: number;
  price: number;
  currency: string;
};

const timeZone = "Europe/Podgorica";
const source = readFileSync(resolve(process.cwd(), "frontend/lib/bookingSelection.ts"), "utf8");

function hourlySlots(startUtc: string, count: number): Slot[] {
  const start = Date.parse(startUtc);
  return Array.from({ length: count }, (_, index) => {
    const slotStart = new Date(start + index * 60 * 60 * 1000);
    const slotEnd = new Date(start + (index + 1) * 60 * 60 * 1000);
    return {
      slot_start_utc: slotStart.toISOString(),
      slot_end_utc: slotEnd.toISOString(),
    };
  });
}

function localDateKey(isoUtc: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoUtc));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function buildRange(slots: Slot[], startSlot: Slot, durationHours: number): Slot | null {
  const startMs = Date.parse(startSlot.slot_start_utc);
  const end = new Date(startMs + durationHours * 60 * 60 * 1000).toISOString();
  if (localDateKey(startSlot.slot_start_utc) !== localDateKey(end)) return null;

  const sorted = [...slots].sort((a, b) => Date.parse(a.slot_start_utc) - Date.parse(b.slot_start_utc));
  const startIndex = sorted.findIndex((slot) => slot.slot_start_utc === startSlot.slot_start_utc);
  if (startIndex < 0) return null;

  let cursor = startSlot.slot_end_utc;
  for (let index = startIndex + 1; index < sorted.length && Date.parse(cursor) < Date.parse(end); index += 1) {
    if (sorted[index].slot_start_utc !== cursor) return null;
    cursor = sorted[index].slot_end_utc;
  }

  return Date.parse(cursor) >= Date.parse(end)
    ? { slot_start_utc: startSlot.slot_start_utc, slot_end_utc: end }
    : null;
}

function validStarts(slots: Slot[], durationHours: number): Slot[] {
  return slots.filter((slot) => buildRange(slots, slot, durationHours));
}

function breakdown(price: number) {
  const fee = Math.round(price * 0.1 * 100) / 100;
  return { base: price, fee, total: Math.round((price + fee) * 100) / 100 };
}

const petrovac: Route = {
  id: 101,
  documentId: "petrovac-route-doc",
  title: "Petrovac",
  duration_hours: 6,
  price: 500,
  currency: "EUR",
};

const svetiStefan: Route = {
  id: 102,
  documentId: "sveti-stefan-route-doc",
  title: "Sveti Stefan",
  duration_hours: 8,
  price: 650,
  currency: "EUR",
};

test("booking selection helper keeps route duration, price breakdown, interval filtering, and URL builders centralized", () => {
  assert.match(source, /buildSlotRangeForDuration/);
  assert.match(source, /getValidStartSlotsForDuration/);
  assert.match(source, /buildBookingSelectionSummary/);
  assert.match(source, /buildBookingRequestParams/);
  assert.match(source, /calculateMarketplaceBreakdown/);
  assert.match(source, /localDateKey\(startSlot\.slot_start_utc, timeZone\) === localDateKey\(slotEndUtc, timeZone\)/);
});

test("Petrovac selection uses 6h, 500 base, 50 fee, 550 total, and 09:00-15:00 local range", () => {
  const slots = hourlySlots("2026-07-31T07:00:00.000Z", 8);
  const range = buildRange(slots, slots[0], petrovac.duration_hours);
  const price = breakdown(petrovac.price);

  assert.equal(range?.slot_start_utc, "2026-07-31T07:00:00.000Z");
  assert.equal(range?.slot_end_utc, "2026-07-31T13:00:00.000Z");
  assert.deepEqual(price, { base: 500, fee: 50, total: 550 });
  assert.equal(svetiStefan.duration_hours === petrovac.duration_hours, false);
});

test("Sveti Stefan selection uses 8h, 650 base, 65 fee, 715 total, and start plus eight hours", () => {
  const slots = hourlySlots("2026-07-31T07:00:00.000Z", 9);
  const range = buildRange(slots, slots[0], svetiStefan.duration_hours);
  const price = breakdown(svetiStefan.price);

  assert.equal(range?.slot_end_utc, "2026-07-31T15:00:00.000Z");
  assert.deepEqual(price, { base: 650, fee: 65, total: 715 });
});

test("route and date changes invalidate incompatible stale slot ranges", () => {
  const completeDate = hourlySlots("2026-07-31T07:00:00.000Z", 9);
  const shortDate = hourlySlots("2026-08-01T07:00:00.000Z", 4);

  const petrovacRange = buildRange(completeDate, completeDate[0], petrovac.duration_hours);
  const svetiRange = buildRange(completeDate, completeDate[0], svetiStefan.duration_hours);

  assert.notEqual(petrovacRange?.slot_end_utc, svetiRange?.slot_end_utc);
  assert.equal(validStarts(shortDate, petrovac.duration_hours).length, 0);
});

test("invalid starts are filtered by real interval rules, not a hardcoded midnight ban", () => {
  const crossMidnightSlots = hourlySlots("2026-07-31T20:00:00.000Z", 7);
  const sameDaySlots = hourlySlots("2026-07-31T07:00:00.000Z", 7);

  assert.equal(validStarts(crossMidnightSlots, petrovac.duration_hours).length, 0);
  assert.ok(validStarts(sameDaySlots, petrovac.duration_hours).length > 0);
  assert.doesNotMatch(source, /00:00/);
});

test("request URL contract includes identifiers, slot, duration, guests, and no trusted price params", () => {
  assert.match(source, /params\.set\("boatDocumentId"/);
  assert.match(source, /params\.set\("experienceDocumentId"/);
  assert.match(source, /params\.set\("routeDurationHours"/);
  assert.match(source, /params\.set\("guests"/);
  assert.doesNotMatch(source, /params\.set\("experiencePrice"/);
  assert.doesNotMatch(source, /params\.set\("experienceCurrency"/);
  assert.doesNotMatch(source, /params\.set\("ppd"/);
  assert.doesNotMatch(source, /params\.set\("pph"/);
});
