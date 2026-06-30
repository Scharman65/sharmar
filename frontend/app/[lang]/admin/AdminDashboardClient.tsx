"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { Lang } from "@/i18n";

type StatusFilter = "all" | "draft" | "published" | "awaiting";
type LocaleFilter = "all" | "ru" | "en" | "sr-Latn-ME";
type ListingTypeFilter = "all" | "rent" | "sale";
type AdminSection = "overview" | "boats" | "routes" | "owners" | "bookings" | "payments" | "translations" | "quality" | "system";
type RequiredLocale = "ru" | "en" | "me";
type StrapiLocale = "ru" | "en" | "sr-Latn-ME";

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

type TranslationSourcePackage = {
  readOnly?: boolean;
  mode?: string;
  doesCallAi?: boolean;
  doesSaveData?: boolean;
  sourceBoatDocumentId?: string | null;
  sourceLocale?: string | null;
  requestedTargetLocales?: string[];
  requiredLocales?: string[];
  existingBoatLocaleVersions?: Array<{
    locale?: string;
    label?: string;
    exists?: boolean;
    slugCandidates?: {
      latinOnly?: string;
      deterministicCollisionSafe?: string;
      strategy?: string;
    };
  }>;
  missingBoatLocales?: string[];
  sourceBoatFields?: Record<string, string | undefined>;
  linkedExperiences?: Array<{
    sourceDocumentId?: string | null;
    localeVersions?: Array<{
      locale?: string;
      label?: string;
      title?: string | null;
      slugCandidates?: {
        latinOnly?: string;
        deterministicCollisionSafe?: string;
        strategy?: string;
      };
    }>;
  }>;
  linkedExperiencesCount?: number;
  warnings?: string[];
};

type TranslationSourcePackageResponse = {
  ok?: boolean;
  code?: string;
  sourceLocale?: string;
  targetLocales?: string[];
  sourcePackage?: TranslationSourcePackage;
};

type TranslationFields = {
  title?: string | null;
  description?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  included_services?: string | null;
  meeting_point?: string | null;
};

type TranslationAiPreviewResponse = {
  ok?: boolean;
  code?: string;
  aiPreview?: {
    model?: string;
    sourceLocale?: string;
    targetLocales?: string[];
    boat?: {
      sourceDocumentId?: string | null;
      translations?: Record<string, TranslationFields | undefined>;
    };
    experiences?: Array<{
      sourceDocumentId?: string | null;
      translations?: Record<string, TranslationFields | undefined>;
    }>;
  };
};

type TranslationDryRunPlan = {
  documentId?: string | null;
  locale?: string | null;
  action?: string | null;
  draftExists?: boolean;
  publishedExists?: boolean;
  fieldsToWrite?: string[];
  fieldsSkipped?: string[];
  relationPlan?: string | null;
  draftSlugPlan?: string | null;
  blocked?: boolean;
  warnings?: string[];
};

