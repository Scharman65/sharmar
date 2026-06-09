"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OwnerAvailabilityCalendar } from "@/components/owner/OwnerAvailabilityCalendar";

type DashboardCopy = {
  ownerDashboard: string;
  signedInAs: string;
  manageBoatListings: string;
  logout: string;
  addMotorBoatRent: string;
  addSailBoatRent: string;
  addMotorBoatSale: string;
  addSailBoatSale: string;
  loading: string;
  activeBookings: string;
  activeHolds: string;
  recentActivity: string;
  published: string;
  listingSavedForReview: string;
  ready: string;
  notReady: string;
  dateNotSet: string;

  myBoats: string;
  bookingEnabled: string;
  bookingDisabled: string;
  noBoatsYet: string;

  recentBookingActivity: string;
  noRecentBookingActivity: string;

  confirm: string;
  confirming: string;
  decline: string;
  declining: string;

  bookingCalendar: string;
  noBookingCalendarEntries: string;

  occupancyOverview: string;
  noActiveOccupancy: string;
};

function pageCopy(lang: string): DashboardCopy {
  if (lang === "ru") {
    return {
      ownerDashboard: "Кабинет владельца",
      signedInAs: "Вход выполнен как",
      manageBoatListings: "Управляйте своими объявлениями лодок",
      logout: "Выйти",
      addMotorBoatRent: "Добавить моторную лодку в аренду",
      addSailBoatRent: "Добавить парусную лодку в аренду",
      addMotorBoatSale: "Добавить моторную лодку на продажу",
      addSailBoatSale: "Добавить парусную лодку на продажу",
      loading: "Загрузка...",
      activeBookings: "Активные бронирования",
      activeHolds: "Активные удержания",
      recentActivity: "Недавняя активность",
      published: "Опубликовано",
      listingSavedForReview: "Сохранено для проверки",
      ready: "Готово",
      notReady: "Не готово",
      dateNotSet: "Дата не указана",

      myBoats: "Мои лодки",
      bookingEnabled: "Бронирование включено",
      bookingDisabled: "Бронирование выключено",
      noBoatsYet: "У вас пока нет лодок.",

      recentBookingActivity: "Недавняя активность бронирований",
      noRecentBookingActivity: "Пока нет активности бронирований.",

      confirm: "Подтвердить",
      confirming: "Подтверждение...",
      decline: "Отклонить",
      declining: "Отклонение...",

      bookingCalendar: "Календарь бронирований",
      noBookingCalendarEntries: "Пока нет записей календаря.",

      occupancyOverview: "Обзор загрузки",
      noActiveOccupancy: "Пока нет активной загрузки.",
    };
  }

  if (lang === "me") {
    return {
      ownerDashboard: "Kontrolna tabla vlasnika",
      signedInAs: "Prijavljen kao",
      manageBoatListings: "Upravljajte svojim oglasima plovila",
      logout: "Odjava",
      addMotorBoatRent: "Dodaj motorno plovilo za najam",
      addSailBoatRent: "Dodaj jedrilicu za najam",
      addMotorBoatSale: "Dodaj motorno plovilo za prodaju",
      addSailBoatSale: "Dodaj jedrilicu za prodaju",
      loading: "Učitavanje...",
      activeBookings: "Aktivne rezervacije",
      activeHolds: "Aktivna zadržavanja",
      recentActivity: "Nedavne aktivnosti",
      published: "Objavljeno",
      listingSavedForReview: "Sačuvano za pregled",
      ready: "Spremno",
      notReady: "Nije spremno",
      dateNotSet: "Datum nije postavljen",

      myBoats: "Moja plovila",
      bookingEnabled: "Rezervacije omogućene",
      bookingDisabled: "Rezervacije onemogućene",
      noBoatsYet: "Još nemate plovila.",

      recentBookingActivity: "Nedavne aktivnosti rezervacija",
      noRecentBookingActivity: "Još nema aktivnosti rezervacija.",

      confirm: "Potvrdi",
      confirming: "Potvrđivanje...",
      decline: "Odbij",
      declining: "Odbijanje...",

      bookingCalendar: "Kalendar rezervacija",
      noBookingCalendarEntries: "Još nema unosa u kalendaru.",

      occupancyOverview: "Pregled zauzetosti",
      noActiveOccupancy: "Još nema aktivne zauzetosti.",
    };
  }

  return {
    ownerDashboard: "Owner dashboard",
    signedInAs: "Signed in as",
    manageBoatListings: "Manage your boat listings",
    logout: "Log out",
    addMotorBoatRent: "Add motor boat for rent",
    addSailBoatRent: "Add sail boat for rent",
    addMotorBoatSale: "Add motor boat for sale",
    addSailBoatSale: "Add sail boat for sale",
    loading: "Loading...",
    activeBookings: "Active bookings",
    activeHolds: "Active holds",
    recentActivity: "Recent activity",
    published: "Published",
    listingSavedForReview: "Listing saved for review",
    ready: "Ready",
    notReady: "Not ready",
    dateNotSet: "Date not set",

    myBoats: "My boats",
    bookingEnabled: "Booking enabled",
    bookingDisabled: "Booking disabled",
    noBoatsYet: "You have no boats yet.",

    recentBookingActivity: "Recent booking activity",
    noRecentBookingActivity: "No recent booking activity yet.",

    confirm: "Confirm",
    confirming: "Confirming...",
    decline: "Decline",
    declining: "Declining...",

    bookingCalendar: "Booking Calendar",
    noBookingCalendarEntries: "No booking calendar entries yet.",

    occupancyOverview: "Occupancy overview",
    noActiveOccupancy: "No active occupancy yet.",
  };
}


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


