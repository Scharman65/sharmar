import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COUNTRIES, CITIES, type CountryDefinition } from "@/data/geography";
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

function getCountry(slug: string): CountryDefinition | null {
  return COUNTRIES.find((country) => country.slug === slug) ?? null;
}

function countryRentPath(lang: Lang, countrySlug: string, typeSlug: string): string {
  return `/${lang}/country/${countrySlug}/rent/${typeSlug}`;
}

function languageAlternates(countrySlug: string, typeSlug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${countryRentPath(lang, countrySlug, typeSlug)}`])
  );
}

function getCountryCities(countrySlug: string) {
  return CITIES.filter((city) => city.countrySlug === countrySlug);
}

function getCountryMarinas(countrySlug: string) {
  const marinaSlugs = new Set(
    getCountryCities(countrySlug).flatMap((city) => city.marinaSlugs)
  );

  return MARINAS.filter((marina) => marinaSlugs.has(marina.slug));
}

function pageTitle(country: CountryDefinition, rentalType: RentalTypeDefinition): string {
  return `${rentalType.seoLabel} in ${country.title} | Sharmar`;
}

function pageDescription(country: CountryDefinition, rentalType: RentalTypeDefinition): string {
  return `Explore rental category pages for ${rentalType.descriptionLabel} in ${country.title}, with links to related city and marina destination pages.`;
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    COUNTRIES.flatMap((country) =>
      RENTAL_TYPES.map((rentalType) => ({
        lang,
        slug: country.slug,
        type: rentalType.slug,
      }))
    )
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug, type } = await params;
  const country = getCountry(slug);
  const rentalType = getRentalType(type);

  if (!isLang(rawLang) || !country || !rentalType) {
    return {
      title: "Rental page not found | Sharmar",
    };
  }

  const canonical = `${SITE_URL}${countryRentPath(rawLang, country.slug, rentalType.slug)}`;
  const title = pageTitle(country, rentalType);
  const description = pageDescription(country, rentalType);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(country.slug, rentalType.slug),
        "x-default": `${SITE_URL}${countryRentPath("en", country.slug, rentalType.slug)}`,
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

export default async function CountryRentTypePage({ params }: Props) {
  const { lang: rawLang, slug, type } = await params;

  if (!isLang(rawLang)) notFound();

  const lang = rawLang;
  const country = getCountry(slug);
  const rentalType = getRentalType(type);

  if (!country || !rentalType) notFound();

  const cities = getCountryCities(country.slug);
  const marinas = getCountryMarinas(country.slug);
  const pageUrl = absoluteSiteUrl(countryRentPath(lang, country.slug, rentalType.slug));
  const title = pageTitle(country, rentalType);
  const description = pageDescription(country, rentalType);
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: title,
      description,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      { name: country.title, url: absoluteSiteUrl(`/${lang}/country/${country.slug}`) },
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
        <Link className="backlink" href={`/${lang}/country/${country.slug}`}>
          Back to {country.title}
        </Link>

        <section className="geo-hero">
          <p className="kicker">Country rental category</p>
          <h1>{rentalType.pluralTitle} in {country.title}</h1>
          <p>
            Explore rental category pages for {rentalType.descriptionLabel} in {country.title}.
            Browse city and marina destination pages before checking individual listings for
            boat details, prices, and availability.
          </p>
          <div className="geo-actions">
            <Link href={`/${lang}/country/${country.slug}`}>View {country.title}</Link>
            <Link href={`/${lang}/rent/${rentalType.slug}`}>View general {rentalType.descriptionLabel}</Link>
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-rent-cities-title">
          <div className="geo-section-head">
            <h2 id="country-rent-cities-title">City rental pages in {country.title}</h2>
            <p>Explore rental category pages for city destinations connected to {country.title}.</p>
          </div>

          <div className="geo-grid">
            {cities.map((city) => (
              <Link key={city.slug} className="geo-card" href={`/${lang}/city/${city.slug}/rent/${rentalType.slug}`}>
                <p className="kicker">{country.title}</p>
                <h3>{rentalType.pluralTitle} in {city.title}</h3>
                <p>Static category page for {rentalType.descriptionLabel} connected to {city.title}.</p>
                <span>View city category</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-rent-marinas-title">
          <div className="geo-section-head">
            <h2 id="country-rent-marinas-title">Related marinas</h2>
            <p>Browse marina destinations connected to these static country and city pages.</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card compact-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.city}</p>
                <h3>{marina.title}</h3>
                <p>Marina destination page in {marina.country}.</p>
                <span>View marina</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .geo-page {
          padding-bottom: 64px;
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
        .geo-card span {
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

        .geo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .geo-card {
          display: flex;
          min-height: 235px;
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

        .compact-card {
          min-height: 205px;
        }

        .geo-card:hover {
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
          .geo-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .geo-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .geo-grid {
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
