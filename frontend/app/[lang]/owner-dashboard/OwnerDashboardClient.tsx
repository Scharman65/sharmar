"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OwnerBoat = {
  id?: number;
  documentId?: string;
  title?: string | null;
  slug?: string | null;
  booking_enabled?: boolean | null;
  contacts_visible?: boolean | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  listing_type?: string | null;
  boat_type?: string | null;
};

type BookingActivity = {
  id?: number | string | null;
  public_id?: string | null;
  public_token?: string | null;
  status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  slot_start_utc?: string | null;
  slot_end_utc?: string | null;
};

type OccupancyItem = {
  id?: number | string | null;
  public_id?: string | null;
  status?: string | null;
  slot_start_utc?: string | null;
  slot_end_utc?: string | null;
};

type OwnerCalendarDisplayType = "hold" | "confirmed" | "declined" | "expired" | "unknown";

type OwnerCalendarEvent = {
  id?: string | null;
  bookingId?: number | string | null;
  boatId?: number | null;
  boatTitle?: string | null;
  status?: string | null;
  startUtc?: string | null;
  endUtc?: string | null;
  publicToken?: string | null;
  hasPaymentIntent?: boolean;
  ownerDecision?: string | null;
  displayType?: OwnerCalendarDisplayType;
};

type CalendarEventGroup = {
  dateKey: string;
  label: string;
  events: OwnerCalendarEvent[];
};

type PaymentSummary = {
  totalConfirmedBookings?: number;
  totalPendingHolds?: number;
  totalDeclinedRequests?: number;
  totalSuccessfulPayments?: number;
  totalFailedPayments?: number;
  totalRefundRelatedRequests?: number;
  latestPaymentStatus?: string | null;
  latestBookingStatus?: string | null;
};

type PaymentHealth = {
  paymentLifecycleReady?: boolean;
  overlapProtectionActive?: boolean;
  ownerActionsActive?: boolean;
  notificationLifecycleActive?: boolean;
  whatsappDryRunReady?: boolean;
  retryFoundationReady?: boolean;
  idempotencyReady?: boolean;
};

type PaymentOperationalFlags = {
  requiresManualMonitoring?: boolean;
  retryQueueNotPersistentYet?: boolean;
  whatsappLiveDisabled?: boolean;
};

type EnterpriseOperationalReadiness = {
  queueFoundationReady?: boolean;
  reconciliationFoundationReady?: boolean;
  monitoringFoundationPrepared?: boolean;
  enterpriseScalingFoundationReady?: boolean;
};

type ApiPayload = {
  ok?: boolean;
  error?: string;
  owner?: {
    id?: number | null;
    username?: string | null;
    email?: string | null;
  };
  boats?: OwnerBoat[];
  activeBookings?: OccupancyItem[];
  activeHolds?: OccupancyItem[];
  recentActivity?: BookingActivity[];
  ownerCalendarEvents?: OwnerCalendarEvent[];
  paymentSummary?: PaymentSummary;
  paymentHealth?: PaymentHealth;
  paymentOperationalFlags?: PaymentOperationalFlags;
  enterpriseOperationalReadiness?: EnterpriseOperationalReadiness;
};

function statusLabel(boat: OwnerBoat) {
  if (boat.booking_enabled === true) return "Published";
  return "Listing saved for review";
}

function statusColor(boat: OwnerBoat) {
  if (boat.booking_enabled === true) return "rgba(22,163,74,0.18)";
  return "rgba(234,179,8,0.18)";
}

function bookingActionKey(booking: BookingActivity, index: number) {
  return booking.public_token || booking.public_id || String(booking.id ?? index);
}

function readinessLabel(value?: boolean) {
  return value ? "Ready" : "Not ready";
}

