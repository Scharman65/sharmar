"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Lang } from "@/i18n";

type StatusFilter = "all" | "draft" | "published" | "awaiting";
type LocaleFilter = "all" | "ru" | "en" | "sr-Latn-ME";
type ListingTypeFilter = "all" | "rent" | "sale";
type AdminSection = "overview" | "boats" | "routes" | "owners" | "bookings" | "payments" | "translations" | "quality" | "system";

type Summary = {
  totalBoats?: number | null;
  draftBoats?: number | null;
  publishedBoats?: number | null;
  boatsAwaitingReview?: number | null;
  totalOwners?: number | null;
  totalExperiences?: number | null;
  totalBookingRequests?: number | null;
  totalPayments?: number | null;
  defaultMarketplaceFeePercent?: number | null;
};

type BoatRow = {
  id?: number | null;
  documentId?: string | null;
  locale?: string | null;
  title?: string | null;
  slug?: string | null;
  listing_type?: string | null;
  boat_type?: string | null;
  vessel_type?: string | null;
  owner_user_id?: number | null;
  created_by_id?: number | null;
  owner_profile_id?: number | null;
  owner_email?: string | null;
  owner_username?: string | null;
  owner_display_name?: string | null;
  owner_phone?: string | null;
  owner_confirmed?: boolean | null;
  owner_blocked?: boolean | null;
  state?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cover_count?: number | null;
  images_count?: number | null;
  experiences_count?: number | null;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  price_per_week?: number | null;
  sale_price?: number | null;
  min_rental_hours?: number | null;
  currency?: string | null;
  instant_booking?: boolean | null;
  contacts_visible?: boolean | null;
};

type ExperienceRow = {
  id?: number | null;
  documentId?: string | null;
  locale?: string | null;
  title?: string | null;
  boatDocumentId?: string | null;
  boatTitle?: string | null;
  price?: number | null;
  duration_hours?: number | null;
  is_active?: boolean | null;
  state?: string | null;
};

type OwnerRow = {
  id?: number | null;
  user_id?: number | null;
  email?: string | null;
  username?: string | null;
  confirmed?: boolean | null;
  blocked?: boolean | null;
  profile_id?: number | null;
  display_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

type BookingRequestRow = {
  id?: number | null;
  status?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  boat_title?: string | null;
  experience_title?: string | null;
  owner_amount?: number | null;
  marketplace_fee_amount?: number | null;
  customer_total_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
};

type PaymentRow = {
  id?: number | null;
  provider?: string | null;
  status?: string | null;
  booking_request_id?: number | null;
  amount?: number | null;
  currency?: string | null;
  provider_status?: string | null;
  last_event_type?: string | null;
  webhook_received_at?: string | null;
  created_at?: string | null;
};

type FeeSettings = {
  defaultMarketplaceFeeRate?: number | null;
  defaultMarketplaceFeePercent?: number | null;
  source?: string | null;
  bookingFields?: string[];
  notes?: string[];
};

type DashboardResponse = {
  ok?: boolean;
  code?: string;
  summary?: Summary;
  boats?: BoatRow[];
  experiences?: ExperienceRow[];
  owners?: OwnerRow[];
  bookingRequests?: BookingRequestRow[];
  payments?: PaymentRow[];
  feeSettings?: FeeSettings;
  warnings?: string[];
};

const adminSections: Array<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "boats", label: "Boats" },
  { id: "routes", label: "Routes" },
  { id: "owners", label: "Owners" },
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments" },
  { id: "translations", label: "Translations" },
  { id: "quality", label: "Quality" },
  { id: "system", label: "System" },
];

