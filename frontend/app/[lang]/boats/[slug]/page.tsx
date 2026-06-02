/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getBoatCardImage } from "@/lib/media";
import { BoatGallery } from "@/components/boat/BoatGallery";
import { AvailabilityCalendar } from "@/components/boat/AvailabilityCalendar";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchBoatBySlug } from "@/lib/strapi";
import { isLang, t, type Lang } from "@/i18n";
import { fetchAvailability } from "@/lib/availability";
import { applyMarketplaceFee } from "@/lib/pricing";
import { MARINAS } from "@/data/marinas";

type PageCopy = {
  boatNotFound: string;
  marina: string;
  specifications: string;
  sale: string;
  rent: string;
  availabilityTitle: string;
  availabilityEmpty: string;
  availabilityUnavailable: string;
  requestSlot: string;
  locatedIn: string;
  slug: string;
  type: string;
  capacity: string;
  length: string;
  enginePower: string;
  year: string;
  priceHour: string;
  priceDay: string;
  priceWeek: string;
  deposit: string;
  skipperHour: string;
  skipperDay: string;
  license: string;
  required: string;
  notRequired: string;
  skipper: string;
  available: string;
  notAvailable: string;
};

function pageCopy(lang: Lang): PageCopy {
  if (lang === "ru") {
    return {
      boatNotFound: "Лодка не найдена",
      marina: "Марина",
      specifications: "Характеристики",
      sale: "Продажа",
      rent: "Аренда",
      availabilityTitle: "Доступность (14 дней)",
      availabilityEmpty: "Нет доступных слотов на ближайшие 14 дней.",
      availabilityUnavailable: "Календарь временно недоступен.",
      requestSlot: "Запросить этот слот",
      locatedIn: "Расположено в",
      slug: "Slug",
      type: "Тип",
      capacity: "Вместимость",
      length: "Длина",
      enginePower: "Мощность двигателя",
      year: "Год",
      priceHour: "Цена/час",
      priceDay: "Цена/день",
      priceWeek: "Цена/неделя",
      deposit: "Депозит",
      skipperHour: "Шкипер/час",
      skipperDay: "Шкипер/день",
      license: "Лицензия",
      required: "Требуется",
      notRequired: "Не требуется",
      skipper: "Шкипер",
      available: "Доступен",
      notAvailable: "Недоступен",
    };
  }

  if (lang === "me") {
    return {
      boatNotFound: "Plovilo nije pronađeno",
      marina: "Marina",
      specifications: "Specifikacije",
      sale: "Prodaja",
      rent: "Najam",
      availabilityTitle: "Dostupnost (14 dana)",
      availabilityEmpty: "Nema dostupnih termina u narednih 14 dana.",
      availabilityUnavailable: "Kalendar je privremeno nedostupan.",
      requestSlot: "Zatraži ovaj termin",
      locatedIn: "Nalazi se u",
      slug: "Slug",
      type: "Tip",
      capacity: "Kapacitet",
      length: "Dužina",
      enginePower: "Snaga motora",
      year: "Godina",
      priceHour: "Cijena/sat",
      priceDay: "Cijena/dan",
      priceWeek: "Cijena/nedjelja",
      deposit: "Depozit",
      skipperHour: "Skiper/sat",
      skipperDay: "Skiper/dan",
      license: "Licenca",
      required: "Potrebna",
      notRequired: "Nije potrebna",
      skipper: "Skiper",
      available: "Dostupan",
      notAvailable: "Nedostupan",
    };
  }

  return {
    boatNotFound: "Boat not found",
    marina: "Marina",
    specifications: "Specifications",
    sale: "Sale",
    rent: "Rent",
    availabilityTitle: "Availability (14 days)",
    availabilityEmpty: "No available slots for the next 14 days.",
    availabilityUnavailable: "Calendar is temporarily unavailable.",
    requestSlot: "Request this slot",
    locatedIn: "Located in",
    slug: "Slug",
    type: "Type",
    capacity: "Capacity",
    length: "Length",
    enginePower: "Engine power",
    year: "Year",
    priceHour: "Price/hour",
    priceDay: "Price/day",
    priceWeek: "Price/week",
    deposit: "Deposit",
    skipperHour: "Skipper/hour",
    skipperDay: "Skipper/day",
    license: "License",
    required: "Required",
    notRequired: "Not required",
    skipper: "Skipper",
    available: "Available",
    notAvailable: "Not available",
  };
}

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const strapiLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const boat = await fetchBoatBySlug(slug, strapiLocale);

  if (!boat) {
    return { title: pageCopy(lang).boatNotFound };
  }

  const title = boat.title ?? slug;
  const description =
    (boat.description ?? "").trim() || t(lang).boats.no_description;

  return { title, description };
}