function getCalendarTimeMs(event: OwnerCalendarEvent): number {
  const raw = event.startUtc || event.endUtc || "";
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function getCalendarDateKey(event: OwnerCalendarEvent): string {
  const raw = event.startUtc || event.endUtc || "";
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return "unscheduled";
  return new Date(ms).toISOString().slice(0, 10);
}

function formatCalendarDateLabel(dateKey: string): string {
  if (dateKey === "unscheduled") return "Date not set";

  const ms = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return dateKey;

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

function groupCalendarEvents(events: OwnerCalendarEvent[]): CalendarEventGroup[] {
  const sorted = [...events].sort((a, b) => getCalendarTimeMs(a) - getCalendarTimeMs(b));
  const groups = new Map<string, OwnerCalendarEvent[]>();

  sorted.forEach((event) => {
    const key = getCalendarDateKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  });

  return Array.from(groups.entries()).map(([dateKey, groupEvents]) => ({
    dateKey,
    label: formatCalendarDateLabel(dateKey),
    events: groupEvents,
  }));
}

function calendarBadgeLabel(displayType?: OwnerCalendarDisplayType): string {
  if (displayType === "hold") return "HOLD";
  if (displayType === "confirmed") return "CONFIRMED";
  if (displayType === "declined") return "DECLINED";
  if (displayType === "expired") return "EXPIRED";
  return "UNKNOWN";
}

function calendarBadgeBackground(displayType?: OwnerCalendarDisplayType): string {
  if (displayType === "hold") return "rgba(234,179,8,0.18)";
  if (displayType === "confirmed") return "rgba(22,163,74,0.18)";
  if (displayType === "declined") return "rgba(220,38,38,0.18)";
  if (displayType === "expired") return "rgba(148,163,184,0.18)";
  return "rgba(255,255,255,0.08)";
}

function isUpcomingCalendarEvent(event: OwnerCalendarEvent): boolean {
  const raw = event.startUtc || event.endUtc || "";
  const timeMs = Date.parse(raw);
  return Number.isFinite(timeMs) && timeMs >= Date.now();
}

export default function OwnerDashboardClient() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const lang = typeof params?.lang === "string" ? params.lang : "en";

  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const boats = useMemo(() => data?.boats ?? [], [data]);
  const recentActivity = useMemo(() => data?.recentActivity ?? [], [data]);
  const ownerCalendarEvents = useMemo(() => data?.ownerCalendarEvents ?? [], [data]);
  const occupancyItems = useMemo(
    () => [...(data?.activeBookings ?? []), ...(data?.activeHolds ?? [])],
    [data]
  );
  const calendarGroups = useMemo(() => groupCalendarEvents(ownerCalendarEvents), [ownerCalendarEvents]);
  const activeBookingsCount = Array.isArray(data?.activeBookings) ? data.activeBookings.length : 0;
  const activeHoldsCount = Array.isArray(data?.activeHolds) ? data.activeHolds.length : 0;
  const recentActivityCount = Array.isArray(data?.recentActivity) ? data.recentActivity.length : 0;
  const upcomingBookingsCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "confirmed" && isUpcomingCalendarEvent(event)
  ).length;
  const upcomingHoldsCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "hold" && isUpcomingCalendarEvent(event)
  ).length;
  const expiredCalendarCount = ownerCalendarEvents.filter(
    (event) => event.displayType === "expired"
  ).length;

  useEffect(() => {
    const token = localStorage.getItem("owner_jwt")?.trim();

    if (!token) {
      router.replace(`/${lang}/owner-login`);
      return;
    }

    let alive = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/owner/dashboard", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as ApiPayload | null;

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setError(json?.error || "Could not load owner boats.");
          return;
        }

        setData(json);
      } catch {
        if (alive) setError("Could not load owner boats.");
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [lang, router]);

  function logout() {
    localStorage.removeItem("owner_jwt");
    router.replace(`/${lang}/owner-login`);
  }

  async function refreshDashboard() {
    const token = localStorage.getItem("owner_jwt")?.trim();
    if (!token) return;

    const res = await fetch("/api/owner/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as ApiPayload | null;

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Could not refresh owner dashboard.");
    }

    setData(json);
  }

  async function runOwnerAction(booking: BookingActivity, index: number, action: "confirm" | "decline") {
    const publicToken = booking.public_token?.trim();
    const key = bookingActionKey(booking, index);

    if (!publicToken) return;

    setProcessingAction((prev) => ({ ...prev, [key]: action }));
    setActionSuccess((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActionError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch(`/api/owner-actions/${encodeURIComponent(publicToken)}/${action}`, {
        method: "POST",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Could not ${action} booking.`);
      }

      setActionSuccess((prev) => ({
        ...prev,
        [key]: action === "confirm" ? "Booking confirmed." : "Booking declined.",
      }));
      await refreshDashboard();
    } catch (err) {
      setActionError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setProcessingAction((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  return (
    <main className="main">
      <div className="container">
        <div className="detail-top">
          <div>
            <h1 className="h1">Owner dashboard</h1>
            <p className="kicker" style={{ marginTop: 8 }}>
              {data?.owner?.email ? `Signed in as ${data.owner.email}` : "Manage your boat listings"}
            </p>
          </div>

          <button className="button secondary" type="button" onClick={logout}>
            Log out
          </button>
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <Link className="button" href={`/${lang}/add/rent/motor`}>
            Add motor boat for rent
          </Link>
          <Link className="button secondary" href={`/${lang}/add/rent/sail`}>
            Add sail boat for rent
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/motor`}>
            Add motor boat for sale
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/sail`}>
            Add sail boat for sale
          </Link>
        </div>

        {isLoading ? (
          <p className="kicker" style={{ marginTop: 24 }}>Loading...</p>
        ) : null}

        {error ? (
          <div className="card" style={{ marginTop: 24, padding: 18 }}>
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div style={{ marginTop: 26 }}>
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginBottom: 24,
              }}
            >
              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>Active bookings</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeBookingsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>Active holds</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeHoldsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>Recent activity</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {recentActivityCount}
                </div>
              </div>
            </div>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Notification status</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Email notifications active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Customer request email active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Confirmed/declined customer emails prepared
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Notification audit layer active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp provider foundation ready
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp dry-run adapter ready
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Notification retry foundation ready
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Idempotency layer prepared
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Live WhatsApp delivery disabled
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp integration coming soon
                </p>
              </div>
            </section>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Payment Operations</h2>
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Confirmed bookings</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalConfirmedBookings ?? 0}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Pending holds</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalPendingHolds ?? 0}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Successful payments</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalSuccessfulPayments ?? 0}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Failed payments</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalFailedPayments ?? 0}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Declined requests</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalDeclinedRequests ?? 0}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Refund related</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {data?.paymentSummary?.totalRefundRelatedRequests ?? 0}
                  </div>
                </div>
              </div>
              <div className="meta-row" style={{ marginTop: 14 }}>
                <span>Latest payment: {data?.paymentSummary?.latestPaymentStatus || "not available"}</span>
                <span>·</span>
                <span>Latest booking: {data?.paymentSummary?.latestBookingStatus || "not available"}</span>
              </div>
            </section>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Payment Health</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Payment lifecycle: {readinessLabel(data?.paymentHealth?.paymentLifecycleReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Overlap protection: {readinessLabel(data?.paymentHealth?.overlapProtectionActive)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Owner actions: {readinessLabel(data?.paymentHealth?.ownerActionsActive)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Notifications: {readinessLabel(data?.paymentHealth?.notificationLifecycleActive)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp dry-run: {readinessLabel(data?.paymentHealth?.whatsappDryRunReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Retry foundation: {readinessLabel(data?.paymentHealth?.retryFoundationReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Idempotency: {readinessLabel(data?.paymentHealth?.idempotencyReady)}
                </p>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Operational payment lifecycle active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Stripe lifecycle protected
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Hold overlap protection active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Customer notification lifecycle active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Retry/idempotency foundation active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp live delivery disabled
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Manual monitoring required: {data?.paymentOperationalFlags?.requiresManualMonitoring ? "yes" : "no"}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Persistent retry queue: {data?.paymentOperationalFlags?.retryQueueNotPersistentYet ? "not enabled yet" : "enabled"}
                </p>
              </div>
            </section>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Queue Infrastructure</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Queue foundation prepared: {readinessLabel(data?.enterpriseOperationalReadiness?.queueFoundationReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Retry engine prepared: {readinessLabel(data?.paymentHealth?.retryFoundationReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Idempotency active: {readinessLabel(data?.paymentHealth?.idempotencyReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Persistent storage not enabled
                </p>
              </div>
            </section>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Operational Reconciliation</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Reconciliation layer prepared: {readinessLabel(data?.enterpriseOperationalReadiness?.reconciliationFoundationReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Payment operational visibility active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Notification audit layer active
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Manual reconciliation currently required
                </p>
              </div>
            </section>

            <section className="card" style={{ padding: 18, marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Enterprise Readiness</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <p className="kicker" style={{ margin: 0 }}>
                  Multi-provider notification architecture prepared
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  WhatsApp live provider disabled
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Background workers not enabled
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Monitoring vendors not connected
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Monitoring foundation prepared: {readinessLabel(data?.enterpriseOperationalReadiness?.monitoringFoundationPrepared)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Enterprise scaling foundation active: {readinessLabel(data?.enterpriseOperationalReadiness?.enterpriseScalingFoundationReady)}
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Production readiness documentation prepared
                </p>
                <p className="kicker" style={{ margin: 0 }}>
                  Runtime infrastructure ADRs prepared
                </p>
              </div>
            </section>

            <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>My boats</h2>

            {boats.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {boats.map((boat) => (
                  <div
                    key={boat.documentId || boat.id || boat.slug}
                    className="card"
                    style={{
                      padding: 18,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 20 }}>
                          {boat.title || `Boat #${boat.id}`}
                        </h3>
                        <p className="kicker" style={{ marginTop: 6 }}>
                          {boat.boat_type || "Boat"} · {boat.listing_type || "listing"}
                        </p>
                      </div>

                      <span
                        className="pill"
                        style={{
                          alignSelf: "start",
                          background: statusColor(boat),
                        }}
                      >
                        {statusLabel(boat)}
                      </span>
                    </div>

                    <div className="meta-row">
                      <span>ID: {boat.id ?? "—"}</span>
                      <span>·</span>
                      <span>Slug: {boat.slug ?? "—"}</span>
                      <span>·</span>
                      <span>Booking: {boat.booking_enabled ? "enabled" : "disabled"}</span>
                    </div>

                    {boat.booking_enabled && boat.slug ? (
                      <div>
                        <Link className="button secondary" href={`/${lang}/boats/${boat.slug}`}>
                          View public page
                        </Link>
                      </div>
                    ) : (
                      <p className="kicker" style={{ margin: 0 }}>
                        Visible after approval.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 18 }}>
                <p style={{ margin: 0 }}>You have no boats yet.</p>
              </div>
            )}

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>Recent booking activity</h2>

              {recentActivity.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {recentActivity.map((booking, index) => {
                    const key = bookingActionKey(booking, index);
                    const publicToken = booking.public_token?.trim();
                    const isProcessing = Boolean(processingAction[key]);
                    const canAct = booking.status === "hold" && Boolean(publicToken) && !isProcessing;

                    return (
                      <div
                        key={booking.id ?? booking.public_id ?? index}
                        className="card"
                        style={{
                          padding: 18,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>
                              {booking.public_id || "—"}
                            </h3>
                            <p className="kicker" style={{ marginTop: 6 }}>
                              {booking.customer_name || "—"} · {booking.customer_email || "—"}
                            </p>
                          </div>

                          <span
                            className="pill"
                            style={{
                              alignSelf: "start",
                              background: "rgba(255,255,255,0.08)",
                            }}
                          >
                            {booking.status || "—"}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span>Start: {booking.slot_start_utc || "—"}</span>
                          <span>·</span>
                          <span>End: {booking.slot_end_utc || "—"}</span>
                        </div>

                        {booking.status === "hold" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div className="actions" style={{ marginTop: 0 }}>
                              <button
                                className="button secondary"
                                type="button"
                                disabled={!canAct}
                                onClick={() => runOwnerAction(booking, index, "confirm")}
                              >
                                {processingAction[key] === "confirm" ? "Confirming..." : "Confirm"}
                              </button>
                              <button
                                className="button secondary"
                                type="button"
                                disabled={!canAct}
                                onClick={() => runOwnerAction(booking, index, "decline")}
                              >
                                {processingAction[key] === "decline" ? "Declining..." : "Decline"}
                              </button>
                            </div>

                            {!publicToken ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                Owner action token unavailable.
                              </p>
                            ) : null}

                            {actionSuccess[key] ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                {actionSuccess[key]}
                              </p>
                            ) : null}

                            {actionError[key] ? (
                              <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                {actionError[key]}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>No recent booking activity yet.</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>Booking Calendar</h2>

              <div
                className="card"
                style={{
                  padding: 18,
                  marginBottom: 14,
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Upcoming bookings</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {upcomingBookingsCount}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Upcoming holds requiring attention</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {upcomingHoldsCount}
                  </div>
                </div>
                <div>
                  <p className="kicker" style={{ margin: 0 }}>Expired entries</p>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>
                    {expiredCalendarCount}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 18, marginBottom: 14 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <p className="kicker" style={{ margin: 0 }}>
                    Google Calendar sync not enabled
                  </p>
                  <p className="kicker" style={{ margin: 0 }}>
                    iCal export foundation ready
                  </p>
                  <p className="kicker" style={{ margin: 0 }}>
                    Export URL placeholder: /api/owner/calendar/[owner-export-token]
                  </p>
                  <p className="kicker" style={{ margin: 0 }}>
                    External provider sync disabled
                  </p>
                </div>
              </div>

              {calendarGroups.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {calendarGroups.map((group) => (
                    <div key={group.dateKey}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 20 }}>{group.label}</h3>
                      <div style={{ display: "grid", gap: 12 }}>
                        {group.events.map((event, index) => (
                          <div
                            key={event.id || `${group.dateKey}-${index}`}
                            className="card"
                            style={{
                              padding: 16,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: 18 }}>
                                  {event.boatTitle || "Boat"}
                                </h4>
                                <p className="kicker" style={{ marginTop: 6 }}>
                                  {event.status || "—"} · Payment intent: {event.hasPaymentIntent ? "yes" : "no"}
                                </p>
                              </div>

                              <span
                                className="pill"
                                style={{
                                  alignSelf: "start",
                                  background: calendarBadgeBackground(event.displayType),
                                }}
                              >
                                {calendarBadgeLabel(event.displayType)}
                              </span>
                            </div>

                            <div className="meta-row">
                              <span>Start: {event.startUtc || "—"}</span>
                              <span>·</span>
                              <span>End: {event.endUtc || "—"}</span>
                            </div>

                            <div className="meta-row">
                              <span>Booking: {event.bookingId ?? "—"}</span>
                              <span>·</span>
                              <span>Owner decision: {event.ownerDecision || "—"}</span>
                              <span>·</span>
                              <span>Token: {event.publicToken || "—"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>No booking calendar entries yet.</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>Occupancy overview</h2>

              {occupancyItems.length ? (
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  }}
                >
                  {occupancyItems.map((item, index) => {
                    const isHold = item.status === "hold";
                    const label = isHold ? "HOLD" : "BOOKED";
                    const background = isHold ? "rgba(234,179,8,0.18)" : "rgba(22,163,74,0.18)";

                    return (
                      <div
                        key={item.id ?? item.public_id ?? `${item.status ?? "occupancy"}-${index}`}
                        className="card"
                        style={{
                          padding: 18,
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: 20 }}>
                              {item.public_id || "—"}
                            </h3>
                            <p className="kicker" style={{ marginTop: 6 }}>
                              {item.status || "—"}
                            </p>
                          </div>

                          <span
                            className="pill"
                            style={{
                              alignSelf: "start",
                              background,
                            }}
                          >
                            {label}
                          </span>
                        </div>

                        <div className="meta-row">
                          <span>Start: {item.slot_start_utc || "—"}</span>
                          <span>·</span>
                          <span>End: {item.slot_end_utc || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: 18 }}>
                  <p style={{ margin: 0 }}>No active occupancy yet.</p>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