const copy: Record<Lang, {
  subtitle: string;
  intro: string;
  token: string;
  load: string;
  loading: string;
  error: string;
  filters: string;
  boats: string;
  routes: string;
  fees: string;
  warnings: string;
  noData: string;
}> = {
  en: {
    subtitle: "Admin dashboard",
    intro: "Read-only admin cockpit. Данные загружаются только для просмотра, изменения не сохраняются.",
    token: "Admin token",
    load: "Load dashboard",
    loading: "Loading...",
    error: "Could not load dashboard.",
    filters: "Filters",
    boats: "Boats",
    routes: "Routes / experiences",
    fees: "Commissions / percentages",
    warnings: "Warnings",
    noData: "No dashboard data loaded yet.",
  },
  ru: {
    subtitle: "Панель администратора",
    intro: "Read-only admin cockpit. Данные загружаются только для просмотра, изменения не сохраняются.",
    token: "Admin token",
    load: "Загрузить данные",
    loading: "Загрузка...",
    error: "Не удалось загрузить dashboard.",
    filters: "Фильтры",
    boats: "Лодки",
    routes: "Маршруты / experiences",
    fees: "Комиссии / проценты",
    warnings: "Предупреждения",
    noData: "Данные dashboard ещё не загружены.",
  },
  me: {
    subtitle: "Admin dashboard",
    intro: "Read-only admin cockpit. Данные загружаются только для просмотра, изменения не сохраняются.",
    token: "Admin token",
    load: "Load dashboard",
    loading: "Učitavanje...",
    error: "Dashboard nije učitan.",
    filters: "Filteri",
    boats: "Brodovi",
    routes: "Rute / experiences",
    fees: "Provizije / procenti",
    warnings: "Upozorenja",
    noData: "Dashboard podaci još nijesu učitani.",
  },
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

function numberDisplay(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : String(value);
}

function dateDisplay(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function isAwaitingReview(boat: BoatRow): boolean {
  return boat.state === "draft";
}

function boatKey(boat: BoatRow, index = 0): string {
  return [
    boat.id ?? "no-id",
    boat.documentId ?? "no-document",
    boat.locale ?? "no-locale",
    boat.state ?? "no-state",
    index,
  ].join(":");
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function BooleanBadge({ label, value, warningOnTrue = false }: { label: string; value: boolean | null | undefined; warningOnTrue?: boolean }) {
  const isWarning = warningOnTrue ? value === true : value !== true;
  return (
    <span className={`admin-badge ${isWarning ? "warning" : "positive"}`}>
      {label ? `${label} ${display(value)}` : display(value)}
    </span>
  );
}

function ownerDisplay(boat: BoatRow): string {
  return display(
    boat.owner_display_name
      ?? boat.owner_email
      ?? boat.owner_username
      ?? boat.owner_user_id
      ?? boat.created_by_id
  );
}

function hasOwnerDisplay(boat: BoatRow): boolean {
  return Boolean(
    boat.owner_user_id
      ?? boat.created_by_id
      ?? boat.owner_display_name
      ?? boat.owner_email
      ?? boat.owner_username
  );
}

export default function AdminDashboardClient({ lang }: { lang: Lang }) {
  const ui = copy[lang];
  const [adminToken, setAdminToken] = useState("");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [locale, setLocale] = useState<LocaleFilter>("all");
  const [listingType, setListingType] = useState<ListingTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [selectedBoatKey, setSelectedBoatKey] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: {
          "x-admin-token": adminToken,
        },
        cache: "no-store",
      });
      const json: DashboardResponse = await response.json().catch(() => ({ ok: false }));
      setData(json);

      if (!response.ok || json.ok === false) {
        setError(json.code ? `${ui.error} (${json.code})` : ui.error);
      }
    } catch {
      setError(ui.error);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDashboard();
  }

  const boats = data?.boats ?? [];
  const filteredBoats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boats.filter((boat) => {
      if (status === "draft" && boat.state !== "draft") return false;
      if (status === "published" && boat.state !== "published") return false;
      if (status === "awaiting" && !isAwaitingReview(boat)) return false;
      if (locale !== "all" && boat.locale !== locale) return false;
      if (listingType !== "all" && boat.listing_type !== listingType) return false;
      if (!q) return true;
      return [boat.title, boat.documentId, boat.slug].some((value) => value?.toLowerCase().includes(q));
    });
  }, [boats, status, locale, listingType, search]);

  const summary = data?.summary ?? {};
  const warnings = data?.warnings ?? [];
  const feeSettings = data?.feeSettings;
  const experiences = data?.experiences ?? [];
  const owners = data?.owners ?? [];
  const bookingRequests = data?.bookingRequests ?? [];
  const payments = data?.payments ?? [];
  const localeCounts = {
    ru: boats.filter((boat) => boat.locale === "ru").length,
    en: boats.filter((boat) => boat.locale === "en").length,
    me: boats.filter((boat) => boat.locale === "sr-Latn-ME" || boat.locale === "me").length,
  };
  const quality = {
    draftBoats: boats.filter((boat) => boat.state === "draft").length,
    missingOwner: boats.filter((boat) => !hasOwnerDisplay(boat)).length,
    missingTitle: boats.filter((boat) => !boat.title).length,
    missingSlug: boats.filter((boat) => !boat.slug).length,
    routesWithoutBoat: experiences.filter((experience) => !experience.boatTitle).length,
  };
  const overviewMetrics = [
    { label: "Total boats", value: summary.totalBoats },
    { label: "Draft boats", value: summary.draftBoats },
    { label: "Published boats", value: summary.publishedBoats },
    { label: "Awaiting review", value: summary.boatsAwaitingReview },
    { label: "Owners", value: summary.totalOwners },
    { label: "Routes / experiences", value: summary.totalExperiences },
    { label: "Booking requests", value: summary.totalBookingRequests },
    { label: "Payments", value: summary.totalPayments },
  ];
  const selectedBoat = selectedBoatKey
    ? boats.find((boat, index) => boatKey(boat, index) === selectedBoatKey) ?? null
    : null;
  const selectedBoatDocumentId = selectedBoat?.documentId ?? null;
  const selectedBoatLocaleVersions = selectedBoatDocumentId
    ? boats.filter((boat) => boat.documentId === selectedBoatDocumentId)
    : [];
  const selectedBoatExperiences = selectedBoatDocumentId
    ? experiences.filter((experience) => experience.boatDocumentId === selectedBoatDocumentId)
    : [];
  const selectedBoatHasOwner = selectedBoat ? hasOwnerDisplay(selectedBoat) : false;
  const selectedOwnerUserId = selectedBoat?.owner_user_id ?? selectedBoat?.created_by_id ?? null;
  const selectedOwnerEmail = selectedBoat?.owner_email?.trim().toLowerCase() ?? null;
  const selectedOwnerFromOwnersList = selectedBoat
    ? owners.find((owner) => selectedBoat.owner_profile_id != null && owner.profile_id === selectedBoat.owner_profile_id)
      ?? owners.find((owner) => selectedOwnerUserId != null && owner.user_id === selectedOwnerUserId)
      ?? owners.find((owner) => selectedOwnerEmail && owner.email?.trim().toLowerCase() === selectedOwnerEmail)
      ?? null
    : null;
  const selectedBoatMediaStatus = !selectedBoat
    ? ""
    : (selectedBoat.cover_count ?? 0) <= 0
      ? "Cover image missing"
      : (selectedBoat.images_count ?? 0) < 3
        ? "Gallery may be weak"
        : "Media count looks acceptable";
  const selectedBoatHasPrice = Boolean(
    selectedBoat && [
      selectedBoat.price_per_hour,
      selectedBoat.price_per_day,
      selectedBoat.price_per_week,
      selectedBoat.sale_price,
    ].some((price) => price !== null && price !== undefined && Number(price) > 0)
  );
  const selectedBoatChecklist = selectedBoat ? [
    { label: "Has title", value: Boolean(selectedBoat.title) },
    { label: "Has slug", value: Boolean(selectedBoat.slug) },
    { label: "Has cover", value: (selectedBoat.cover_count ?? 0) > 0 },
    { label: "Has gallery images", value: (selectedBoat.images_count ?? 0) > 0 },
    { label: "Has route linked", value: selectedBoatExperiences.length > 0 },
    { label: "Has price", value: selectedBoatHasPrice },
    { label: "Has owner link visible", value: selectedBoatHasOwner },
    { label: "Has EN version", value: selectedBoatLocaleVersions.some((boat) => boat.locale === "en") },
    { label: "Has RU version", value: selectedBoatLocaleVersions.some((boat) => boat.locale === "ru") },
    { label: "Has ME version", value: selectedBoatLocaleVersions.some((boat) => boat.locale === "sr-Latn-ME" || boat.locale === "me") },
  ] : [];

  return (
    <main className="admin-shell">
      <section className="admin-card admin-header">
        <p className="kicker">Sharmar Admin</p>
        <h1>Sharmar Admin</h1>
        <h2>{ui.subtitle}</h2>
        <p>{ui.intro}</p>

        <form className="admin-load-form" onSubmit={onSubmit}>
          <label>
            <span>{ui.token}</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" disabled={loading}>{loading ? ui.loading : ui.load}</button>
        </form>

        {error ? <div className="admin-error" role="alert">{error}</div> : null}
      </section>

      {!data?.ok ? <p className="admin-muted">{ui.noData}</p> : null}

      {data?.ok ? (
        <>
          <nav className="admin-tabs" aria-label="Admin sections">
            {adminSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "active" : ""}
                aria-pressed={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {activeSection === "overview" ? (
            <section className="admin-panel" aria-labelledby="admin-overview-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-overview-title">Overview</h2>
                  <p>Read-only operational cockpit for marketplace moderation and monitoring.</p>
                </div>
              </div>
              <div className="admin-overview-metrics">
                {overviewMetrics.map((metric) => (
                  <div className="admin-overview-metric" key={metric.label}>
                    <div className="admin-overview-metric-label">{metric.label}</div>
                    <div className="admin-overview-metric-value">{display(metric.value)}</div>
                  </div>
                ))}
              </div>
              <div className="admin-card admin-attention">
                <h3>Today needs attention</h3>
                <dl className="admin-definition-grid">
                  <div>
                    <dt>Draft boats / awaiting review</dt>
                    <dd>{numberDisplay(summary.boatsAwaitingReview)}</dd>
                  </div>
                  <div>
                    <dt>Booking requests</dt>
                    <dd>{numberDisplay(summary.totalBookingRequests)}</dd>
                  </div>
                  <div>
                    <dt>Payments</dt>
                    <dd>{numberDisplay(summary.totalPayments)}</dd>
                  </div>
                  <div>
                    <dt>Phase</dt>
                    <dd>Read-only Phase 2A. No changes are saved here.</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}

          {activeSection === "boats" ? (
            <section className="admin-panel" aria-labelledby="admin-boats-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-boats-title">{ui.boats}</h2>
                  <p>Moderation preparation view. No approve, publish, reject, or delete actions are available yet.</p>
                </div>
                <span>{filteredBoats.length} / {boats.length}</span>
              </div>
              <div className="admin-card">
                <div className="admin-section-heading">
                  <h3>{ui.filters}</h3>
                  <span>{filteredBoats.length} visible</span>
                </div>
                <div className="admin-filters">
                  <label>
                    <span>Status</span>
                    <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
                      <option value="all">all</option>
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="awaiting">awaiting review</option>
                    </select>
                  </label>
                  <label>
                    <span>Locale</span>
                    <select value={locale} onChange={(event) => setLocale(event.target.value as LocaleFilter)}>
                      <option value="all">all</option>
                      <option value="ru">ru</option>
                      <option value="en">en</option>
                      <option value="sr-Latn-ME">sr-Latn-ME</option>
                    </select>
                  </label>
                  <label>
                    <span>Listing type</span>
                    <select value={listingType} onChange={(event) => setListingType(event.target.value as ListingTypeFilter)}>
                      <option value="all">all</option>
                      <option value="rent">rent</option>
                      <option value="sale">sale</option>
                    </select>
                  </label>
                  <label>
                    <span>Search</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="title / documentId / slug"
                      spellCheck={false}
                    />
                  </label>
                </div>
              </div>
              <div className="admin-card">
                <p className="admin-table-hint">Click Open to inspect a boat in the read-only moderation panel.</p>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Details</th>
                        <th>id</th>
                        <th>documentId</th>
                        <th>locale</th>
                        <th>title</th>
                        <th>slug</th>
                        <th>listing_type</th>
                        <th>boat / vessel</th>
                        <th>owner / created_by</th>
                        <th>state</th>
                        <th>created_at</th>
                        <th>updated_at</th>
                        <th>cover</th>
                        <th>images</th>
                        <th>routes</th>
                        <th>hour</th>
                        <th>day</th>
                        <th>week</th>
                        <th>sale</th>
                        <th>currency</th>
                        <th>instant</th>
                        <th>contacts</th>
                        <th>AI preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBoats.map((boat, index) => {
                        const key = boatKey(boat, boats.indexOf(boat));

                        return (
                          <tr
                            className={selectedBoatKey === key ? "selected" : ""}
                            key={`${boat.documentId ?? boat.id ?? "boat"}-${boat.state ?? "state"}-${index}`}
                          >
                            <td>
                              <button
                                aria-pressed={selectedBoatKey === key}
                                className={`admin-link-button ${selectedBoatKey === key ? "active" : ""}`}
                                type="button"
                                onClick={() => setSelectedBoatKey(key)}
                              >
                                Open
                              </button>
                            </td>
                            <td>{display(boat.id)}</td>
                            <td className="admin-mono">{display(boat.documentId)}</td>
                            <td>{display(boat.locale)}</td>
                            <td>{display(boat.title)}</td>
                            <td>{display(boat.slug)}</td>
                            <td>{display(boat.listing_type)}</td>
                            <td>{display(boat.boat_type || boat.vessel_type)}</td>
                            <td>{ownerDisplay(boat)}</td>
                            <td><span className={`admin-state ${boat.state === "published" ? "published" : "draft"}`}>{display(boat.state)}</span></td>
                            <td>{dateDisplay(boat.created_at)}</td>
                            <td>{dateDisplay(boat.updated_at)}</td>
                            <td>{numberDisplay(boat.cover_count)}</td>
                            <td>{numberDisplay(boat.images_count)}</td>
                            <td>{numberDisplay(boat.experiences_count)}</td>
                            <td>{numberDisplay(boat.price_per_hour)}</td>
                            <td>{numberDisplay(boat.price_per_day)}</td>
                            <td>{numberDisplay(boat.price_per_week)}</td>
                            <td>{numberDisplay(boat.sale_price)}</td>
                            <td>{display(boat.currency)}</td>
                            <td>{display(boat.instant_booking)}</td>
                            <td>{display(boat.contacts_visible)}</td>
                            <td>
                              {boat.documentId ? (
                                <Link href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(boat.documentId)}`}>
                                  preview
                                </Link>
                              ) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {selectedBoat ? (
                <section className="admin-card admin-detail-panel" aria-labelledby="admin-boat-detail-title">
                  <div className="admin-detail-header">
                    <div>
                      <p className="kicker">Read-only moderation</p>
                      <h3 id="admin-boat-detail-title">Boat moderation detail</h3>
                      <p>{display(selectedBoat.title)} · <span className="admin-mono">{display(selectedBoat.documentId)}</span></p>
                    </div>
                    <button className="admin-secondary-button" type="button" onClick={() => setSelectedBoatKey(null)}>
                      Close
                    </button>
                  </div>

                  <div className="admin-detail-summary" aria-label="Boat moderation summary">
                    <div>
                      <span>Boat title</span>
                      <strong>{display(selectedBoat.title)}</strong>
                    </div>
                    <div>
                      <span>documentId</span>
                      <strong className="admin-mono">{display(selectedBoat.documentId)}</strong>
                    </div>
                    <div>
                      <span>locale</span>
                      <strong>{display(selectedBoat.locale)}</strong>
                    </div>
                    <div>
                      <span>state</span>
                      <strong>{display(selectedBoat.state)}</strong>
                    </div>
                    <div>
                      <span>owner</span>
                      <strong>{ownerDisplay(selectedBoat)}</strong>
                    </div>
                    <div>
                      <span>media</span>
                      <strong>{selectedBoatMediaStatus}</strong>
                    </div>
                    <div>
                      <span>routes</span>
                      <strong>{selectedBoatExperiences.length}</strong>
                    </div>
                    <div>
                      <span>locale versions</span>
                      <strong>{selectedBoatLocaleVersions.length}</strong>
                    </div>
                  </div>

                  <div className="admin-detail-grid">
                    <section className="admin-detail-section">
                      <h4>Identity</h4>
                      <dl className="admin-definition-grid">
                        <div><dt>id</dt><dd>{display(selectedBoat.id)}</dd></div>
                        <div><dt>documentId</dt><dd className="admin-mono">{display(selectedBoat.documentId)}</dd></div>
                        <div><dt>locale</dt><dd>{display(selectedBoat.locale)}</dd></div>
                        <div><dt>title</dt><dd>{display(selectedBoat.title)}</dd></div>
                        <div><dt>slug</dt><dd>{display(selectedBoat.slug)}</dd></div>
                        <div><dt>listing_type</dt><dd>{display(selectedBoat.listing_type)}</dd></div>
                        <div><dt>boat_type / vessel_type</dt><dd>{display(selectedBoat.boat_type || selectedBoat.vessel_type)}</dd></div>
                        <div><dt>state</dt><dd>{display(selectedBoat.state)}</dd></div>
                        <div><dt>created_at</dt><dd>{dateDisplay(selectedBoat.created_at)}</dd></div>
                        <div><dt>updated_at</dt><dd>{dateDisplay(selectedBoat.updated_at)}</dd></div>
                      </dl>
                    </section>

                    <section className="admin-detail-section">
                      <h4>Owner / trust</h4>
                      {!selectedBoatHasOwner ? (
                        <p className="admin-detail-warning">Owner link is not visible in the current dashboard payload.</p>
                      ) : (
                        <div className={`admin-owner-card ${selectedBoat.owner_blocked ? "blocked" : ""}`}>
                          <div className="admin-owner-main">
                            <strong>{display(selectedBoat.owner_display_name)}</strong>
                            <span>{display(selectedBoat.owner_email)} · {display(selectedBoat.owner_username)}</span>
                          </div>
                          <div className="admin-owner-badges">
                            <BooleanBadge label="confirmed" value={selectedBoat.owner_confirmed} />
                            <BooleanBadge label="blocked" value={selectedBoat.owner_blocked} warningOnTrue />
                            <BooleanBadge label="contacts_visible" value={selectedBoat.contacts_visible} />
                            <BooleanBadge label="instant_booking" value={selectedBoat.instant_booking} />
                          </div>
                          <dl className="admin-definition-grid">
                            <div><dt>Owner display name</dt><dd>{display(selectedBoat.owner_display_name)}</dd></div>
                            <div><dt>Owner email</dt><dd>{display(selectedBoat.owner_email)}</dd></div>
                            <div><dt>Owner username</dt><dd>{display(selectedBoat.owner_username)}</dd></div>
                            <div><dt>Owner phone</dt><dd>{display(selectedBoat.owner_phone)}</dd></div>
                            <div><dt>owner_user_id / created_by_id</dt><dd>{display(selectedBoat.owner_user_id ?? selectedBoat.created_by_id)}</dd></div>
                            <div><dt>owner_profile_id</dt><dd>{display(selectedBoat.owner_profile_id)}</dd></div>
                          </dl>
                        </div>
                      )}
                      <div className="admin-owner-cross-check">
                        <span>Owner found in Owners tab: <strong>{yesNo(Boolean(selectedOwnerFromOwnersList))}</strong></span>
                        {selectedOwnerFromOwnersList ? (
                          <dl className="admin-definition-grid">
                            <div><dt>profile_id</dt><dd>{display(selectedOwnerFromOwnersList.profile_id)}</dd></div>
                            <div><dt>user_id</dt><dd>{display(selectedOwnerFromOwnersList.user_id)}</dd></div>
                            <div><dt>email</dt><dd>{display(selectedOwnerFromOwnersList.email)}</dd></div>
                            <div><dt>display_name</dt><dd>{display(selectedOwnerFromOwnersList.display_name)}</dd></div>
                          </dl>
                        ) : null}
                      </div>
                    </section>

                    <section className="admin-detail-section">
                      <h4>Pricing</h4>
                      <dl className="admin-definition-grid">
                        <div><dt>price_per_hour</dt><dd>{numberDisplay(selectedBoat.price_per_hour)}</dd></div>
                        <div><dt>price_per_day</dt><dd>{numberDisplay(selectedBoat.price_per_day)}</dd></div>
                        <div><dt>price_per_week</dt><dd>{numberDisplay(selectedBoat.price_per_week)}</dd></div>
                        <div><dt>sale_price</dt><dd>{numberDisplay(selectedBoat.sale_price)}</dd></div>
                        <div><dt>currency</dt><dd>{display(selectedBoat.currency)}</dd></div>
                        <div><dt>min_rental_hours</dt><dd>{selectedBoat.min_rental_hours == null ? "not loaded" : numberDisplay(selectedBoat.min_rental_hours)}</dd></div>
                      </dl>
                    </section>

                    <section className="admin-detail-section">
                      <h4>Media</h4>
                      <dl className="admin-definition-grid">
                        <div><dt>cover_count</dt><dd>{numberDisplay(selectedBoat.cover_count)}</dd></div>
                        <div><dt>images_count</dt><dd>{numberDisplay(selectedBoat.images_count)}</dd></div>
                        <div><dt>Status</dt><dd>{selectedBoatMediaStatus}</dd></div>
                      </dl>
                    </section>
                  </div>

                  <section className="admin-detail-section">
                    <h4>Routes / experiences linked to this boat</h4>
                    {selectedBoatExperiences.length ? (
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-table-compact">
                          <thead>
                            <tr>
                              <th>title</th>
                              <th>documentId</th>
                              <th>locale</th>
                              <th>price</th>
                              <th>duration_hours</th>
                              <th>is_active</th>
                              <th>state</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBoatExperiences.map((experience, index) => (
                              <tr key={`${experience.documentId ?? "experience"}-${index}`}>
                                <td>{display(experience.title)}</td>
                                <td className="admin-mono">{display(experience.documentId)}</td>
                                <td>{display(experience.locale)}</td>
                                <td>{numberDisplay(experience.price)}</td>
                                <td>{numberDisplay(experience.duration_hours)}</td>
                                <td>{display(experience.is_active)}</td>
                                <td>{display(experience.state)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="admin-empty">No linked routes found in loaded dashboard data.</p>}
                  </section>

                  <section className="admin-detail-section">
                    <h4>Translation / locale status</h4>
                    <dl className="admin-definition-grid">
                      <div><dt>source documentId</dt><dd className="admin-mono">{display(selectedBoat.documentId)}</dd></div>
                      <div><dt>locale versions</dt><dd>{selectedBoatLocaleVersions.length}</dd></div>
                      <div>
                        <dt>AI preview</dt>
                        <dd>
                          {selectedBoat.documentId ? (
                            <Link href={`/${lang}/admin/translations/preview?boatDocumentId=${encodeURIComponent(selectedBoat.documentId)}`}>
                              Open read-only preview
                            </Link>
                          ) : "-"}
                        </dd>
                      </div>
                    </dl>
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-table-compact">
                        <thead>
                          <tr>
                            <th>locale</th>
                            <th>title</th>
                            <th>slug</th>
                            <th>state</th>
                            <th>updated_at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBoatLocaleVersions.map((boat, index) => (
                            <tr key={`${boat.locale ?? "locale"}-${boat.state ?? "state"}-${index}`}>
                              <td>{display(boat.locale)}</td>
                              <td>{display(boat.title)}</td>
                              <td>{display(boat.slug)}</td>
                              <td>{display(boat.state)}</td>
                              <td>{dateDisplay(boat.updated_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="admin-detail-section">
                    <h4>Moderation checklist</h4>
                    <dl className="admin-definition-grid">
                      {selectedBoatChecklist.map((item) => (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd><BooleanBadge label="" value={item.value} /></dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className="admin-detail-section">
                    <h4>Next actions placeholder</h4>
                    <p className="admin-empty">Actions will be added after backend moderation endpoints are protected. Publish, reject, request changes, and AI translation save actions are intentionally not available in this read-only phase.</p>
                  </section>
                </section>
              ) : null}
            </section>
          ) : null}

          {activeSection === "routes" ? (
            <section className="admin-panel" aria-labelledby="admin-routes-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-routes-title">{ui.routes}</h2>
                  <p>Read-only route inventory for future moderation and translation workflow.</p>
                </div>
                <span>{experiences.length}</span>
              </div>
              <div className="admin-card">
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>documentId</th>
                        <th>locale</th>
                        <th>title</th>
                        <th>boat documentId</th>
                        <th>boat title</th>
                        <th>price</th>
                        <th>duration_hours</th>
                        <th>is_active</th>
                        <th>state</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiences.map((experience, index) => (
                        <tr key={`${experience.documentId ?? "experience"}-${experience.state ?? "state"}-${index}`}>
                          <td className="admin-mono">{display(experience.documentId)}</td>
                          <td>{display(experience.locale)}</td>
                          <td>{display(experience.title)}</td>
                          <td className="admin-mono">{display(experience.boatDocumentId)}</td>
                          <td>{display(experience.boatTitle)}</td>
                          <td>{numberDisplay(experience.price)}</td>
                          <td>{numberDisplay(experience.duration_hours)}</td>
                          <td>{display(experience.is_active)}</td>
                          <td><span className={`admin-state ${experience.state === "published" ? "published" : "draft"}`}>{display(experience.state)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "owners" ? (
            <section className="admin-panel" aria-labelledby="admin-owners-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-owners-title">Owners</h2>
                  <p>Read-only owner profile and user account overview.</p>
                </div>
                <span>{owners.length}</span>
              </div>
              {owners.length ? (
                <div className="admin-card">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>profile_id</th>
                          <th>user_id</th>
                          <th>email</th>
                          <th>username</th>
                          <th>display_name</th>
                          <th>phone</th>
                          <th>confirmed</th>
                          <th>blocked</th>
                          <th>created_at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {owners.map((owner, index) => (
                          <tr key={`${owner.profile_id ?? owner.id ?? "owner"}-${index}`}>
                            <td>{display(owner.profile_id ?? owner.id)}</td>
                            <td>{display(owner.user_id)}</td>
                            <td>{display(owner.email)}</td>
                            <td>{display(owner.username)}</td>
                            <td>{display(owner.display_name)}</td>
                            <td>{display(owner.phone)}</td>
                            <td>{display(owner.confirmed)}</td>
                            <td>{display(owner.blocked)}</td>
                            <td>{dateDisplay(owner.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div className="admin-card admin-empty">No owner rows are available yet.</div>}
            </section>
          ) : null}

          {activeSection === "bookings" ? (
            <section className="admin-panel" aria-labelledby="admin-bookings-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-bookings-title">Bookings</h2>
                  <p>Read-only booking request queue for future owner/admin workflow.</p>
                </div>
                <span>{bookingRequests.length}</span>
              </div>
              {bookingRequests.length ? (
                <div className="admin-card">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>id</th>
                          <th>status</th>
                          <th>customer_name</th>
                          <th>customer_email</th>
                          <th>boat_title</th>
                          <th>experience_title</th>
                          <th>owner_amount</th>
                          <th>marketplace_fee_amount</th>
                          <th>customer_total_amount</th>
                          <th>currency</th>
                          <th>created_at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingRequests.map((booking, index) => (
                          <tr key={`${booking.id ?? "booking"}-${index}`}>
                            <td>{display(booking.id)}</td>
                            <td>{display(booking.status)}</td>
                            <td>{display(booking.customer_name)}</td>
                            <td>{display(booking.customer_email)}</td>
                            <td>{display(booking.boat_title)}</td>
                            <td>{display(booking.experience_title)}</td>
                            <td>{numberDisplay(booking.owner_amount)}</td>
                            <td>{numberDisplay(booking.marketplace_fee_amount)}</td>
                            <td>{numberDisplay(booking.customer_total_amount)}</td>
                            <td>{display(booking.currency)}</td>
                            <td>{dateDisplay(booking.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div className="admin-card admin-empty">No booking requests yet.</div>}
            </section>
          ) : null}

          {activeSection === "payments" ? (
            <section className="admin-panel" aria-labelledby="admin-payments-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-payments-title">Payments</h2>
                  <p>Read-only payment status view. Capture and refund logic is not exposed here.</p>
                </div>
                <span>{payments.length}</span>
              </div>
              {payments.length ? (
                <div className="admin-card">
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>id</th>
                          <th>provider</th>
                          <th>status</th>
                          <th>booking_request_id</th>
                          <th>amount</th>
                          <th>currency</th>
                          <th>provider_status</th>
                          <th>last_event_type</th>
                          <th>webhook_received_at</th>
                          <th>created_at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, index) => (
                          <tr key={`${payment.id ?? "payment"}-${index}`}>
                            <td>{display(payment.id)}</td>
                            <td>{display(payment.provider)}</td>
                            <td>{display(payment.status)}</td>
                            <td>{display(payment.booking_request_id)}</td>
                            <td>{numberDisplay(payment.amount)}</td>
                            <td>{display(payment.currency)}</td>
                            <td>{display(payment.provider_status)}</td>
                            <td>{display(payment.last_event_type)}</td>
                            <td>{dateDisplay(payment.webhook_received_at)}</td>
                            <td>{dateDisplay(payment.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div className="admin-card admin-empty">No payments yet.</div>}
            </section>
          ) : null}

          {activeSection === "translations" ? (
            <section className="admin-panel" aria-labelledby="admin-translations-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-translations-title">Translations</h2>
                  <p>Translation workflow will manage RU/EN/ME locale versions here.</p>
                </div>
              </div>
              <div className="admin-card">
                <p>Next phase: generate, review, save draft translations, publish locale versions.</p>
                <dl className="admin-definition-grid">
                  <div>
                    <dt>Boats with locale ru</dt>
                    <dd>{localeCounts.ru}</dd>
                  </div>
                  <div>
                    <dt>Boats with locale en</dt>
                    <dd>{localeCounts.en}</dd>
                  </div>
                  <div>
                    <dt>Boats with locale sr-Latn-ME / me</dt>
                    <dd>{localeCounts.me}</dd>
                  </div>
                  <div>
                    <dt>AI preview</dt>
                    <dd><Link href={`/${lang}/admin/translations/preview`}>Open read-only preview</Link></dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}

          {activeSection === "quality" ? (
            <section className="admin-panel" aria-labelledby="admin-quality-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-quality-title">Quality</h2>
                  <p>Read-only quality checklist derived from the currently loaded dashboard rows.</p>
                </div>
              </div>
              <div className="admin-card">
                <dl className="admin-definition-grid">
                  <div>
                    <dt>Draft boats</dt>
                    <dd>{quality.draftBoats}</dd>
                  </div>
                  <div>
                    <dt>Boats missing owner / created_by display</dt>
                    <dd>{quality.missingOwner}</dd>
                  </div>
                  <div>
                    <dt>Boats missing title</dt>
                    <dd>{quality.missingTitle}</dd>
                  </div>
                  <div>
                    <dt>Boats missing slug</dt>
                    <dd>{quality.missingSlug}</dd>
                  </div>
                  <div>
                    <dt>Routes without linked boat title</dt>
                    <dd>{quality.routesWithoutBoat}</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}

          {activeSection === "system" ? (
            <section className="admin-panel" aria-labelledby="admin-system-title">
              <div className="admin-section-heading">
                <div>
                  <h2 id="admin-system-title">System</h2>
                  <p>Read-only technical status for this admin cockpit.</p>
                </div>
              </div>
              <div className="admin-card">
                <dl className="admin-definition-grid">
                  <div>
                    <dt>Mode</dt>
                    <dd>Preview / read-only</dd>
                  </div>
                  <div>
                    <dt>Data source</dt>
                    <dd>Frontend admin API + CMS admin-dashboard summary endpoint</dd>
                  </div>
                  <div>
                    <dt>Default marketplace fee rate</dt>
                    <dd>{feeSettings?.defaultMarketplaceFeeRate != null ? feeSettings.defaultMarketplaceFeeRate : "-"}</dd>
                  </div>
                  <div>
                    <dt>Default marketplace fee percent</dt>
                    <dd>{feeSettings?.defaultMarketplaceFeePercent != null ? `${feeSettings.defaultMarketplaceFeePercent}%` : "-"}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{display(feeSettings?.source)}</dd>
                  </div>
                  <div>
                    <dt>Booking amount fields</dt>
                    <dd>{feeSettings?.bookingFields?.join(", ") || "-"}</dd>
                  </div>
                </dl>
                <div className={warnings.length ? "admin-warning-list" : "admin-empty"}>
                  <h3>{ui.warnings}</h3>
                  {warnings.length ? (
                    <ul>
                      {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  ) : <p>No warnings.</p>}
                </div>
                <ul className="admin-notes">
                  {(feeSettings?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <style jsx>{`
        .admin-shell {
          display: grid;
          gap: 18px;
          width: min(1380px, calc(100vw - 32px));
          margin: 0 auto;
          padding: 72px 0 54px;
        }

        .admin-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.045);
          padding: 20px;
        }

        .admin-header h1,
        .admin-header h2,
        .admin-card h2,
        .admin-card h3,
        .admin-card h4,
        .admin-panel h2,
        .admin-panel h3,
        .admin-panel h4 {
          margin: 0;
        }

        .admin-header {
          display: grid;
          gap: 10px;
        }

        .admin-header h1 {
          font-size: clamp(30px, 4vw, 52px);
        }

        .admin-header h2 {
          color: rgba(255, 255, 255, 0.78);
          font-size: 18px;
        }

        .admin-header p,
        .admin-muted,
        .admin-notes {
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.65;
        }

        .admin-load-form,
        .admin-filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 10px;
        }

        .admin-load-form {
          grid-template-columns: minmax(260px, 420px) max-content;
          align-items: end;
        }

        .admin-load-form label,
        .admin-filters label {
          display: grid;
          gap: 7px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }

        .admin-load-form input,
        .admin-filters input,
        .admin-filters select {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.22);
          color: white;
          padding: 11px 12px;
          font: inherit;
        }

        .admin-load-form button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          background: white;
          color: #111;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-load-form button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .admin-error,
        .admin-warning {
          border-color: rgba(255, 198, 92, 0.42);
          background: rgba(255, 174, 54, 0.12);
          color: #ffe4ac;
        }

        .admin-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          padding: 8px;
        }

        .admin-tabs button {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.72);
          padding: 9px 12px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .admin-tabs button.active {
          border-color: rgba(255, 255, 255, 0.38);
          background: rgba(255, 255, 255, 0.92);
          color: #111;
        }

        .admin-link-button,
        .admin-secondary-button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-link-button {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          padding: 7px 10px;
        }

        .admin-link-button.active {
          border-color: rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.18);
          color: white;
        }

        .admin-secondary-button {
          background: white;
          color: #111;
          padding: 10px 14px;
        }

        .admin-panel {
          display: grid;
          gap: 16px;
        }

        .admin-section-heading p,
        .admin-panel p,
        .admin-empty {
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.6;
        }

        .admin-section-heading p {
          margin: 6px 0 0;
        }

        .admin-overview-metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          width: 100%;
        }

        .admin-overview-metric {
          display: grid;
          grid-template-rows: auto auto;
          align-content: space-between;
          gap: 22px;
          min-height: 140px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 8px;
          background: rgba(10, 16, 24, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 28px rgba(0, 0, 0, 0.18);
          padding: 22px;
        }

        .admin-overview-metric-label,
        .admin-section-heading span,
        .admin-definition-grid dt {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .admin-overview-metric-label {
          display: block;
          width: 100%;
          line-height: 1.35;
          min-height: 20px;
        }

        .admin-overview-metric-value {
          display: block;
          width: 100%;
          color: rgba(255, 255, 255, 0.94);
          font-size: 46px;
          font-weight: 800;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .admin-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .admin-attention {
          display: grid;
          gap: 14px;
        }

        .admin-table-hint {
          margin: 0 0 12px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
        }

        .admin-detail-panel {
          display: grid;
          gap: 18px;
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }

        .admin-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .admin-detail-header p {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.68);
        }

        .admin-detail-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .admin-detail-summary div {
          display: grid;
          gap: 5px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.16);
          padding: 11px 12px;
        }

        .admin-detail-summary span {
          color: rgba(255, 255, 255, 0.56);
          font-size: 12px;
        }

        .admin-detail-summary strong {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .admin-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .admin-detail-section {
          display: grid;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 16px;
        }

        .admin-detail-section h4 {
          color: rgba(255, 255, 255, 0.88);
        }

        .admin-detail-warning {
          border: 1px solid rgba(255, 198, 92, 0.32);
          border-radius: 8px;
          background: rgba(255, 174, 54, 0.1);
          color: #ffe4ac;
          margin: 0;
          padding: 10px 12px;
        }

        .admin-owner-card {
          display: grid;
          gap: 13px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.045);
          padding: 14px;
        }

        .admin-owner-card.blocked {
          border-color: rgba(255, 198, 92, 0.42);
          background: rgba(255, 174, 54, 0.1);
        }

        .admin-owner-main {
          display: grid;
          gap: 5px;
        }

        .admin-owner-main strong {
          color: rgba(255, 255, 255, 0.94);
          font-size: 16px;
          overflow-wrap: anywhere;
        }

        .admin-owner-main span,
        .admin-owner-cross-check {
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        .admin-owner-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .admin-owner-cross-check {
          display: grid;
          gap: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 12px;
        }

        :global(.admin-badge) {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 3px 8px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
        }

        :global(.admin-badge.positive) {
          color: #baf7c9;
          border-color: rgba(101, 255, 146, 0.28);
          background: rgba(101, 255, 146, 0.08);
        }

        :global(.admin-badge.warning) {
          color: #ffe4ac;
          border-color: rgba(255, 198, 92, 0.32);
          background: rgba(255, 174, 54, 0.1);
        }

        .admin-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
        }

        .admin-table {
          width: 100%;
          min-width: 1180px;
          border-collapse: collapse;
          font-size: 13px;
        }

        .admin-table-compact {
          min-width: 760px;
        }

        .admin-table th,
        .admin-table td {
          padding: 10px 11px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .admin-table th {
          color: rgba(255, 255, 255, 0.58);
          font-weight: 700;
          background: rgba(0, 0, 0, 0.16);
        }

        .admin-table td {
          color: rgba(255, 255, 255, 0.86);
        }

        .admin-table tr.selected td {
          background: rgba(255, 255, 255, 0.055);
        }

        .admin-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }

        .admin-state {
          display: inline-flex;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 3px 8px;
          font-size: 12px;
        }

        .admin-state.published {
          color: #baf7c9;
          border-color: rgba(101, 255, 146, 0.28);
          background: rgba(101, 255, 146, 0.08);
        }

        .admin-state.draft {
          color: #ffe4ac;
          border-color: rgba(255, 198, 92, 0.32);
          background: rgba(255, 174, 54, 0.1);
        }

        .admin-definition-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-definition-grid div {
          display: grid;
          gap: 5px;
          margin: 0;
        }

        .admin-definition-grid dd {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .admin-warning-list {
          margin-top: 16px;
          border: 1px solid rgba(255, 198, 92, 0.42);
          border-radius: 8px;
          background: rgba(255, 174, 54, 0.12);
          color: #ffe4ac;
          padding: 16px;
        }

        .admin-warning-list ul,
        .admin-notes {
          margin-bottom: 0;
        }

        @media (max-width: 860px) {
          .admin-overview-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-load-form,
          .admin-filters,
          .admin-definition-grid,
          .admin-detail-summary,
          .admin-detail-grid {
            grid-template-columns: 1fr;
          }

          .admin-detail-header {
            display: grid;
          }

          .admin-load-form button {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .admin-overview-metrics {
            grid-template-columns: 1fr;
          }

          .admin-overview-metric-value {
            font-size: 36px;
          }
        }
      `}</style>
    </main>
  );
}
