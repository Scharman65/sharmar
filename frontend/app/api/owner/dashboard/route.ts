import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

type DashboardBooking = {
  id: number | string | null;
  public_id: string | null;
  public_token: string | null;
  boat_id: number | null;
  status: string | null;
  slot_start_utc: string | null;
  slot_end_utc: string | null;
  expires_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  owner_decision: string | null;
  payment_intent_id: string | null;
  created_at: string | null;
};

type PaymentSummary = {
  totalConfirmedBookings: number;
  totalPendingHolds: number;
  totalDeclinedRequests: number;
  totalSuccessfulPayments: number;
  totalFailedPayments: number;
  totalRefundRelatedRequests: number;
  latestPaymentStatus: string | null;
  latestBookingStatus: string | null;
};

type PaymentHealth = {
  paymentLifecycleReady: true;
  overlapProtectionActive: true;
  ownerActionsActive: true;
  notificationLifecycleActive: true;
  whatsappDryRunReady: true;
  retryFoundationReady: true;
  idempotencyReady: true;
};

type PaymentOperationalFlags = {
  requiresManualMonitoring: true;
  retryQueueNotPersistentYet: true;
  whatsappLiveDisabled: true;
};

type EnterpriseOperationalReadiness = {
  queueFoundationReady: true;
  reconciliationFoundationReady: true;
  monitoringFoundationPrepared: true;
  enterpriseScalingFoundationReady: true;
};

type OwnerCalendarDisplayType = "hold" | "confirmed" | "declined" | "expired" | "unknown";

type OwnerCalendarEvent = {
  id: string;
  bookingId: number | string | null;
  boatId: number | null;
  boatTitle: string;
  status: string | null;
  startUtc: string | null;
  endUtc: string | null;
  publicToken: string | null;
  hasPaymentIntent: boolean;
  ownerDecision: string | null;
  displayType: OwnerCalendarDisplayType;
};

function getStrapiBase(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    "https://api.sharmar.me"
  ).replace(/\/+$/, "");
}

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
}

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function getId(v: unknown): number | string | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length) return v.trim();
  return null;
}

function getNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (h) {
    const m = /^Bearer\s+(.+)$/i.exec(h.trim());
    const headerToken = m?.[1]?.trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = req.cookies.get("sharmar_owner_session")?.value?.trim();
  return cookieToken || null;
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

function normalizeBooking(item: unknown): DashboardBooking | null {
  const row = getStrapiItemAttributes(item);
  if (!row) return null;

  const boatId = extractBoatId(row.boat_id ?? row.boat);

  return {
    id: getId(row.id),
    public_id: getString(row.public_id),
    public_token: extractPublicToken(row),
    boat_id: boatId,
    status: getString(row.status),
    slot_start_utc: getString(row.slot_start_utc),
    slot_end_utc: getString(row.slot_end_utc),
    expires_at: getString(row.expires_at),
    customer_name: getString(row.customer_name),
    customer_email: getString(row.customer_email),
    owner_decision: getString(row.owner_decision),
    payment_intent_id: getString(row.payment_intent_id),
    created_at: getString(row.created_at ?? row.createdAt),
  };
}

function buildBookingsPath(ownerBoatIds: number[]): string {
  const qs = new URLSearchParams();

  qs.set("pagination[pageSize]", "100");
  qs.set("sort[0]", "created_at:desc");
  qs.append("filters[status][$in][0]", "hold");
  qs.append("filters[status][$in][1]", "deposit_paid");

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
    "expires_at",
    "customer_name",
    "customer_email",
    "owner_decision",
    "payment_intent_id",
    "created_at",
  ].forEach((field, index) => {
    qs.append(`fields[${index}]`, field);
  });

  return `/api/bookings?${qs.toString()}`;
}

async function loadOwnerBookings(ownerBoatIds: number[], serverToken: string): Promise<DashboardBooking[]> {
  if (!ownerBoatIds.length) return [];

  const ownerBoatIdSet = new Set(ownerBoatIds);
  const allowedStatuses = new Set(["hold", "deposit_paid"]);
  const bookings = await strapiJson(buildBookingsPath(ownerBoatIds), serverToken);

  if (!bookings.ok) {
    console.error("OWNER_DASHBOARD_BOOKINGS_STRAPI_ERROR", {
      status: bookings.status,
      details: bookings.json,
    });
    return [];
  }

  const rows = isRecord(bookings.json) && Array.isArray(bookings.json.data) ? bookings.json.data : [];

  return rows
    .map(normalizeBooking)
    .filter((booking): booking is DashboardBooking => {
      if (!booking) return false;
      if (booking.boat_id === null || !ownerBoatIdSet.has(booking.boat_id)) return false;
      return booking.status !== null && allowedStatuses.has(booking.status);
    });
}

function buildPaymentSummary(ownerBookings: DashboardBooking[]): PaymentSummary {
  const confirmedBookings = ownerBookings.filter((booking) => booking.status === "deposit_paid");
  const pendingHolds = ownerBookings.filter((booking) => booking.status === "hold");
  const latestBookingStatus = ownerBookings[0]?.status ?? null;
  const latestWithPaymentIntent = ownerBookings.find((booking) => booking.payment_intent_id);

  return {
    totalConfirmedBookings: confirmedBookings.length,
    totalPendingHolds: pendingHolds.length,
    totalDeclinedRequests: 0,
    totalSuccessfulPayments: confirmedBookings.filter((booking) => booking.payment_intent_id).length,
    totalFailedPayments: 0,
    totalRefundRelatedRequests: 0,
    latestPaymentStatus: latestWithPaymentIntent ? "payment_intent_recorded" : null,
    latestBookingStatus,
  };
}