type OwnerBlackout = {
  id: number;
  boat_id: number;
  start_utc: string;
  end_utc: string;
  reason?: string;
  created_at?: string;
};

type BlackoutFormState = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
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
  if (boat.booking_enabled === true) return pageCopy("en").published;
  return pageCopy("en").listingSavedForReview;
}

function statusColor(boat: OwnerBoat) {
  if (boat.booking_enabled === true) return "rgba(22,163,74,0.18)";
  return "rgba(234,179,8,0.18)";
}

function bookingActionKey(booking: BookingActivity, index: number) {
  return booking.public_token || booking.public_id || String(booking.id ?? index);
}

function readinessLabel(value?: boolean) {
  return value ? pageCopy("en").ready : pageCopy("en").notReady;
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
  if (dateKey === "unscheduled") return pageCopy("en").dateNotSet;

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


function formatOwnerBlackoutDate(value: string | null | undefined, lang: string): string {
  if (!value) return "—";

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

function formatOwnerBlackoutTime(value: string | null | undefined, lang: string): string {
  if (!value) return "—";

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;

  const locale = lang === "ru" ? "ru-RU" : lang === "me" ? "sr-Latn-ME" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ms));
}

function formatOwnerBlackoutRange(blackout: OwnerBlackout, lang: string): string {
  const startDate = formatOwnerBlackoutDate(blackout.start_utc, lang);
  const startTime = formatOwnerBlackoutTime(blackout.start_utc, lang);
  const endTime = formatOwnerBlackoutTime(blackout.end_utc, lang);

  return `${startDate}, ${startTime}–${endTime}`;
}

