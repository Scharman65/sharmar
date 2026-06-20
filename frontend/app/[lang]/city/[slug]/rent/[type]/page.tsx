import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIES, COUNTRIES, type CityDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { getRentalType, RENTAL_TYPES, type RentalTypeDefinition } from "@/data/rental-types";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type Props = {
  params: Promise<{
    lang: string;
    slug: string;
    type: string;
  }>;
};

function getCity(slug: string): CityDefinition | null {
  return CITIES.find((city) => city.slug === slug) ?? null;
}

function cityRentPath(lang: Lang, citySlug: string, typeSlug: string): string {
  return `/${lang}/city/${citySlug}/rent/${typeSlug}`;
}

function languageAlternates(citySlug: string, typeSlug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${cityRentPath(lang, citySlug, typeSlug)}`])
  );
}

function getCityMarinas(city: CityDefinition) {
  return MARINAS.filter((marina) => city.marinaSlugs.includes(marina.slug));
}

function pageTitle(city: CityDefinition, rentalType: RentalTypeDefinition): string {
  return `${rentalType.seoLabel} in ${city.title} | Sharmar`;
}

function pageDescription(city: CityDefinition, rentalType: RentalTypeDefinition): string {
  return `Explore rental category pages for ${rentalType.descriptionLabel} in ${city.title}, with links to related marina and destination pages.`;
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    CITIES.flatMap((city) =>
      RENTAL_TYPES.map((rentalType) => ({
        lang,
        slug: city.slug,
        type: rentalType.slug,
      }))
    )
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug, type } = await params;
  const city = getCity(slug);
  const rentalType = getRentalType(type);

  if (!isLang(rawLang) || !city || !rentalType) {
    return {
      title: "Rental page not found | Sharmar",
    };
  }

  const canonical = `${SITE_URL}${cityRentPath(rawLang, city.slug, rentalType.slug)}`;
  const title = pageTitle(city, rentalType);
  const description = pageDescription(city, rentalType);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(city.slug, rentalType.slug),
        "x-default": `${SITE_URL}${cityRentPath("en", city.slug, rentalType.slug)}`,
      },
    },
    openGraph: {
      title,
      description,
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

  const country = COUNTRIES.find((item) => item.slug === city.countrySlug);
  const marinas = getCityMarinas(city);
  const pageUrl = absoluteSiteUrl(cityRentPath(lang, city.slug, rentalType.slug));
  const title = pageTitle(city, rentalType);
  const description = pageDescription(city, rentalType);
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: title,
      description,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      {
        name: country?.title ?? city.countrySlug,
        url: absoluteSiteUrl(`/${lang}/country/${country?.slug ?? city.countrySlug}`),
      },
      { name: city.title, url: absoluteSiteUrl(`/${lang}/city/${city.slug}`) },
      { name: rentalType.pluralTitle, url: pageUrl },
    ]),
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
            Back to {city.title}
          </Link>
          {country ? (
            <Link className="backlink" href={`/${lang}/country/${country.slug}`}>
              Back to {country.title}
            </Link>
          ) : null}
        </div>

        <section className="geo-hero">
          <p className="kicker">{country?.title ?? "Destination"} city rental category</p>
          <h1>{rentalType.pluralTitle} in {city.title}</h1>
          <p>
            Explore rental category pages for {rentalType.descriptionLabel} in {city.title}.
            Browse marina destination pages before checking individual listings for boat
            details, prices, and availability.
          </p>
          <div className="geo-actions">
            <Link href={`/${lang}/city/${city.slug}`}>View {city.title}</Link>
            {country ? (
              <Link href={`/${lang}/country/${country.slug}/rent/${rentalType.slug}`}>
                View {country.title} {rentalType.descriptionLabel}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-marinas-title">
          <div className="geo-section-head">
            <h2 id="city-rent-marinas-title">Related marinas in {city.title}</h2>
            <p>Browse marina destinations connected to this static city rental category page.</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.region}</p>
                <h3>{marina.title}</h3>
                <p>Marina destination page for {city.title}, {marina.country}.</p>
                <span>View marina</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-links-title">
          <div className="geo-section-head">
            <h2 id="city-rent-links-title">Destination links</h2>
            <p>Continue from this rental category page to the general city and country pages.</p>
          </div>

          <div className="link-grid">
            <Link href={`/${lang}/city/${city.slug}`}>General {city.title} page</Link>
            {country ? (
              <Link href={`/${lang}/country/${country.slug}`}>General {country.title} page</Link>
            ) : null}
            <Link href={`/${lang}/rent/${rentalType.slug}`}>General {rentalType.descriptionLabel}</Link>
          </div>
        </section>
      </div>

      <style>{`
        .geo-page {
          padding-bottom: 64px;
        }

        .backlinks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .geo-hero {
          margin-top: 22px;
          max-width: 920px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .geo-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: 0;
        }

        .geo-hero p {
          max-width: 760px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .geo-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .geo-actions a,
        .geo-card span,
        .link-grid a {
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

        .geo-section {
          margin-top: 28px;
          max-width: 1100px;
        }

        .geo-section-head {
          margin-bottom: 14px;
        }

        .geo-section-head h2 {
          margin: 0;
          line-height: 1.15;
        }

        .geo-section-head p {
          max-width: 720px;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .geo-grid,
        .link-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .geo-card {
          display: flex;
          min-height: 215px;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
          transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease;
        }

        .geo-card:hover,
        .link-grid a:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.24);
          background: rgba(255,255,255,0.06);
        }

        .geo-card h3 {
          margin: 6px 0 0;
          font-size: 24px;
          line-height: 1.15;
        }

        .geo-card p:not(.kicker) {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        @media (max-width: 900px) {
          .geo-grid,
          .link-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .geo-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .geo-grid,
          .link-grid {
            grid-template-columns: 1fr;
          }

          .geo-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
