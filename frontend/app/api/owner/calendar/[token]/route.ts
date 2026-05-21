import { NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

type RouteCtx = {
  params: Promise<{
    token: string;
  }>;
};

type CalendarBooking = {
  id: number | string | null;
  public_id: string | null;
  public_token: string | null;
  boat_id: number | null;
  boat_title: string;
  status: string | null;
  slot_start_utc: string | null;
  slot_end_utc: string | null;
  owner_decision: string | null;
  payment_intent_id: string | null;
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

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function getNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function getId(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) return value.trim();
  return null;
}

async function strapiJson(path: string, authToken?: string): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${getStrapiBase()}${path}`, {
    method: "GET",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return { ok: res.ok, status: res.status, json };
}

function getStrapiItemAttributes(item: unknown): JsonObject | null {
  if (!isRecord(item)) return null;
  const attrs = isRecord(item.attributes) ? item.attributes : {};
  return { ...item, ...attrs };
}

function extractBoatId(value: unknown): number | null {
  if (typeof value === "number" || typeof value === "string") return getNumber(value);

  if (isRecord(value)) {
    const direct = getNumber(value.id);
    if (direct !== null) return direct;

    if (isRecord(value.data)) {
      const nested = getNumber(value.data.id);
      if (nested !== null) return nested;
    }
  }

  return null;
}

function extractPublicToken(row: JsonObject): string | null {
  const direct = getString(row.public_token ?? row.owner_token ?? row.booking_public_token);
  if (direct) return direct;

  const bookingRequest = row.booking_request ?? row.bookingRequest;
  if (isRecord(bookingRequest)) {
    const directRequestToken = getString(
      bookingRequest.public_token ?? bookingRequest.owner_token ?? bookingRequest.token
    );
    if (directRequestToken) return directRequestToken;

    if (isRecord(bookingRequest.data)) {
      const data = getStrapiItemAttributes(bookingRequest.data);
      const nestedRequestToken = data
        ? getString(data.public_token ?? data.owner_token ?? data.token)
        : null;
      if (nestedRequestToken) return nestedRequestToken;
    }
  }

  return null;
}

function icalEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icalDate(value: string | null): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;

  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icalStatus(status: string | null): "TENTATIVE" | "CONFIRMED" | "CANCELLED" {
  if (status === "hold") return "TENTATIVE";
  if (status === "deposit_paid" || status === "confirmed") return "CONFIRMED";
  if (status === "declined" || status === "expired") return "CANCELLED";
  return "TENTATIVE";
}

function calendarResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function emptyCalendar(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sharmar Marketplace//Owner Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "END:VCALENDAR",
  ].join("\r\n");
}

async function loadOwnerEmail(ownerToken: string): Promise<string | null> {
  const me = await strapiJson("/api/users/me", ownerToken);
  if (!me.ok || !isRecord(me.json)) return null;
  return getString(me.json.email);
}

async function loadOwnerBoats(ownerEmail: string, serverToken: string): Promise<JsonObject[]> {
  const boats = await strapiJson(
    `/api/boats?sort=createdAt:desc&pagination[pageSize]=100`,
    serverToken
  );

  if (!boats.ok || !isRecord(boats.json) || !Array.isArray(boats.json.data)) return [];

  return boats.json.data.filter((boat): boat is JsonObject => {
    if (!isRecord(boat)) return false;
    const value = boat.owner_user_email;
    return typeof value === "string" && value.trim().toLowerCase() === ownerEmail.toLowerCase();
  });
}

function buildBoatTitleMap(ownerBoats: JsonObject[]): Map<number, string> {
  const map = new Map<number, string>();

  ownerBoats.forEach((boat) => {
    const id = getNumber(boat.id);
    const title = getString(boat.title ?? boat.name ?? boat.slug);
    if (id !== null && title) map.set(id, title);
  });

  return map;
}

function buildBookingsPath(ownerBoatIds: number[]): string {
  const qs = new URLSearchParams();

  qs.set("pagination[pageSize]", "100");
  qs.set("sort[0]", "slot_start_utc:asc");
  ["hold", "deposit_paid", "confirmed", "declined", "expired"].forEach((status, index) => {
    qs.append(`filters[status][$in][${index}]`, status);
  });

  ownerBoatIds.forEach((id, index) => {
    qs.append(`filters[boat_id][$in][${index}]`, String(id));
  });

  [
    "id",
    "public_id",
    "public_token",
    "boat_id",
    "status",
    "slot_start_utc",
    "slot_end_utc",
    "owner_decision",
    "payment_intent_id",
  ].forEach((field, index) => {
    qs.append(`fields[${index}]`, field);
  });

  return `/api/bookings?${qs.toString()}`;
}

function normalizeBooking(item: unknown, boatTitleMap: Map<number, string>): CalendarBooking | null {
  const row = getStrapiItemAttributes(item);
  if (!row) return null;

  const boatId = extractBoatId(row.boat_id ?? row.boat);

  return {
    id: getId(row.id),
    public_id: getString(row.public_id),
    public_token: extractPublicToken(row),
    boat_id: boatId,
    boat_title: boatId !== null ? boatTitleMap.get(boatId) ?? `Boat #${boatId}` : "Boat",
    status: getString(row.status),
    slot_start_utc: getString(row.slot_start_utc),
    slot_end_utc: getString(row.slot_end_utc),
    owner_decision: getString(row.owner_decision),
    payment_intent_id: getString(row.payment_intent_id),
  };
}

