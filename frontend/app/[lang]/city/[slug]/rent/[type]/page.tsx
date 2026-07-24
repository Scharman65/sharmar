import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BoatCardSpecs } from "@/components/boat/BoatCardSpecs";
import { DemoBoatOverlay } from "@/components/boat/DemoBoatOverlay";
import { InstantBookingBadge } from "@/components/boat/InstantBookingBadge";
import { CITIES, COUNTRIES, type CityDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { getRentalType, RENTAL_TYPES, type RentalTypeDefinition } from "@/data/rental-types";
import { isLang, LANGS, t, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, itemListJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";
import { fetchBoats, type BoatFilters } from "@/lib/strapi";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string; slug: string; type: string }>;
};

type PageCopy = {
  home: string;
  backToCity: string;
  backToCountry: string;
  kicker: string;
  intro: string;
  boatsTitle: string;
  boatsDescription: string;
  noBoats: string;
  marinasTitle: string;
  marinasDescription: string;
  viewMarina: string;
  destinationLinks: string;
  destinationDescription: string;
  generalCity: string;
  generalCountry: string;
  generalCategory: string;
};

const CITY_NAMES: Record<string, Record<Lang, string>> = {
  tivat: { en: "Tivat", ru: "Тиват", me: "Tivat" },
  budva: { en: "Budva", ru: "Будва", me: "Budva" },
  kotor: { en: "Kotor", ru: "Котор", me: "Kotor" },
  bar: { en: "Bar", ru: "Бар", me: "Bar" },
  "herceg-novi": { en: "Herceg Novi", ru: "Херцег-Нови", me: "Herceg Novi" },
  dubrovnik: { en: "Dubrovnik", ru: "Дубровник", me: "Dubrovnik" },
  split: { en: "Split", ru: "Сплит", me: "Split" },
  athens: { en: "Athens", ru: "Афины", me: "Atina" },
  mykonos: { en: "Mykonos", ru: "Миконос", me: "Mikonos" },
  santorini: { en: "Santorini", ru: "Санторини", me: "Santorini" },
  corfu: { en: "Corfu", ru: "Корфу", me: "Krf" },
  rhodes: { en: "Rhodes", ru: "Родос", me: "Rodos" },
};

const COUNTRY_NAMES: Record<string, Record<Lang, string>> = {
  montenegro: { en: "Montenegro", ru: "Черногория", me: "Crna Gora" },
  croatia: { en: "Croatia", ru: "Хорватия", me: "Hrvatska" },
  greece: { en: "Greece", ru: "Греция", me: "Grčka" },
};

const TYPE_NAMES: Record<string, Record<Lang, { plural: string; seo: string }>> = {
  motor: {
    en: { plural: "Motor yachts", seo: "Motor Yacht Rentals" },
    ru: { plural: "Моторные яхты", seo: "Аренда моторных яхт" },
    me: { plural: "Motorne jahte", seo: "Najam motornih jahti" },
  },
  catamaran: {
    en: { plural: "Catamarans", seo: "Catamaran Rentals" },
    ru: { plural: "Катамараны", seo: "Аренда катамаранов" },
    me: { plural: "Katamarani", seo: "Najam katamarana" },
  },
  sail: {
    en: { plural: "Sailing boats", seo: "Sailing Boat Rentals" },
    ru: { plural: "Парусные лодки", seo: "Аренда парусных лодок" },
    me: { plural: "Jedrilice", seo: "Najam jedrilica" },
  },
};