export default async function BoatPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const tr = t(lang);

  const marinaLabel = pageCopy(lang).marina;
  const specsLabel = pageCopy(lang).specifications;
  const saleLabel = pageCopy(lang).sale;
  const rentLabel = pageCopy(lang).rent;

  const availabilityTitle = pageCopy(lang).availabilityTitle;
  const availabilityEmpty = pageCopy(lang).availabilityEmpty;
  const availabilityUnavailable = pageCopy(lang).availabilityUnavailable;
  const requestSlotLabel = pageCopy(lang).requestSlot;

  const fmtMoney = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
    return `${formatted} ${(boat as any)?.currency ?? ""}`.trim();
  };

  const rows: Array<{ label: string; value: string }> = [];
  const add = (
    label: string,
    value: unknown,
    fmt: (x: unknown) => string | null = (x) => {
      if (x === null || x === undefined) return null;
      const t = String(x).trim();
      return t ? t : null;
    }
  ) => {
    const v = fmt(value);
    if (v) rows.push({ label, value: v });
  };

  const strapiLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const boat = await fetchBoatBySlug(slug, strapiLocale);

  const heroImg = getBoatCardImage(boat);
  if (!boat) {
    return (
      <main className="main">
        <div className="container">
          <div className="detail-top">
            <h1 className="h1">{pageCopy(lang).boatNotFound}</h1>
            <Link className="backlink" href={`/${lang}/boats`}>
              ← {tr.boat.back_to_list}
            </Link>
          </div>
          <p className="kicker">{pageCopy(lang).slug}: {slug}</p>
        </div>
      </main>
    );
  }

  const boatId = Number((boat as any).id ?? 0);
  const availability =
    Number.isFinite(boatId) && boatId > 0 ? await fetchAvailability(lang, boatId) : null;
  const homeMarina = (boat as any).home_marina;
  const homeMarinaSlug =
    typeof homeMarina?.slug === "string" ? homeMarina.slug.trim() : "";
  const homeMarinaDefinition =
    MARINAS.find((marina) => marina.slug === homeMarinaSlug) ?? null;
  const homeMarinaHref = homeMarinaDefinition
    ? `/${lang}/marina/${homeMarinaSlug}`
    : null;

  return (
    <main className="main">
      <div className="container">
        <div className="detail-top">
          <h1 className="h1">{boat.title ?? slug}</h1>
          <Link className="backlink" href={`/${lang}/boats`}>
            ← {tr.boat.back_to_list}
          </Link>
        </div>

        <BoatGallery
          heroImg={heroImg}
          images={(boat as any).images ?? []}
          title={boat.title ?? slug}
          slug={slug}
        />

        <div className="meta-row">
          <span>
            {tr.boat.type}: {boat.boat_type ?? "—"}
          </span>
          <span>·</span>
          <span>
            {tr.boat.capacity}: {boat.capacity ?? "—"}
          </span>
          <span>·</span>
          <span data-testid="boat-home-marina">
            {marinaLabel}:{" "}
            {homeMarinaHref ? (
              <Link href={homeMarinaHref}>
                {homeMarina?.name ?? "—"}
                {homeMarina?.region ? ` (${homeMarina.region})` : ""}
              </Link>
            ) : (
              <>
                {homeMarina?.name ?? "—"}
                {homeMarina?.region ? ` (${homeMarina.region})` : ""}
              </>
            )}
          </span>
          <span>·</span>
          <span>
            {boat.license_required
              ? tr.boat.license_required
              : tr.boat.license_not_required}
          </span>
          <span>·</span>
          <span>
            {boat.skipper_available
              ? tr.boat.skipper_available
              : tr.boat.skipper_not_available}
          </span>
        </div>

        {(() => {
          rows.length = 0;

          add(pageCopy(lang).type, boat.boat_type ?? boat.vesselType ?? null);
          add(
            pageCopy(lang).capacity,
            boat.capacity,
            (x) => (x === null || x === undefined ? null : `${x}`)
          );
          add(
            pageCopy(lang).marina,
            (boat as any).home_marina?.name ?? (boat as any).home_marina?.name ?? null
          );
          add(
            pageCopy(lang).length,
            ((boat as any).length_m ?? (boat as any).lengthM ?? (boat as any).length_m ?? null),
            (x) => (x === null || x === undefined ? null : `${x} m`)
          );
          add(
            pageCopy(lang).enginePower,
            ((boat as any).engine_hp ?? (boat as any).engineHp ?? (boat as any).engine_hp ?? null),
            (x) => (x === null || x === undefined ? null : `${x} hp`)
          );

          const listing = (boat as any).listing_type ?? null;

          if (listing === "sale") {
            add(pageCopy(lang).year, (boat as any).year ?? null);
          }

          if (listing === "rent") {
            add(pageCopy(lang).priceHour, applyMarketplaceFee((boat as any).price_per_hour), fmtMoney);
            add(pageCopy(lang).priceDay, applyMarketplaceFee((boat as any).price_per_day), fmtMoney);
            add(pageCopy(lang).priceWeek, applyMarketplaceFee((boat as any).price_per_week), fmtMoney);
            add(pageCopy(lang).deposit, (boat as any).deposit ?? null, fmtMoney);

            add(pageCopy(lang).skipperHour, (boat as any).skipper_price_per_hour ?? null, fmtMoney);
            add(pageCopy(lang).skipperDay, (boat as any).skipper_price_per_day ?? null, fmtMoney);
          }

          add(
            pageCopy(lang).license,
            boat.license_required === true
              ? pageCopy(lang).required
              : boat.license_required === false
                ? pageCopy(lang).notRequired
                : null
          );

          add(
            pageCopy(lang).skipper,
            boat.skipper_available === true
              ? pageCopy(lang).available
              : boat.skipper_available === false
                ? pageCopy(lang).notAvailable
                : null
          );

          if (!rows.length) return null;

          return (
            <div style={{ marginTop: 18 }}>
              <p className="kicker" style={{ marginBottom: 10 }}>
                {specsLabel}
                {listing ? (
                  <span style={{ marginLeft: 10, opacity: 0.7 }}>
                    · {listing === "sale" ? saleLabel : listing === "rent" ? rentLabel : String(listing)}
                  </span>
                ) : null}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {rows.map((r) => (
                  <div
                    key={r.label}
                    style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
                  >
                    <span style={{ opacity: 0.8 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ marginTop: 14 }}>
          {boat.description?.trim() ? (
            <p style={{ lineHeight: 1.7, margin: 0 }}>{boat.description}</p>
          ) : (
            <p className="kicker">{tr.boats.no_description}</p>
          )}
        </div>

        {homeMarinaHref && homeMarinaDefinition ? (
          <section
            aria-labelledby="boat-located-in-title"
            style={{
              marginTop: 18,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255, 255, 255, 0.045)",
            }}
          >
            <p className="kicker" style={{ marginBottom: 8 }}>
              {pageCopy(lang).locatedIn}
            </p>
            <h2
              id="boat-located-in-title"
              style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}
            >
              <Link
                href={homeMarinaHref}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {homeMarinaDefinition.title}
              </Link>
            </h2>
            <p style={{ margin: "8px 0 0", color: "rgba(255, 255, 255, 0.72)" }}>
              {homeMarinaDefinition.city}, {homeMarinaDefinition.country}
            </p>
          </section>
        ) : null}

        <AvailabilityCalendar
          lang={lang}
          availability={availability}
          boat={boat}
          slug={slug}
          requestSlotLabel={requestSlotLabel}
          availabilityTitle={availabilityTitle}
          availabilityEmpty={availabilityEmpty}
          availabilityUnavailable={availabilityUnavailable}
        />

        {boat.verified_listing || boat.featured_listing || boat.purposes?.length ? (
          <div style={{ marginTop: 18 }}>
            <p className="kicker" style={{ marginBottom: 10 }}>
              {tr.boat.purposes}
            </p>
            <div className="badges">
              {boat.verified_listing ? (
                <span className="badge">✓ Verified listing</span>
              ) : null}

              {boat.featured_listing ? (
                <span className="badge">★ Featured yacht</span>
              ) : null}

              {boat.purposes?.map((p) => (
                <span className="badge" key={p.id}>
                  {p.title ?? `Purpose #${p.id}`}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="actions">
          <Link
            className="button"
            href={`/${lang}/request?slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(
              boat.title ?? slug
            )}`}
          >
            {tr.booking.requestThisBoat}
          </Link>

          <Link className="button secondary" href={`/${lang}/boats`}>
            {tr.boat.back_to_list}
          </Link>
        </div>
      </div>
    </main>
  );
}
