"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Lang } from "@/i18n";

type StatusFilter = "all" | "draft" | "published" | "awaiting";
type LocaleFilter = "all" | "ru" | "en" | "sr-Latn-ME";
type ListingTypeFilter = "all" | "rent" | "sale";

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
  feeSettings?: FeeSettings;
  warnings?: string[];
};

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
    intro: "Read-only Phase 1 cockpit. This page loads operational data but does not save changes.",
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
    intro: "Read-only Phase 1 cockpit. Данные загружаются только для просмотра, изменения не сохраняются.",
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
    intro: "Read-only Phase 1 cockpit. Podaci se učitavaju samo za pregled, bez čuvanja izmjena.",
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

function SummaryCard({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <article className="admin-summary-card">
      <span className="admin-summary-label">{label}</span>
      <strong className="admin-summary-value">{display(value)}</strong>
    </article>
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
          <section className="admin-summary-grid">
            <SummaryCard label="Total boats" value={summary.totalBoats} />
            <SummaryCard label="Draft boats" value={summary.draftBoats} />
            <SummaryCard label="Published boats" value={summary.publishedBoats} />
            <SummaryCard label="Awaiting review" value={summary.boatsAwaitingReview} />
            <SummaryCard label="Owners" value={summary.totalOwners} />
            <SummaryCard label="Routes / experiences" value={summary.totalExperiences} />
            <SummaryCard label="Booking requests" value={summary.totalBookingRequests} />
            <SummaryCard label="Payments" value={summary.totalPayments} />
          </section>

          <section className="admin-card">
            <div className="admin-section-heading">
              <h2>{ui.filters}</h2>
              <span>{filteredBoats.length} / {boats.length}</span>
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
          </section>

          <section className="admin-card">
            <div className="admin-section-heading">
              <h2>{ui.boats}</h2>
              <span>{filteredBoats.length}</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
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
                  {filteredBoats.map((boat, index) => (
                    <tr key={`${boat.documentId ?? boat.id ?? "boat"}-${boat.state ?? "state"}-${index}`}>
                      <td>{display(boat.id)}</td>
                      <td className="admin-mono">{display(boat.documentId)}</td>
                      <td>{display(boat.locale)}</td>
                      <td>{display(boat.title)}</td>
                      <td>{display(boat.slug)}</td>
                      <td>{display(boat.listing_type)}</td>
                      <td>{display(boat.boat_type || boat.vessel_type)}</td>
                      <td>{display(boat.owner_user_id ?? boat.created_by_id)}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-section-heading">
              <h2>{ui.routes}</h2>
              <span>{data.experiences?.length ?? 0}</span>
            </div>
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
                  {(data.experiences ?? []).map((experience, index) => (
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
          </section>

          <section className="admin-card">
            <h2>{ui.fees}</h2>
            <dl className="admin-definition-grid">
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
            <ul className="admin-notes">
              {(feeSettings?.notes ?? []).map((note) => <li key={note}>{note}</li>)}
            </ul>
          </section>

          {warnings.length ? (
            <section className="admin-card admin-warning">
              <h2>{ui.warnings}</h2>
              <ul>
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
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
        .admin-card h2 {
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

        .admin-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .admin-summary-card {
          display: grid;
          align-content: space-between;
          gap: 14px;
          min-height: 112px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.045);
          padding: 16px;
        }

        .admin-summary-label,
        .admin-section-heading span,
        .admin-definition-grid dt {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .admin-summary-label {
          line-height: 1.35;
        }

        .admin-summary-value {
          color: rgba(255, 255, 255, 0.94);
          font-size: 34px;
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

        @media (max-width: 860px) {
          .admin-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .admin-load-form,
          .admin-filters,
          .admin-definition-grid {
            grid-template-columns: 1fr;
          }

          .admin-load-form button {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .admin-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
