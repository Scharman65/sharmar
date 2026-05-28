import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COUNTRIES, CITIES, type CountryDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";

type Props = {
  params: Promise<{
    lang: string;
    slug: string;
  }>;
};

const SITE_URL = "https://sharmar.me";

function getCountry(slug: string): CountryDefinition | null {
  return COUNTRIES.find((country) => country.slug === slug) ?? null;
}

function countryPath(lang: Lang, slug: string): string {
  return `/${lang}/country/${slug}`;
}

function languageAlternates(slug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${countryPath(lang, slug)}`])
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

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    COUNTRIES.map((country) => ({
      lang,
      slug: country.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const country = getCountry(slug);

  if (!country) {
    return {
      title: "Country not found | Sharmar",
    };
  }

  const canonical = `${SITE_URL}${countryPath(lang, country.slug)}`;

  return {
    title: country.seoTitle,
    description: country.seoDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(country.slug),
        "x-default": `${SITE_URL}${countryPath("en", country.slug)}`,
      },
    },
    openGraph: {
      title: country.seoTitle,
      description: country.seoDescription,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function CountryPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const country = getCountry(slug);

  if (!country) notFound();

  const cities = getCountryCities(country.slug);
  const marinas = getCountryMarinas(country.slug);

  return (
    <main className="main">
      <div className="container geo-page">
        <Link className="backlink" href={`/${lang}/marinas`}>
          Back to all marinas
        </Link>

        <section className="geo-hero">
          <p className="kicker">Country destination</p>
          <h1>{country.title} yacht rentals and marinas</h1>
          <p>{country.description}</p>
          <div className="geo-actions">
            <Link href={`/${lang}/marinas`}>Explore all marinas</Link>
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-cities-title">
          <div className="geo-section-head">
            <h2 id="country-cities-title">Cities in {country.title}</h2>
            <p>Static city pages connected to Sharmar marina destinations.</p>
          </div>

          <div className="geo-grid">
            {cities.map((city) => (
              <Link key={city.slug} className="geo-card" href={`/${lang}/city/${city.slug}`}>
                <p className="kicker">{country.title}</p>
                <h3>{city.title}</h3>
                <p>{city.description}</p>
                <span>View city</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-marinas-title">
          <div className="geo-section-head">
            <h2 id="country-marinas-title">Marinas in {country.title}</h2>
            <p>Premium marina pages linked from this static country layer.</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.city}</p>
                <h3>{marina.title}</h3>
                <p>{marina.description}</p>
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
          letter-spacing: -0.05em;
        }

        .geo-hero p {
          max-width: 720px;
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
