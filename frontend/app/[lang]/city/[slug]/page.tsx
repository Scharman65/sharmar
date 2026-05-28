import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIES, COUNTRIES, type CityDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, itemListJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type Props = {
  params: Promise<{
    lang: string;
    slug: string;
  }>;
};

function getCity(slug: string): CityDefinition | null {
  return CITIES.find((city) => city.slug === slug) ?? null;
}

function cityPath(lang: Lang, slug: string): string {
  return `/${lang}/city/${slug}`;
}

function languageAlternates(slug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${cityPath(lang, slug)}`])
  );
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    CITIES.map((city) => ({
      lang,
      slug: city.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const city = getCity(slug);

  if (!city) {
    return {
      title: "City not found | Sharmar",
    };
  }

  const canonical = `${SITE_URL}${cityPath(lang, city.slug)}`;

  return {
    title: city.seoTitle,
    description: city.seoDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(city.slug),
        "x-default": `${SITE_URL}${cityPath("en", city.slug)}`,
      },
    },
    openGraph: {
      title: city.seoTitle,
      description: city.seoDescription,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const city = getCity(slug);

  if (!city) notFound();

  const country = COUNTRIES.find((item) => item.slug === city.countrySlug);
  const marinas = MARINAS.filter((marina) => city.marinaSlugs.includes(marina.slug));
  const cityUrl = absoluteSiteUrl(cityPath(lang, city.slug));
  const jsonLd = [
    webPageJsonLd({
      url: cityUrl,
      name: city.seoTitle,
      description: city.seoDescription,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      {
        name: country?.title ?? city.countrySlug,
        url: absoluteSiteUrl(`/${lang}/country/${country?.slug ?? city.countrySlug}`),
      },
      { name: city.title, url: cityUrl },
    ]),
    itemListJsonLd(
      marinas.map((marina) => ({
        name: marina.title,
        url: absoluteSiteUrl(`/${lang}/marina/${marina.slug}`),
      }))
    ),
  ];
  const rentLinks = [
    { href: `/${lang}/rent/motor`, label: "Motor yachts" },
    { href: `/${lang}/rent/catamaran`, label: "Catamarans" },
    { href: `/${lang}/rent/sail`, label: "Sailing boats" },
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
      <div className="container geo-page">
        {country ? (
          <Link className="backlink" href={`/${lang}/country/${country.slug}`}>
            Back to {country.title}
          </Link>
        ) : (
          <Link className="backlink" href={`/${lang}/marinas`}>
            Back to all marinas
          </Link>
        )}

        <section className="geo-hero">
          <p className="kicker">{country?.title ?? "Mediterranean"} city destination</p>
          <h1>{city.title} yacht rentals and marinas</h1>
          <p>{city.description}</p>
        </section>

        <section className="geo-section" aria-labelledby="city-marinas-title">
          <div className="geo-section-head">
            <h2 id="city-marinas-title">Marinas in {city.title}</h2>
            <p>Static marina connections for this city destination.</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.region}</p>
                <h3>{marina.title}</h3>
                <p>{marina.description}</p>
                <span>View marina</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-title">
          <div className="geo-section-head">
            <h2 id="city-rent-title">Rent boats from {city.title}</h2>
            <p>Explore core rental categories connected from this city page.</p>
          </div>

          <div className="rent-grid">
            {rentLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
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
        .rent-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .geo-card,
        .rent-grid a {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
          transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease;
        }

        .geo-card {
          display: flex;
          min-height: 235px;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px;
        }

        .rent-grid a {
          padding: 18px;
          font-weight: 800;
        }

        .geo-card:hover,
        .rent-grid a:hover {
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

        @media (max-width: 900px) {
          .geo-grid,
          .rent-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .geo-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .geo-grid,
          .rent-grid {
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