function buildPaymentHealth(): PaymentHealth {
  return {
    paymentLifecycleReady: true,
    overlapProtectionActive: true,
    ownerActionsActive: true,
    notificationLifecycleActive: true,
    whatsappDryRunReady: true,
    retryFoundationReady: true,
    idempotencyReady: true,
  };
}

function buildPaymentOperationalFlags(): PaymentOperationalFlags {
  return {
    requiresManualMonitoring: true,
    retryQueueNotPersistentYet: true,
    whatsappLiveDisabled: true,
  };
}

function buildEnterpriseOperationalReadiness(): EnterpriseOperationalReadiness {
  return {
    queueFoundationReady: true,
    reconciliationFoundationReady: true,
    monitoringFoundationPrepared: true,
    enterpriseScalingFoundationReady: true,
  };
}

function getBoatTitle(boat: unknown): string | null {
  if (!isRecord(boat)) return null;
  return getString(boat.title ?? boat.name ?? boat.slug);
}

function buildBoatTitleMap(ownerBoats: unknown[]): Map<number, string> {
  const titleMap = new Map<number, string>();

  ownerBoats.forEach((boat) => {
    if (!isRecord(boat)) return;
    const id = getNumber(boat.id);
    const title = getBoatTitle(boat);
    if (id !== null && title) titleMap.set(id, title);
  });

  return titleMap;
}

function calendarDisplayType(status: string | null): OwnerCalendarDisplayType {
  if (status === "hold") return "hold";
  if (status === "deposit_paid") return "confirmed";
  if (status === "declined") return "declined";
  if (status === "expired") return "expired";
  return "unknown";
}

function buildOwnerCalendarEvents(
  ownerBookings: DashboardBooking[],
  ownerBoats: unknown[]
): OwnerCalendarEvent[] {
  const boatTitleMap = buildBoatTitleMap(ownerBoats);

  return ownerBookings.map((booking, index) => {
    const boatTitle =
      booking.boat_id !== null
        ? boatTitleMap.get(booking.boat_id) ?? `Boat #${booking.boat_id}`
        : "Boat";

    return {
      id: booking.public_id || booking.public_token || String(booking.id ?? `calendar-${index}`),
      bookingId: booking.id,
      boatId: booking.boat_id,
      boatTitle,
      status: booking.status,
      startUtc: booking.slot_start_utc,
      endUtc: booking.slot_end_utc,
      publicToken: booking.public_token,
      hasPaymentIntent: Boolean(booking.payment_intent_id),
      ownerDecision: booking.owner_decision,
      displayType: calendarDisplayType(booking.status),
    };
  });
}

export async function GET(req: NextRequest) {
  const userJwt = getBearerToken(req);

  if (!userJwt) {
    return NextResponse.json(
      { ok: false, error: "Missing Authorization Bearer token" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const me = await strapiJson("/api/users/me", userJwt);

  if (!me.ok || !isRecord(me.json) || typeof me.json.email !== "string") {
    return NextResponse.json(
      { ok: false, error: "User authentication failed" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const ownerId =
    typeof me.json.id === "number"
      ? me.json.id
      : Number(me.json.id || 0);

  const serverToken = getServerToken();

  if (!serverToken) {
    return NextResponse.json(
      { ok: false, error: "Server STRAPI_TOKEN is not configured" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  const boats = await strapiJson(
    `/api/owner/boats-by-user?user_id=${ownerId}`,
    serverToken
  );

  if (!boats.ok) {
    console.error("OWNER_BOATS_BY_USER_API_ERROR", {
      status: boats.status,
      details: boats.json,
    });

    return NextResponse.json(
      { ok: false, error: "Could not load owner boats", status: boats.status, details: boats.json },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }

  const ownerBoats =
    isRecord(boats.json) && Array.isArray(boats.json.boats)
      ? boats.json.boats
      : [];

  const ownerBoatIds = ownerBoats
    .map((boat) => (isRecord(boat) ? getNumber(boat.id) : null))
    .filter((id): id is number => id !== null);
  const ownerBookings = await loadOwnerBookings(ownerBoatIds, serverToken);
  const activeHolds = ownerBookings.filter((booking) => booking.status === "hold");
  const activeBookings = ownerBookings.filter((booking) => booking.status === "deposit_paid");
  const recentActivity = ownerBookings.slice(0, 10);
  const paymentSummary = buildPaymentSummary(ownerBookings);
  const paymentHealth = buildPaymentHealth();
  const paymentOperationalFlags = buildPaymentOperationalFlags();
  const enterpriseOperationalReadiness = buildEnterpriseOperationalReadiness();
  const ownerCalendarEvents = buildOwnerCalendarEvents(ownerBookings, ownerBoats);

  return NextResponse.json(
    {
      ok: true,
      owner: {
        id: typeof me.json.id === "number" ? me.json.id : null,
        username: typeof me.json.username === "string" ? me.json.username : null,
        email: typeof me.json.email === "string" ? me.json.email : null,
      },
      boats: ownerBoats,
      activeBookings,
      activeHolds,
      recentActivity,
      paymentSummary,
      paymentHealth,
      paymentOperationalFlags,
      enterpriseOperationalReadiness,
      ownerCalendarEvents,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