async function loadOwnerBookings(ownerBoats: JsonObject[], serverToken: string): Promise<CalendarBooking[]> {
  const ownerBoatIds = ownerBoats
    .map((boat) => getNumber(boat.id))
    .filter((id): id is number => id !== null);

  if (!ownerBoatIds.length) return [];

  const ownerBoatIdSet = new Set(ownerBoatIds);
  const boatTitleMap = buildBoatTitleMap(ownerBoats);
  const bookings = await strapiJson(buildBookingsPath(ownerBoatIds), serverToken);

  if (!bookings.ok || !isRecord(bookings.json) || !Array.isArray(bookings.json.data)) return [];

  return bookings.json.data
    .map((item) => normalizeBooking(item, boatTitleMap))
    .filter((booking): booking is CalendarBooking => {
      if (!booking) return false;
      if (booking.boat_id === null || !ownerBoatIdSet.has(booking.boat_id)) return false;
      return Boolean(booking.slot_start_utc && booking.slot_end_utc);
    });
}

function bookingToEvent(booking: CalendarBooking, index: number): string[] {
  const dtStart = icalDate(booking.slot_start_utc);
  const dtEnd = icalDate(booking.slot_end_utc);
  if (!dtStart || !dtEnd) return [];

  const uid = `${booking.public_token || booking.public_id || booking.id || index}@sharmar.me`;
  const summary = `${booking.boat_title} - ${booking.status || "booking"}`;
  const description = [
    `Boat: ${booking.boat_title}`,
    `Booking status: ${booking.status || "unknown"}`,
    booking.public_token ? `Public token: ${booking.public_token}` : null,
    booking.owner_decision ? `Owner decision: ${booking.owner_decision}` : null,
    `Payment intent: ${booking.payment_intent_id ? "present" : "not recorded"}`,
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VEVENT",
    `UID:${icalEscape(uid)}`,
    `DTSTAMP:${icalDate(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icalEscape(summary)}`,
    `DESCRIPTION:${icalEscape(description)}`,
    `STATUS:${icalStatus(booking.status)}`,
    "END:VEVENT",
  ];
}

function buildCalendar(bookings: CalendarBooking[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sharmar Marketplace//Owner Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sharmar Owner Bookings",
    ...bookings.flatMap(bookingToEvent),
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const ownerToken = decodeURIComponent(String(token || "")).trim();
  const serverToken = getServerToken();

  if (!ownerToken || !serverToken) {
    return calendarResponse(emptyCalendar(), 200);
  }

  try {
    const ownerEmail = await loadOwnerEmail(ownerToken);
    if (!ownerEmail) return calendarResponse(emptyCalendar(), 200);

    const ownerBoats = await loadOwnerBoats(ownerEmail, serverToken);
    const ownerBookings = await loadOwnerBookings(ownerBoats, serverToken);

    return calendarResponse(buildCalendar(ownerBookings));
  } catch {
    return calendarResponse(emptyCalendar(), 200);
  }
}