type TranslationDryRunResponse = {
  ok?: boolean;
  code?: string;
  mode?: string;
  doesWrite?: boolean;
  boatDocumentId?: string | null;
  sourceLocale?: string | null;
  targetLocales?: string[];
  boat?: TranslationDryRunPlan[];
  experiences?: TranslationDryRunPlan[];
  blockers?: string[];
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

const requiredTranslationLocales: RequiredLocale[] = ["ru", "en", "me"];

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

function StatusBadge({ children, tone }: { children: string; tone: "positive" | "warning" | "neutral" }) {
  return <span className={`admin-badge ${tone}`}>{children}</span>;
}

function normalizeReviewLocale(locale: string | null | undefined): RequiredLocale | null {
  if (locale === "ru") return "ru";
  if (locale === "en") return "en";
  if (locale === "me" || locale === "sr-Latn-ME") return "me";
  return null;
}

function displayLocale(locale: string | null | undefined): string {
  if (locale === "sr-Latn-ME") return "me";
  return display(locale);
}

function displayLocaleLabel(locale: string | null | undefined): string {
  return displayLocale(locale).toUpperCase();
}

function displayLocaleList(locales: Array<string | null | undefined> | undefined): string {
  return locales?.length ? locales.map(displayLocale).join(", ") : "-";
}

function toStrapiLocale(locale: string | null | undefined): StrapiLocale {
  if (locale === "en" || locale === "ru" || locale === "sr-Latn-ME") return locale;
  if (locale === "me") return "sr-Latn-ME";
  return "ru";
}

function targetLocalesForSourceLocale(sourceLocale: StrapiLocale): StrapiLocale[] {
  return ["ru", "en", "sr-Latn-ME"].filter((locale) => locale !== sourceLocale) as StrapiLocale[];
}

function containsCyrillic(value: string | null | undefined): boolean {
  return Boolean(value && /[\u0400-\u04FF]/.test(value));
}

function looksLikeBrandOrModelTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const normalized = title
    .trim()
    .replace(/[—–-]/g, " ")
    .replace(/[^\p{L}\p{N}. ]/gu, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return false;

  const words = normalized.split(" ");
  const hasLatin = /[A-Za-z]/.test(normalized);
  const hasCyrillic = containsCyrillic(normalized);
  const hasBrandCase = words.some((word) => /^[A-Z][A-Za-z0-9.]*$/.test(word));
  const hasModelNumber = /\d/.test(normalized);
  const isShort = words.length <= 4 && normalized.length <= 32;
  const isKnownDemoName = words[0]?.toLowerCase() === "demo";

  return hasLatin && !hasCyrillic && isShort && (hasBrandCase || hasModelNumber || isKnownDemoName);
}

function translationScriptHint(locale: RequiredLocale, title: string | null | undefined): string | null {
  if (!title) return null;
  const hasCyrillic = containsCyrillic(title);
  if (locale === "en" && hasCyrillic) return "EN title may need translation review.";
  if (locale === "ru" && !hasCyrillic && !looksLikeBrandOrModelTitle(title)) {
    return "RU title may need manual review; boat names may intentionally stay untranslated.";
  }
  if (locale === "me" && hasCyrillic) return "ME title may need Latin-script review.";
  return null;
}

function routeTitleForWarning(sourcePackage: TranslationSourcePackage | null, documentId: string): string | null {
  const route = sourcePackage?.linkedExperiences?.find((experience) => experience.sourceDocumentId === documentId);
  const versionWithTitle = route?.localeVersions?.find((version) => version.title?.trim());
  return versionWithTitle?.title?.trim() || null;
}

function formatSourcePackageWarning(warning: string, sourcePackage: TranslationSourcePackage | null): string {
  if (warning === "experience_source_locale_inferred_from_linked_row") {
    return "Route source locale was inferred from the linked route row.";
  }

  const missingBoatLocale = /^Missing boat locale: (.+)$/.exec(warning);
  if (missingBoatLocale) {
    return `Boat is missing ${displayLocale(missingBoatLocale[1]).toUpperCase()} version.`;
  }

  const missingRouteLocale = /^Missing route locale (.+) for (.+)$/.exec(warning);
  if (missingRouteLocale) {
    const locale = displayLocale(missingRouteLocale[1]).toUpperCase();
    const documentId = missingRouteLocale[2];
    const title = routeTitleForWarning(sourcePackage, documentId);
    return title ? `Route "${title}" is missing ${locale} version.` : `Route is missing ${locale} version.`;
  }

  if (warning === "EN title contains Cyrillic and may need translation review.") {
    return "EN route title contains Cyrillic and needs translation review.";
  }

  return warning.replaceAll("sr-Latn-ME", "me");
}

function aiPreviewErrorMessage(code: string | undefined): string {
  if (code === "openai_api_key_missing") return "OpenAI key is missing on the server. AI preview cannot run yet.";
  if (code === "openai_request_failed") return "OpenAI request failed. Try again later.";
  if (code === "ai_translation_invalid_response") return "AI response was invalid. Try again.";
  return code ? `Could not generate AI preview (${code}).` : "Could not generate AI preview.";
}

function dryRunErrorMessage(code: string | undefined): string {
  if (code === "admin_translation_token_missing") return "Admin translation token is missing on the server.";
  if (code === "unauthorized") return "Admin token is invalid.";
  if (code === "dry_run_required") return "Dry-run mode is required.";
  if (code === "invalid_dry_run_payload") return "Dry-run payload is invalid.";
  if (code === "dry_run_planner_failed") return "Dry-run planner failed. Try again later.";
  return code ? `Dry run failed (${code}).` : "Dry run failed. Try again.";
}

function slugCandidateText(candidate: { latinOnly?: string; deterministicCollisionSafe?: string } | null | undefined): string {
  if (!candidate) return "Load source package to see draft slug reference.";
  const value = candidate.deterministicCollisionSafe || candidate.latinOnly;
  if (!value) return "Load source package to see draft slug reference.";
  const cleaned = value
    .replaceAll("-en-en-", "-en-")
    .replaceAll("-me-me-", "-me-")
    .replaceAll("-ru-ru-", "-ru-");

  return `draft: ${cleaned}`;
}

function boatSlugCandidate(sourcePackage: TranslationSourcePackage | null, locale: string): string {
  const row = sourcePackage?.existingBoatLocaleVersions?.find((version) => version.locale === locale || version.label === displayLocale(locale));
  return slugCandidateText(row?.slugCandidates);
}

function routeSlugCandidate(sourcePackage: TranslationSourcePackage | null, routeDocumentId: string | null | undefined, locale: string): string {
  const route = sourcePackage?.linkedExperiences?.find((experience) => experience.sourceDocumentId === routeDocumentId);
  const row = route?.localeVersions?.find((version) => version.locale === locale || version.label === displayLocale(locale));
  return slugCandidateText(row?.slugCandidates);
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
  const [translationSourcePackage, setTranslationSourcePackage] = useState<TranslationSourcePackageResponse | null>(null);
  const [translationSourceLoading, setTranslationSourceLoading] = useState(false);
  const [translationSourceError, setTranslationSourceError] = useState<string | null>(null);
  const [translationAiPreview, setTranslationAiPreview] = useState<TranslationAiPreviewResponse | null>(null);
  const [translationAiLoading, setTranslationAiLoading] = useState(false);
  const [translationAiError, setTranslationAiError] = useState<string | null>(null);
  const [translationDryRun, setTranslationDryRun] = useState<TranslationDryRunResponse | null>(null);
  const [translationDryRunLoading, setTranslationDryRunLoading] = useState(false);
  const [translationDryRunError, setTranslationDryRunError] = useState<string | null>(null);

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

  async function loadTranslationSourcePackage() {
    if (!selectedBoat?.documentId) {
      setTranslationSourceError("Boat documentId is required.");
      return;
    }

    setTranslationSourceLoading(true);
    setTranslationSourceError(null);
    setTranslationSourcePackage(null);

    const sourceLocale = toStrapiLocale(selectedBoat.locale);

    try {
      const response = await fetch("/api/admin/translations/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          boatDocumentId: selectedBoat.documentId,
          sourceLocale,
          targetLocales: targetLocalesForSourceLocale(sourceLocale),
          generateAi: false,
        }),
      });
      const json: TranslationSourcePackageResponse = await response.json().catch(() => ({ ok: false, code: "unknown" }));
      setTranslationSourcePackage(json);

      if (!response.ok || json.ok === false) {
        setTranslationSourceError(json.code ? `Could not load source package (${json.code}).` : "Could not load source package.");
      }
    } catch {
      setTranslationSourceError("Could not load source package.");
    } finally {
      setTranslationSourceLoading(false);
    }
  }

  async function generateTranslationAiPreview() {
    if (!selectedBoat?.documentId) {
      setTranslationAiError("Boat documentId is required.");
      return;
    }

    setTranslationAiLoading(true);
    setTranslationAiError(null);
    setTranslationAiPreview(null);
    setTranslationDryRun(null);
    setTranslationDryRunError(null);

    const sourceLocale = toStrapiLocale(selectedBoat.locale);

    try {
      const response = await fetch("/api/admin/translations/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          boatDocumentId: selectedBoat.documentId,
          sourceLocale,
          targetLocales: targetLocalesForSourceLocale(sourceLocale),
          generateAi: true,
        }),
      });
      const json: TranslationAiPreviewResponse = await response.json().catch(() => ({ ok: false, code: "unknown" }));
      setTranslationAiPreview(json);

      if (!response.ok || json.ok === false || !json.aiPreview) {
        setTranslationAiError(aiPreviewErrorMessage(json.code));
      }
    } catch {
      setTranslationAiError(aiPreviewErrorMessage(undefined));
    } finally {
      setTranslationAiLoading(false);
    }
  }

  async function runTranslationSaveDraftDryRun() {
    if (!selectedBoat?.documentId || !aiPreview) {
      setTranslationDryRunError("AI preview is required before dry run.");
      return;
    }

    setTranslationDryRunLoading(true);
    setTranslationDryRunError(null);
    setTranslationDryRun(null);

    const sourceLocale = toStrapiLocale(aiPreview.sourceLocale ?? selectedBoat.locale);
    const targetLocales = (aiPreview.targetLocales?.length ? aiPreview.targetLocales : targetLocalesForSourceLocale(sourceLocale))
      .map(toStrapiLocale)
      .filter((item, index, list) => item !== sourceLocale && list.indexOf(item) === index);

    try {
      const response = await fetch("/api/admin/translations/save-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          boatDocumentId: selectedBoat.documentId,
          sourceLocale,
          targetLocales,
          dryRun: true,
          overwrite: false,
          aiPreview: {
            boat: aiPreview.boat,
            experiences: aiPreview.experiences ?? [],
          },
        }),
      });
      const json: TranslationDryRunResponse = await response.json().catch(() => ({ ok: false, code: "unknown" }));
      setTranslationDryRun(json);

      if (!response.ok || json.ok === false) {
        setTranslationDryRunError(dryRunErrorMessage(json.code));
      }
    } catch {
      setTranslationDryRunError(dryRunErrorMessage(undefined));
    } finally {
      setTranslationDryRunLoading(false);
    }
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
  const selectedTranslationReviewRows = requiredTranslationLocales.map((reviewLocale) => {
    const versions = selectedBoatLocaleVersions.filter((boat) => normalizeReviewLocale(boat.locale) === reviewLocale);
    const primaryVersion = versions[0] ?? null;
    const states = Array.from(new Set(versions.map((boat) => boat.state).filter(Boolean)));
    const exists = versions.length > 0;
    const hasTitle = versions.some((boat) => Boolean(boat.title));
    const hasSlug = versions.some((boat) => Boolean(boat.slug));
    const readiness = !exists ? "missing" : hasTitle && hasSlug ? "ready" : "incomplete";

    return {
      locale: reviewLocale,
      exists,
      states,
      title: primaryVersion?.title ?? null,
      slug: primaryVersion?.slug ?? null,
      documentId: primaryVersion?.documentId ?? null,
      readiness,
      scriptHint: translationScriptHint(reviewLocale, primaryVersion?.title),
    };
  });
  const selectedTranslationQualityFlags = selectedTranslationReviewRows.flatMap((row) => {
    const flags: string[] = [];
    if (!row.exists) flags.push(`Missing ${row.locale.toUpperCase()} version`);

    selectedBoatLocaleVersions
      .filter((boat) => normalizeReviewLocale(boat.locale) === row.locale)
      .forEach((boat) => {
        const label = row.locale.toUpperCase();
        if (!boat.title) flags.push(`${label} locale version missing title`);
        if (!boat.slug) flags.push(`${label} locale version missing slug`);
      });

    if (row.scriptHint) flags.push(row.scriptHint);
    return flags;
  });
  const sourcePackage = translationSourcePackage?.sourcePackage ?? null;
  const aiPreview = translationAiPreview?.aiPreview ?? null;
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
                                onClick={() => {
                                  setSelectedBoatKey(key);
                                  setTranslationSourcePackage(null);
                                  setTranslationSourceError(null);
                                  setTranslationAiPreview(null);
                                  setTranslationAiError(null);
                                  setTranslationDryRun(null);
                                  setTranslationDryRunError(null);
                                }}
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
                    <button
                      className="admin-secondary-button"
                      type="button"
                      onClick={() => {
                        setSelectedBoatKey(null);
                        setTranslationSourcePackage(null);
                        setTranslationSourceError(null);
                        setTranslationAiPreview(null);
                        setTranslationAiError(null);
                        setTranslationDryRun(null);
                        setTranslationDryRunError(null);
                      }}
                    >
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
                    <div className="admin-translation-review">
                      <div className="admin-translation-review-heading">
                        <div>
                          <h5>Translation review</h5>
                          <p>AI preview is available. Draft saving and locale publishing will be added in a later protected write phase.</p>
                          <p>Boat names and model names may intentionally remain untranslated.</p>
                        </div>
                        <div className="admin-translation-required">
                          {requiredTranslationLocales.map((reviewLocale) => (
                            <StatusBadge key={reviewLocale} tone="neutral">{reviewLocale}</StatusBadge>
                          ))}
                        </div>
                      </div>
                      <dl className="admin-definition-grid">
                        <div><dt>Source documentId</dt><dd className="admin-mono">{display(selectedBoat.documentId)}</dd></div>
                        <div><dt>Current selected locale</dt><dd>{display(selectedBoat.locale)}</dd></div>
                        <div><dt>Existing locale versions count</dt><dd>{selectedBoatLocaleVersions.length}</dd></div>
                        <div><dt>Required locales</dt><dd>{requiredTranslationLocales.join(", ")}</dd></div>
                      </dl>
                      <div className="admin-source-package">
                        <div className="admin-source-package-heading">
                          <h5>Translation source package</h5>
                          <p>This source package is read-only. It does not call AI and does not save data.</p>
                          <div className="admin-source-package-actions">
                            <button
                              className="admin-secondary-button"
                              type="button"
                              disabled={translationSourceLoading || !selectedBoat.documentId}
                              onClick={() => void loadTranslationSourcePackage()}
                            >
                              {translationSourceLoading ? "Loading..." : "Load source package"}
                            </button>
                          </div>
                        </div>
                        {translationSourceError ? (
                          <p className="admin-detail-warning">{translationSourceError}</p>
                        ) : null}
                        {sourcePackage ? (
                          <div className="admin-source-package-result">
                            <dl className="admin-definition-grid">
                              <div><dt>source locale</dt><dd>{displayLocale(sourcePackage.sourceLocale ?? translationSourcePackage?.sourceLocale)}</dd></div>
                              <div><dt>requested target locales</dt><dd>{displayLocaleList(sourcePackage.requestedTargetLocales ?? translationSourcePackage?.targetLocales)}</dd></div>
                              <div><dt>existing locale coverage</dt><dd>{displayLocaleList((sourcePackage.existingBoatLocaleVersions ?? []).filter((row) => row.exists).map((row) => row.label ?? row.locale))}</dd></div>
                              <div><dt>missing locales</dt><dd>{displayLocaleList(sourcePackage.missingBoatLocales)}</dd></div>
                              <div><dt>source fields</dt><dd>{Object.entries(sourcePackage.sourceBoatFields ?? {}).map(([field, status]) => `${field}: ${status}`).join(", ") || "-"}</dd></div>
                              <div><dt>linked routes count</dt><dd>{numberDisplay(sourcePackage.linkedExperiencesCount)}</dd></div>
                              <div><dt>mode</dt><dd>{display(sourcePackage.mode)}</dd></div>
                              <div><dt>AI / save</dt><dd>AI: {yesNo(sourcePackage.doesCallAi === true)} · save: {yesNo(sourcePackage.doesSaveData === true)}</dd></div>
                            </dl>
                            <div className={sourcePackage.warnings?.length ? "admin-translation-flags" : "admin-empty"}>
                              <h5>Source package warnings</h5>
                              {sourcePackage.warnings?.length ? (
                                <ul>
                                  {sourcePackage.warnings.map((warning, index) => (
                                    <li key={`${warning}-${index}`}>{formatSourcePackageWarning(warning, sourcePackage)}</li>
                                  ))}
                                </ul>
                              ) : <p>No source package warnings.</p>}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="admin-ai-preview">
                        <div className="admin-ai-preview-heading">
                          <h5>AI translation preview</h5>
                          <p>This generates a preview only. It does not save or publish translations.</p>
                          <div className="admin-source-package-actions">
                            <button
                              className="admin-secondary-button"
                              type="button"
                              disabled={translationAiLoading || !selectedBoat.documentId}
                              onClick={() => void generateTranslationAiPreview()}
                            >
                              {translationAiLoading ? "Generating..." : "Generate AI preview"}
                            </button>
                          </div>
                        </div>
                        <dl className="admin-definition-grid">
                          <div><dt>Safety</dt><dd>AI preview only · save: no · publish: no</dd></div>
                        </dl>
                        {translationAiError ? (
                          <p className="admin-detail-warning">{translationAiError}</p>
                        ) : null}
                        {aiPreview ? (
                          <div className="admin-ai-preview-result">
                            {!translationAiError ? (
                              <p className="admin-ai-preview-success">AI preview generated successfully. Nothing was saved.</p>
                            ) : null}
                            <dl className="admin-definition-grid">
                              <div><dt>model</dt><dd>{display(aiPreview.model)}</dd></div>
                              <div><dt>source locale</dt><dd>{displayLocale(aiPreview.sourceLocale)}</dd></div>
                              <div><dt>target locales</dt><dd>{displayLocaleList(aiPreview.targetLocales)}</dd></div>
                              <div><dt>boat sourceDocumentId</dt><dd className="admin-mono">{display(aiPreview.boat?.sourceDocumentId)}</dd></div>
                            </dl>
                            <div className="admin-ai-preview-grid">
                              {(aiPreview.targetLocales ?? []).map((targetLocale) => {
                                const translation = aiPreview.boat?.translations?.[targetLocale];

                                return (
                                  <section className="admin-ai-preview-card" key={`boat-${targetLocale}`}>
                                    <h6>{displayLocaleLabel(targetLocale)} boat</h6>
                                    <dl className="admin-definition-grid">
                                      <div><dt>title</dt><dd>{display(translation?.title)}</dd></div>
                                      <div><dt>description</dt><dd>{display(translation?.description)}</dd></div>
                                      <div><dt>draft slug reference</dt><dd>{boatSlugCandidate(sourcePackage, targetLocale)}</dd></div>
                                    </dl>
                                  </section>
                                );
                              })}
                            </div>
                            {aiPreview.experiences?.length ? (
                              <div className="admin-ai-preview-routes">
                                <h6>Route translations</h6>
                                {aiPreview.experiences.map((route, routeIndex) => (
                                  <section className="admin-ai-preview-card" key={`${route.sourceDocumentId ?? "route"}-${routeIndex}`}>
                                    <dl className="admin-definition-grid">
                                      <div><dt>route sourceDocumentId</dt><dd className="admin-mono">{display(route.sourceDocumentId)}</dd></div>
                                    </dl>
                                    <div className="admin-ai-preview-grid">
                                      {(aiPreview.targetLocales ?? []).map((targetLocale) => {
                                        const translation = route.translations?.[targetLocale];

                                        return (
                                          <section className="admin-ai-preview-card nested" key={`${route.sourceDocumentId ?? routeIndex}-${targetLocale}`}>
                                            <h6>{displayLocaleLabel(targetLocale)}</h6>
                                            <dl className="admin-definition-grid">
                                              <div><dt>title</dt><dd>{display(translation?.title)}</dd></div>
                                              <div><dt>short_description</dt><dd>{display(translation?.short_description)}</dd></div>
                                              <div><dt>full_description</dt><dd>{display(translation?.full_description)}</dd></div>
                                              <div><dt>included_services</dt><dd>{display(translation?.included_services)}</dd></div>
                                              <div><dt>meeting_point</dt><dd>{display(translation?.meeting_point)}</dd></div>
                                              <div><dt>draft slug reference</dt><dd>{routeSlugCandidate(sourcePackage, route.sourceDocumentId, targetLocale)}</dd></div>
                                            </dl>
                                          </section>
                                        );
                                      })}
                                    </div>
                                  </section>
                                ))}
                              </div>
                            ) : <p className="admin-empty">No linked route translations returned.</p>}
                          </div>
                        ) : null}
                        <div className="admin-dry-run-preview">
                          <div className="admin-ai-preview-heading">
                            <h5>Save draft dry run</h5>
                            <p>This checks what would be saved later. It does not write, publish, or change data.</p>
                            <div className="admin-source-package-actions">
                              <button
                                className="admin-secondary-button"
                                type="button"
                                disabled={translationDryRunLoading || !aiPreview || !selectedBoat.documentId}
                                onClick={() => void runTranslationSaveDraftDryRun()}
                              >
                                {translationDryRunLoading ? "Checking..." : "Dry run save draft"}
                              </button>
                            </div>
                          </div>
                          <dl className="admin-definition-grid">
                            <div><dt>Safety</dt><dd>Dry run only · write: no · publish: no</dd></div>
                          </dl>
                          {translationDryRunError ? (
                            <p className="admin-detail-warning">{translationDryRunError}</p>
                          ) : null}
                          {translationDryRun?.ok ? (
                            <div className="admin-dry-run-result">
                              <dl className="admin-definition-grid">
                                <div><dt>mode</dt><dd>{display(translationDryRun.mode)}</dd></div>
                                <div><dt>write</dt><dd>{yesNo(translationDryRun.doesWrite === true)}</dd></div>
                                <div><dt>source locale</dt><dd>{displayLocale(translationDryRun.sourceLocale)}</dd></div>
                                <div><dt>target locales</dt><dd>{displayLocaleList(translationDryRun.targetLocales)}</dd></div>
                              </dl>
                              <div className="admin-ai-preview-routes">
                                <h6>Boat planned actions</h6>
                                {translationDryRun.boat?.length ? (
                                  <div className="admin-ai-preview-grid">
                                    {translationDryRun.boat.map((plan) => (
                                      <section className="admin-ai-preview-card nested" key={`dry-boat-${plan.locale}`}>
                                        <h6>{displayLocaleLabel(plan.locale)} boat</h6>
                                        <dl className="admin-definition-grid">
                                          <div><dt>action</dt><dd>{display(plan.action)}</dd></div>
                                          <div><dt>draft exists</dt><dd>{yesNo(plan.draftExists === true)}</dd></div>
                                          <div><dt>published exists</dt><dd>{yesNo(plan.publishedExists === true)}</dd></div>
                                          <div><dt>fields to write later</dt><dd>{plan.fieldsToWrite?.length ? plan.fieldsToWrite.join(", ") : "-"}</dd></div>
                                          <div><dt>fields skipped</dt><dd>{plan.fieldsSkipped?.length ? plan.fieldsSkipped.join(", ") : "-"}</dd></div>
                                          <div><dt>blocked</dt><dd>{yesNo(plan.blocked === true)}</dd></div>
                                          <div><dt>warnings</dt><dd>{plan.warnings?.length ? plan.warnings.join(" ") : "-"}</dd></div>
                                        </dl>
                                      </section>
                                    ))}
                                  </div>
                                ) : <p className="admin-empty">No boat dry-run actions.</p>}
                              </div>
                              <div className="admin-ai-preview-routes">
                                <h6>Route planned actions</h6>
                                {translationDryRun.experiences?.length ? (
                                  <div className="admin-ai-preview-grid">
                                    {translationDryRun.experiences.map((plan, index) => (
                                      <section className="admin-ai-preview-card nested" key={`dry-route-${plan.documentId ?? index}-${plan.locale}`}>
                                        <h6>{displayLocaleLabel(plan.locale)} route</h6>
                                        <dl className="admin-definition-grid">
                                          <div><dt>documentId</dt><dd className="admin-mono">{display(plan.documentId)}</dd></div>
                                          <div><dt>action</dt><dd>{display(plan.action)}</dd></div>
                                          <div><dt>draft exists</dt><dd>{yesNo(plan.draftExists === true)}</dd></div>
                                          <div><dt>published exists</dt><dd>{yesNo(plan.publishedExists === true)}</dd></div>
                                          <div><dt>fields to write later</dt><dd>{plan.fieldsToWrite?.length ? plan.fieldsToWrite.join(", ") : "-"}</dd></div>
                                          <div><dt>draft slug plan</dt><dd>{display(plan.draftSlugPlan)}</dd></div>
                                          <div><dt>relation plan</dt><dd>{display(plan.relationPlan)}</dd></div>
                                          <div><dt>blocked</dt><dd>{yesNo(plan.blocked === true)}</dd></div>
                                          <div><dt>warnings</dt><dd>{plan.warnings?.length ? plan.warnings.join(" ") : "-"}</dd></div>
                                        </dl>
                                      </section>
                                    ))}
                                  </div>
                                ) : <p className="admin-empty">No route dry-run actions.</p>}
                              </div>
                              <div className={translationDryRun.blockers?.length ? "admin-translation-flags" : "admin-empty"}>
                                <h6>Blockers</h6>
                                {translationDryRun.blockers?.length ? (
                                  <ul>
                                    {translationDryRun.blockers.map((blocker, index) => (
                                      <li key={`${blocker}-${index}`}>{blocker}</li>
                                    ))}
                                  </ul>
                                ) : <p>No dry-run blockers.</p>}
                              </div>
                              <div className={translationDryRun.warnings?.length ? "admin-translation-flags" : "admin-empty"}>
                                <h6>Warnings</h6>
                                {translationDryRun.warnings?.length ? (
                                  <ul>
                                    {translationDryRun.warnings.map((warning, index) => (
                                      <li key={`${warning}-${index}`}>{warning}</li>
                                    ))}
                                  </ul>
                                ) : <p>No dry-run warnings.</p>}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-translation-review-table">
                          <thead>
                            <tr>
                              <th>locale</th>
                              <th>readiness</th>
                              <th>exists</th>
                              <th>states</th>
                              <th>title</th>
                              <th>slug</th>
                              <th>documentId</th>
                              <th>hint</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTranslationReviewRows.map((row) => (
                              <tr key={row.locale}>
                                <td>{row.locale}</td>
                                <td>
                                  <StatusBadge tone={row.readiness === "ready" ? "positive" : "warning"}>
                                    {row.readiness}
                                  </StatusBadge>
                                </td>
                                <td>{yesNo(row.exists)}</td>
                                <td>{row.states.length ? row.states.join(", ") : "-"}</td>
                                <td>{display(row.title)}</td>
                                <td>{display(row.slug)}</td>
                                <td className="admin-mono">{display(row.documentId)}</td>
                                <td>{row.scriptHint ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className={selectedTranslationQualityFlags.length ? "admin-translation-flags" : "admin-empty"}>
                        <h5>Read-only quality flags</h5>
                        {selectedTranslationQualityFlags.length ? (
                          <ul>
                            {selectedTranslationQualityFlags.map((flag, index) => (
                              <li key={`${flag}-${index}`}>{flag}</li>
                            ))}
                          </ul>
                        ) : <p>No translation quality flags from loaded locale data.</p>}
                      </div>
                    </div>
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
          min-width: 0;
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }

        .admin-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          min-width: 0;
        }

        .admin-detail-header p {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.68);
          overflow-wrap: anywhere;
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
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 14px;
          min-width: 0;
        }

        .admin-detail-section {
          display: grid;
          gap: 12px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 16px;
        }

        .admin-detail-grid .admin-detail-section:nth-child(2) {
          grid-column: 1 / -1;
        }

        .admin-detail-section h4 {
          color: rgba(255, 255, 255, 0.88);
        }

        .admin-detail-section h5 {
          margin: 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 14px;
        }

        .admin-detail-section h6 {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 13px;
        }

        .admin-detail-section p {
          min-width: 0;
          margin: 0;
          overflow-wrap: anywhere;
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
          min-width: 0;
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
          min-width: 0;
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
          word-break: break-word;
        }

        .admin-owner-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          min-width: 0;
        }

        .admin-owner-cross-check {
          display: grid;
          gap: 10px;
          min-width: 0;
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
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
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

        :global(.admin-badge.neutral) {
          color: rgba(255, 255, 255, 0.76);
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }

        .admin-translation-review {
          display: grid;
          gap: 14px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          padding: 14px;
        }

        .admin-translation-review-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          min-width: 0;
        }

        .admin-translation-review-heading > div:first-child {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .admin-translation-review-heading p {
          color: rgba(255, 255, 255, 0.64);
          font-size: 13px;
          line-height: 1.55;
        }

        .admin-translation-required {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
          min-width: 0;
        }

        .admin-translation-review-table {
          min-width: 920px;
        }

        .admin-translation-flags {
          display: grid;
          gap: 8px;
          border: 1px solid rgba(255, 198, 92, 0.32);
          border-radius: 8px;
          background: rgba(255, 174, 54, 0.1);
          color: #ffe4ac;
          padding: 12px;
        }

        .admin-translation-flags ul {
          margin: 0;
          padding-left: 18px;
        }

        .admin-translation-flags li {
          margin: 4px 0;
        }

        .admin-source-package {
          display: grid;
          gap: 12px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 14px;
        }

        .admin-source-package-heading {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .admin-source-package-result {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .admin-source-package-heading p {
          color: rgba(255, 255, 255, 0.64);
          font-size: 13px;
          line-height: 1.55;
        }

        .admin-source-package-actions {
          display: flex;
          justify-content: flex-start;
          margin-top: 2px;
        }

        .admin-source-package-actions .admin-secondary-button {
          width: fit-content;
          min-width: 180px;
        }

        .admin-ai-preview {
          display: grid;
          gap: 12px;
          min-width: 0;
          border: 1px solid rgba(101, 255, 146, 0.18);
          border-radius: 8px;
          background: rgba(101, 255, 146, 0.035);
          padding: 14px;
        }

        .admin-ai-preview-heading,
        .admin-ai-preview-result,
        .admin-ai-preview-routes {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .admin-ai-preview-heading p {
          color: rgba(255, 255, 255, 0.64);
          font-size: 13px;
          line-height: 1.55;
        }

        .admin-ai-preview-success {
          border: 1px solid rgba(101, 255, 146, 0.28);
          border-radius: 8px;
          background: rgba(101, 255, 146, 0.08);
          color: #baf7c9;
          padding: 10px 12px;
        }

        .admin-ai-preview-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          min-width: 0;
        }

        .admin-ai-preview-result > .admin-definition-grid {
          min-width: 0;
        }

        .admin-ai-preview-result > .admin-definition-grid dd,
        .admin-ai-preview-card dd {
          min-width: 0;
          max-width: 860px;
          line-height: 1.6;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .admin-ai-preview-card {
          display: grid;
          gap: 10px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.14);
          padding: 12px;
        }

        .admin-ai-preview-card.nested {
          background: rgba(255, 255, 255, 0.035);
        }

        .admin-ai-preview-card .admin-definition-grid {
          grid-template-columns: 1fr;
          gap: 10px;
          min-width: 0;
        }

        .admin-ai-preview-card .admin-definition-grid div {
          min-width: 0;
        }

        .admin-dry-run-preview {
          display: grid;
          gap: 12px;
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          padding: 12px;
        }

        .admin-dry-run-result {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .admin-table-wrap {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
        }

        .admin-detail-section .admin-table-wrap {
          overscroll-behavior-x: contain;
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

        .admin-detail-section .admin-table-compact {
          min-width: 720px;
        }

        .admin-table th,
        .admin-table td {
          padding: 10px 11px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }

        .admin-detail-section .admin-table th,
        .admin-detail-section .admin-table td {
          white-space: normal;
        }

        .admin-detail-section .admin-table .admin-mono {
          overflow-wrap: anywhere;
          word-break: break-word;
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
          min-width: 0;
          margin: 0;
        }

        .admin-definition-grid dd {
          margin: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
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

          .admin-ai-preview-grid {
            grid-template-columns: 1fr;
          }

          .admin-detail-header {
            display: grid;
          }

          .admin-translation-review-heading {
            display: grid;
          }

          .admin-source-package-heading {
            display: grid;
          }

          .admin-translation-required {
            justify-content: flex-start;
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