function pageCopy(lang: Lang): PageCopy {
  if (lang === "ru") {
    return {
      home: "Главная",
      backToCity: "Назад к городу",
      backToCountry: "Назад к стране",
      kicker: "Аренда лодок по направлению",
      intro: "Смотрите опубликованные лодки, связанные с маринами этого города. Цены и доступность открываются на странице конкретной лодки.",
      boatsTitle: "Доступные лодки",
      boatsDescription: "Актуальные опубликованные предложения из production-каталога Sharmar.",
      noBoats: "Сейчас в этой категории нет опубликованных лодок для выбранного города.",
      marinasTitle: "Связанные марины",
      marinasDescription: "Марины и точки отправления, относящиеся к этому направлению.",
      viewMarina: "Открыть марину",
      destinationLinks: "Ссылки направления",
      destinationDescription: "Перейдите к общей странице города, страны или категории.",
      generalCity: "Страница города",
      generalCountry: "Страница страны",
      generalCategory: "Общая категория",
    };
  }
  if (lang === "me") {
    return {
      home: "Početna",
      backToCity: "Nazad na grad",
      backToCountry: "Nazad na državu",
      kicker: "Najam plovila po destinaciji",
      intro: "Pregledajte objavljena plovila povezana sa marinama ovog grada. Cijene i dostupnost nalaze se na stranici konkretnog plovila.",
      boatsTitle: "Dostupna plovila",
      boatsDescription: "Aktuelne objavljene ponude iz Sharmar production kataloga.",
      noBoats: "Trenutno nema objavljenih plovila u ovoj kategoriji za izabrani grad.",
      marinasTitle: "Povezane marine",
      marinasDescription: "Marine i polazne tačke povezane sa ovom destinacijom.",
      viewMarina: "Otvori marinu",
      destinationLinks: "Linkovi destinacije",
      destinationDescription: "Nastavite ka opštoj stranici grada, države ili kategorije.",
      generalCity: "Stranica grada",
      generalCountry: "Stranica države",
      generalCategory: "Opšta kategorija",
    };
  }
  return {
    home: "Home",
    backToCity: "Back to city",
    backToCountry: "Back to country",
    kicker: "Destination boat rentals",
    intro: "Browse published boats linked to this city's marinas. Prices and availability are shown on each boat page.",
    boatsTitle: "Available boats",
    boatsDescription: "Current published listings from the Sharmar production catalogue.",
    noBoats: "There are currently no published boats in this category for the selected city.",
    marinasTitle: "Related marinas",
    marinasDescription: "Marinas and departure points connected to this destination.",
    viewMarina: "View marina",
    destinationLinks: "Destination links",
    destinationDescription: "Continue to the general city, country, or rental category page.",
    generalCity: "General city page",
    generalCountry: "General country page",
    generalCategory: "General category",
  };
}