function buildBlackoutIso(date: string, time: string): string {
  const cleanDate = String(date || "").trim();
  const cleanTime = String(time || "").trim();

  if (!cleanDate || !cleanTime) return "";

  const value = new Date(`${cleanDate}T${cleanTime}:00.000Z`).toISOString();
  return value;
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

  const [boatBlackouts, setBoatBlackouts] = useState<Record<number, OwnerBlackout[]>>({});
  const [blackoutLoading, setBlackoutLoading] = useState<Record<number, boolean>>({});
  const [blackoutError, setBlackoutError] = useState<Record<number, string>>({});
  const [blackoutBusy, setBlackoutBusy] = useState<Record<number, boolean>>({});
  const [blackoutForm, setBlackoutForm] = useState<Record<number, BlackoutFormState>>({});



  
  async function loadBlackoutsForBoat(boatId: number) {
    try {
      setBlackoutLoading((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch(`/api/owner/blackouts?boat_id=${boatId}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "blackout_load_failed");
      }

      setBoatBlackouts((prev) => ({
        ...prev,
        [boatId]: Array.isArray(json?.blackouts) ? json.blackouts : [],
      }));

      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: "",
      }));
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_load_failed",
      }));
    } finally {
      setBlackoutLoading((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }

  async function createBlackoutForBoat(boatId: number) {
    const form = blackoutForm[boatId] || {
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      reason: "",
    };

    const cleanStartDate = String(form.startDate || "").trim();
    const cleanStartTime = String(form.startTime || "09:00").trim();
    const cleanEndDate = String(form.endDate || form.startDate || "").trim();
    const cleanEndTime = String(form.endTime || "17:00").trim();

    if (!cleanStartDate || !cleanEndDate) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: "Select start and end date.",
      }));
      return;
    }

    const startUtc = buildBlackoutIso(cleanStartDate, cleanStartTime);
    const endUtc = buildBlackoutIso(cleanEndDate, cleanEndTime);

    try {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch("/api/owner/blackouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          boat_id: boatId,
          start_utc: startUtc,
          end_utc: endUtc,
          reason: form.reason || "owner_blocked",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "blackout_create_failed");
      }

      setBlackoutForm((prev) => ({
        ...prev,
        [boatId]: {
          startDate: cleanStartDate,
          startTime: cleanStartTime,
          endDate: cleanEndDate,
          endTime: cleanEndTime,
          reason: "",
        },
      }));

      await loadBlackoutsForBoat(boatId);
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_create_failed",
      }));
    } finally {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }

  async function deleteBlackoutForBoat(boatId: number, blackoutId: number) {
    try {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: true,
      }));

      const res = await fetch(`/api/owner/blackouts/${blackoutId}?boat_id=${boatId}`, {
        method: "DELETE",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "blackout_delete_failed");
      }

      await loadBlackoutsForBoat(boatId);
    } catch (e) {
      setBlackoutError((prev) => ({
        ...prev,
        [boatId]: e instanceof Error ? e.message : "blackout_delete_failed",
      }));
    } finally {
      setBlackoutBusy((prev) => ({
        ...prev,
        [boatId]: false,
      }));
    }
  }


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
    boats.forEach((boat) => {
      if (boat.id) {
        loadBlackoutsForBoat(Number(boat.id));
      }
    });
  }, [boats]);

useEffect(() => {
    let alive = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/owner/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as ApiPayload | null;

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          setError(json?.error || pageCopy(lang).manageBoatListings);
          return;
        }

        setData(json);
      } catch {
        if (alive) setError(pageCopy(lang).manageBoatListings);
      } finally {
        if (alive) setIsLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [lang, router]);

  async function logout() {
    await fetch("/api/auth/owner-session", { method: "DELETE" });
    router.replace(`/${lang}/owner-login`);
  }

  async function refreshDashboard() {
    const res = await fetch("/api/owner/dashboard", {
      method: "GET",
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as ApiPayload | null;

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || pageCopy(lang).manageBoatListings);
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
        [key]: action === "confirm" ? pageCopy(lang).activeBookings : pageCopy(lang).activeHolds,
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
            <h1 className="h1">{pageCopy(lang).ownerDashboard}</h1>
            <p className="kicker" style={{ marginTop: 8 }}>
              {data?.owner?.email ? `${pageCopy(lang).signedInAs} ${data.owner.email}` : pageCopy(lang).manageBoatListings}
            </p>
          </div>

          <button className="button secondary" type="button" onClick={logout}>
            {pageCopy(lang).logout}
          </button>
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <Link className="button" href={`/${lang}/add/rent/motor`}>
            {pageCopy(lang).addMotorBoatRent}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/rent/sail`}>
            {pageCopy(lang).addSailBoatRent}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/motor`}>
            {pageCopy(lang).addMotorBoatSale}
          </Link>
          <Link className="button secondary" href={`/${lang}/add/sale/sail`}>
            {pageCopy(lang).addSailBoatSale}
          </Link>
        </div>

        {isLoading ? (
          <p className="kicker" style={{ marginTop: 24 }}>{pageCopy(lang).loading}</p>
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
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).activeBookings}</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeBookingsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).activeHolds}</p>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>
                  {activeHoldsCount}
                </div>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <p className="kicker" style={{ margin: 0 }}>{pageCopy(lang).recentActivity}</p>
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

            <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).myBoats}</h2>

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
                      <span>Booking: {boat.booking_enabled ? pageCopy(lang).bookingEnabled : pageCopy(lang).bookingDisabled}</span>
                    </div>

                    {boat.booking_enabled && boat.slug ? (
                      <div style={{ display: "grid", gap: 14 }}>
                        <div>
                          <Link className="button secondary" href={`/${lang}/boats/${boat.slug}`}>
                            View public page
                          </Link>
                        </div>

                        <div
                          className="card"
                          style={{
                            padding: 14,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <strong>Closed dates</strong>

                              <button
                                className="button secondary"
                                type="button"
                                onClick={() => loadBlackoutsForBoat(Number(boat.id))}
                              >
                                Refresh
                              </button>
                            </div>

                            {blackoutLoading[Number(boat.id)] ? (
                              <p className="kicker" style={{ margin: 0 }}>
                                Loading...
                              </p>
                            ) : null}

                            {blackoutError[Number(boat.id)] ? (
                              <p className="kicker" style={{ margin: 0, color: "#b91c1c" }}>
                                {blackoutError[Number(boat.id)]}
                              </p>
                            ) : null}

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                gap: 10,
                              }}
                            >
                              <input
                                type="date"
                                value={blackoutForm[Number(boat.id)]?.startDate || ""}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: e.target.value,
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: prev[Number(boat.id)]?.endDate || e.target.value,
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="time"
                                value={blackoutForm[Number(boat.id)]?.startTime || "09:00"}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || "",
                                    startTime: e.target.value,
                                    endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="date"
                                value={blackoutForm[Number(boat.id)]?.endDate || ""}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || e.target.value,
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: e.target.value,
                                    endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />

                              <input
                                type="time"
                                value={blackoutForm[Number(boat.id)]?.endTime || "17:00"}
                                onChange={(e) => setBlackoutForm((prev) => ({
                                  ...prev,
                                  [Number(boat.id)]: {
                                    startDate: prev[Number(boat.id)]?.startDate || "",
                                    startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                    endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                    endTime: e.target.value,
                                    reason: prev[Number(boat.id)]?.reason || "",
                                  },
                                }))}
                              />
                            </div>

                            <input
                              type="text"
                              placeholder="Reason"
                              value={blackoutForm[Number(boat.id)]?.reason || ""}
                              onChange={(e) => setBlackoutForm((prev) => ({
                                ...prev,
                                [Number(boat.id)]: {
                                  startDate: prev[Number(boat.id)]?.startDate || "",
                                  startTime: prev[Number(boat.id)]?.startTime || "09:00",
                                  endDate: prev[Number(boat.id)]?.endDate || prev[Number(boat.id)]?.startDate || "",
                                  endTime: prev[Number(boat.id)]?.endTime || "17:00",
                                  reason: e.target.value,
                                },
                              }))}
                            />

                            <button
                              className="button secondary"
                              type="button"
                              disabled={Boolean(blackoutBusy[Number(boat.id)])}
                              onClick={() => createBlackoutForBoat(Number(boat.id))}
                            >
                              Add closed date
                            </button>

                            <OwnerAvailabilityCalendar
                              lang={lang}
                              blackouts={boatBlackouts[Number(boat.id)] || []}
                            />

                            {boatBlackouts[Number(boat.id)]?.length ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                {boatBlackouts[Number(boat.id)].map((blackout) => (
                                  <div
                                    key={blackout.id}
                                    style={{
                                      padding: 10,
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.04)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                                      {formatOwnerBlackoutRange(blackout, lang)}
                                    </div>

                                    <div className="kicker" style={{ marginTop: 6 }}>
                                      {blackout.reason || "blocked"}
                                    </div>

                                    <button
                                      className="button secondary"
                                      type="button"
                                      disabled={Boolean(blackoutBusy[Number(boat.id)])}
                                      onClick={() => deleteBlackoutForBoat(Number(boat.id), blackout.id)}
                                      style={{ marginTop: 8 }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="kicker" style={{ margin: 0 }}>
                                No closed dates
                              </p>
                            )}
                          </div>
                        </div>
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
                <p style={{ margin: 0 }}>{pageCopy(lang).noBoatsYet}</p>
              </div>
            )}

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).recentBookingActivity}</h2>

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
                                {processingAction[key] === "confirm" ? pageCopy(lang).confirming : pageCopy(lang).confirm}
                              </button>
                              <button
                                className="button secondary"
                                type="button"
                                disabled={!canAct}
                                onClick={() => runOwnerAction(booking, index, "decline")}
                              >
                                {processingAction[key] === "decline" ? pageCopy(lang).declining : pageCopy(lang).decline}
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
                  <p style={{ margin: 0 }}>{pageCopy(lang).noRecentBookingActivity}</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).bookingCalendar}</h2>

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
                  <p style={{ margin: 0 }}>{pageCopy(lang).noBookingCalendarEntries}</p>
                </div>
              )}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 24 }}>{pageCopy(lang).occupancyOverview}</h2>

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
                  <p style={{ margin: 0 }}>{pageCopy(lang).noActiveOccupancy}</p>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