function getCity(slug: string): CityDefinition | null {
  return CITIES.find((city) => city.slug === slug) ?? null;
}
function cityName(city: CityDefinition, lang: Lang): string {
  return CITY_NAMES[city.slug]?.[lang] ?? city.title;
}
function countryName(slug: string, fallback: string, lang: Lang): string {
  return COUNTRY_NAMES[slug]?.[lang] ?? fallback;
}
function typeText(rentalType: RentalTypeDefinition, lang: Lang) {
  return TYPE_NAMES[rentalType.slug]?.[lang] ?? {
    plural: rentalType.pluralTitle,
    seo: rentalType.seoLabel,
  };
}
function cityRentPath(lang: Lang, citySlug: string, typeSlug: string): string {
  return `/${lang}/city/${citySlug}/rent/${typeSlug}`;
}
function languageAlternates(citySlug: string, typeSlug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [
      lang === "me" ? "sr-Latn-ME" : lang,
      `${SITE_URL}${cityRentPath(lang, citySlug, typeSlug)}`,
    ]),
  );
}
function getCityMarinas(city: CityDefinition) {
  return MARINAS.filter((marina) => city.marinaSlugs.includes(marina.slug));
}
function vesselFilter(typeSlug: string): BoatFilters["vesselType"] {
  if (typeSlug === "motor") return "motorboat";
  if (typeSlug === "sail") return "sailboat";
  if (typeSlug === "catamaran") return "catamaran";
  return undefined;
}
function metadataText(city: CityDefinition, rentalType: RentalTypeDefinition, lang: Lang) {
  const cityLabel = cityName(city, lang);
  const typeLabel = typeText(rentalType, lang);
  if (lang === "ru") {
    return {
      title: `${typeLabel.seo} в городе ${cityLabel} | Sharmar`,
      description: `${typeLabel.plural} в городе ${cityLabel}: опубликованные лодки, цены, марины и доступность на Sharmar.`,
    };
  }
  if (lang === "me") {
    return {
      title: `${typeLabel.seo} u gradu ${cityLabel} | Sharmar`,
      description: `${typeLabel.plural} u gradu ${cityLabel}: objavljena plovila, cijene, marine i dostupnost na Sharmar.`,
    };
  }
  return {
    title: `${typeLabel.seo} in ${cityLabel} | Sharmar`,
    description: `${typeLabel.plural} in ${cityLabel}: published boats, prices, marinas, and availability on Sharmar.`,
  };
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    CITIES.flatMap((city) =>
      RENTAL_TYPES.map((rentalType) => ({ lang, slug: city.slug, type: rentalType.slug })),
    ),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug, type } = await params;
  const city = getCity(slug);
  const rentalType = getRentalType(type);
  if (!isLang(rawLang) || !city || !rentalType) {
    return { title: "Rental page not found | Sharmar" };
  }
  const meta = metadataText(city, rentalType, rawLang);
  const canonical = `${SITE_URL}${cityRentPath(rawLang, city.slug, rentalType.slug)}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(city.slug, rentalType.slug),
        "x-default": `${SITE_URL}${cityRentPath("en", city.slug, rentalType.slug)}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function CityRentTypePage({ params }: Props) {
  const { lang: rawLang, slug, type } = await params;
  if (!isLang(rawLang)) notFound();

  const lang = rawLang;
  const city = getCity(slug);
  const rentalType = getRentalType(type);
  if (!city || !rentalType) notFound();

  const copy = pageCopy(lang);
  const tr = t(lang);
  const cityLabel = cityName(city, lang);
  const typeLabel = typeText(rentalType, lang);
  const country = COUNTRIES.find((item) => item.slug === city.countrySlug);
  const countryLabel = countryName(city.countrySlug, country?.title ?? city.countrySlug, lang);
  const marinas = getCityMarinas(city);

  const boatGroups = await Promise.all(
    marinas.map((marina) =>
      fetchBoats(lang, {
        listingType: "rent",
        homeMarinaSlug: marina.slug,
        vesselType: vesselFilter(rentalType.slug),
      }).catch(() => []),
    ),
  );
  const boatMap = new Map(
    boatGroups.flat().map((boat) => [boat.documentId ?? String(boat.id), boat]),
  );
  const boats = [...boatMap.values()];

  const pageUrl = absoluteSiteUrl(cityRentPath(lang, city.slug, rentalType.slug));
  const meta = metadataText(city, rentalType, lang);
  const jsonLd = [
    webPageJsonLd({ url: pageUrl, name: meta.title, description: meta.description }),
    breadcrumbJsonLd([
      { name: copy.home, url: absoluteSiteUrl(`/${lang}`) },
      { name: countryLabel, url: absoluteSiteUrl(`/${lang}/country/${country?.slug ?? city.countrySlug}`) },
      { name: cityLabel, url: absoluteSiteUrl(`/${lang}/city/${city.slug}`) },
      { name: typeLabel.plural, url: pageUrl },
    ]),
    itemListJsonLd(
      boats.map((boat) => ({
        name: boat.title ?? `Boat #${boat.id}`,
        url: absoluteSiteUrl(`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`),
      })),
    ),
  ];

  return (
    <main className="main">
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}

      <div className="container geo-page rent-geo-page">
        <div className="backlinks">
          <Link className="backlink" href={`/${lang}/city/${city.slug}`}>
            {copy.backToCity}: {cityLabel}
          </Link>
          {country ? (
            <Link className="backlink" href={`/${lang}/country/${country.slug}`}>
              {copy.backToCountry}: {countryLabel}
            </Link>
          ) : null}
        </div>

        <section className="geo-hero">
          <p className="kicker">{copy.kicker} · {countryLabel}</p>
          <h1>{typeLabel.plural} · {cityLabel}</h1>
          <p>{copy.intro}</p>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-boats-title">
          <div className="geo-section-head">
            <h2 id="city-rent-boats-title">{copy.boatsTitle}</h2>
            <p>{copy.boatsDescription}</p>
          </div>

          {boats.length === 0 ? (
            <p className="empty-state">{copy.noBoats}</p>
          ) : (
            <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {boats.map((boat) => (
                <li key={boat.id} className="card">
                  <Link
                    className="card-link"
                    href={`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`}
                  >
                    {boat.cover?.url ? (
                      <div className="card-media">
                        <Image
                          src={boat.cover.url}
                          alt={boat.cover.alternativeText ?? boat.title ?? "Boat"}
                          fill
                          sizes="(max-width: 900px) 100vw, 900px"
                          style={{ objectFit: "cover" }}
                        />
                        {boat.isDemo ? <DemoBoatOverlay /> : null}
                      </div>
                    ) : (
                      <div className="card-media">{boat.isDemo ? <DemoBoatOverlay /> : null}</div>
                    )}

                    <div className="card-body">
                      <h3 className="card-title">{boat.title ?? `Boat #${boat.id}`}</h3>
                      <p className="card-sub">
                        <span>{tr.boat.type}: {boat.boat_type ?? "—"}</span>
                        <span>·</span>
                        <span>{tr.boat.capacity}: {boat.capacity ?? "—"}</span>
                      </p>
                      <BoatCardSpecs boat={boat} />
                      {boat.listing_type === "rent" && boat.instant_booking ? (
                        <div className="badges"><InstantBookingBadge lang={lang} /></div>
                      ) : null}
                      <div className="card-bottom">
                        <span className="kicker">
                          {boat.license_required ? tr.boat.license_required : tr.boat.license_not_required}
                          {" · "}
                          {boat.skipper_available ? tr.boat.skipper_available : tr.boat.skipper_not_available}
                        </span>
                        <span className="pill">{tr.boat.view_details} →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="geo-section" aria-labelledby="city-rent-marinas-title">
          <div className="geo-section-head">
            <h2 id="city-rent-marinas-title">{copy.marinasTitle}</h2>
            <p>{copy.marinasDescription}</p>
          </div>
          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.region}</p>
                <h3>{marina.title}</h3>
                <p>{cityLabel}, {countryLabel}</p>
                <span>{copy.viewMarina}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-links-title">
          <div className="geo-section-head">
            <h2 id="city-rent-links-title">{copy.destinationLinks}</h2>
            <p>{copy.destinationDescription}</p>
          </div>
          <div className="link-grid">
            <Link href={`/${lang}/city/${city.slug}`}>{copy.generalCity}: {cityLabel}</Link>
            {country ? (
              <Link href={`/${lang}/country/${country.slug}`}>{copy.generalCountry}: {countryLabel}</Link>
            ) : null}
            <Link href={`/${lang}/rent/${rentalType.slug}`}>{copy.generalCategory}: {typeLabel.plural}</Link>
          </div>
        </section>
      </div>

      <style>{`
        .geo-page { padding-bottom: 64px; }
        .backlinks { display: flex; flex-wrap: wrap; gap: 10px; }
        .geo-hero {
          margin-top: 22px;
          max-width: 920px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }
        .geo-hero h1 { margin: 8px 0 0; font-size: clamp(34px, 7vw, 64px); line-height: 0.98; }
        .geo-hero p, .geo-section-head p { color: rgba(255, 255, 255, 0.74); line-height: 1.55; }
        .geo-section { margin-top: 28px; max-width: 1100px; }
        .geo-section-head { margin-bottom: 14px; }
        .geo-section-head h2 { margin: 0; }
        .empty-state {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 20px;
          background: rgba(255,255,255,0.045);
        }
        .geo-grid, .link-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .geo-card {
          display: flex;
          min-height: 190px;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
        }
        .geo-card h3 { margin: 6px 0 0; font-size: 24px; }
        .geo-card p:not(.kicker) { color: rgba(255, 255, 255, 0.72); }
        .geo-card span, .link-grid a {
          display: inline-flex;
          width: fit-content;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          padding: 9px 12px;
          background: rgba(255,255,255,0.08);
          color: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }
        @media (max-width: 900px) {
          .geo-grid, .link-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .geo-hero { padding: 20px; border-radius: 18px; }
          .geo-grid, .link-grid { grid-template-columns: 1fr; }
          .geo-card { min-height: auto; }
        }
      `}</style>
    </main>
  );
}
