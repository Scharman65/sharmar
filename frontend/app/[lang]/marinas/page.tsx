import Link from "next/link";
import type { Metadata } from "next";
import { COUNTRIES, CITIES } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const SITE_URL = "https://sharmar.me";
const TITLE = "Mediterranean Marina Network | Sharmar";
const DESCRIPTION =
  "Explore yacht charters, boat rentals, and boats for sale across Mediterranean marinas in Montenegro, Croatia, and beyond.";


function pageCopy(lang: Lang) {
  if (lang === "ru") {
    return {
      title: "Средиземноморская сеть марин | Sharmar",
      description:
        "Исследуйте яхтенные чартеры, аренду лодок и продажу яхт в маринах Черногории, Хорватии и Средиземноморья.",
      eyebrow: "Сеть марин Средиземноморья",
      heroTitle: "Исследуйте яхтенные чартеры в маринах Средиземноморья",
      heroText:
        "Открывайте лодки, яхтенные чартеры, морские путешествия и марины Черногории, Хорватии и побережья Средиземного моря.",
      featuredTitle: "Популярные марины",
      featuredText:
        "SEO-страницы марин, объединённые в масштабируемую структуру маркетплейса Средиземноморья.",
      exploreMarina: "Открыть марину",
      geographyTitle: "Исследовать по географии",
      geographyText:
        "Просматривайте страницы стран и городов, связанные с сетью марин.",
    };
  }

  if (lang === "me") {
    return {
      title: "Mreža marina Mediterana | Sharmar",
      description:
        "Istražite najam jahti, charter brodove i prodaju plovila širom marina Crne Gore, Hrvatske i Mediterana.",
      eyebrow: "Mreža marina Mediterana",
      heroTitle: "Istražite yacht charter širom marina Mediterana",
      heroText:
        "Pregledajte brodove, yacht charter ponudu, nautička iskustva i marine širom Crne Gore, Hrvatske i Mediterana.",
      featuredTitle: "Istaknute marine",
      featuredText:
        "SEO stranice marina povezane u skalabilnu marketplace strukturu Mediterana.",
      exploreMarina: "Otvori marinu",
      geographyTitle: "Istraži po geografiji",
      geographyText:
        "Pregledajte stranice država i gradova povezane sa mrežom marina.",
    };
  }

  return {
    title: "Mediterranean Marina Network | Sharmar",
    description:
      "Explore yacht charters, boat rentals, and boats for sale across Mediterranean marinas in Montenegro, Croatia, and beyond.",
    eyebrow: "Mediterranean marina network",
    heroTitle: "Explore yacht charters across Mediterranean marinas",
    heroText:
      "Discover boats, yacht charters, sailing experiences, and marina destinations across Montenegro, Croatia, and the Mediterranean coastline.",
    featuredTitle: "Featured marinas",
    featuredText:
      "SEO-ready marina landing pages connected into a scalable Mediterranean marketplace structure.",
    exploreMarina: "Explore marina",
    geographyTitle: "Explore by geography",
    geographyText:
      "Browse static country and city destination pages connected to the marina network.",
  };
}


function marinaIndexPath(lang: Lang): string {
  return `/${lang}/marinas`;
}

function languageAlternates() {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${marinaIndexPath(lang)}`])
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const canonical = `${SITE_URL}${marinaIndexPath(lang)}`;
  const copy = pageCopy(lang);

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(),
        "x-default": `${SITE_URL}${marinaIndexPath("en")}`,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function MarinasIndexPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const copy = pageCopy(lang);

  return (
    <main className="main">
      <div className="container marina-index-page">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              {copy.eyebrow}
            </div>

            <h1>
              {copy.heroTitle}
            </h1>

            <p>
              {copy.heroText}
            </p>
          </div>
        </div>

        <section className="marina-section">
          <div className="section-head">
            <h2>{copy.featuredTitle}</h2>

            <p>
              {copy.featuredText}
            </p>
          </div>

          <div className="marina-grid">
            {MARINAS.map((marina) => (
              <Link
                key={marina.slug}
                href={`/${lang}/marina/${marina.slug}`}
                className="marina-card"
              >
                <div className="card-top">
                  <div className="country">
                    {marina.country}
                  </div>

                  <h3>{marina.title}</h3>

                  <div className="location">
                    {marina.city}
                  </div>
                </div>

                <p>
                  {marina.description}
                </p>

                <div className="card-footer">
                  <span>
                    {copy.exploreMarina}
                  </span>

                  <span>
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="marina-section">
          <div className="section-head">
            <h2>{copy.geographyTitle}</h2>

            <p>
              {copy.geographyText}
            </p>
          </div>

          <div className="geo-link-grid">
            {COUNTRIES.map((country) => (
              <Link
                key={country.slug}
                href={`/${lang}/country/${country.slug}`}
                className="geo-link"
              >
                {country.title}
              </Link>
            ))}

            {CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/${lang}/city/${city.slug}`}
                className="geo-link"
              >
                {city.title}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .marina-index-page {
          padding-bottom: 64px;
        }

        .hero {
          padding: 32px 0 18px;
        }

        .hero-copy {
          max-width: 860px;
        }

        .eyebrow {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.72;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0;
          font-size: 48px;
          line-height: 1.05;
        }

        .hero p {
          margin-top: 18px;
          font-size: 18px;
          line-height: 1.6;
          opacity: 0.82;
          max-width: 720px;
        }

        .marina-section {
          margin-top: 34px;
        }

        .section-head {
          margin-bottom: 20px;
        }

        .section-head h2 {
          margin: 0;
          font-size: 28px;
        }

        .section-head p {
          margin-top: 10px;
          opacity: 0.74;
          max-width: 720px;
          line-height: 1.5;
        }

        .marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .geo-link-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .geo-link {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 12px;
          padding: 10px 13px;
          background: rgba(255,255,255,0.05);
          color: inherit;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }

        .geo-link:hover {
          border-color: rgba(255,255,255,0.24);
          background: rgba(255,255,255,0.08);
        }

        .marina-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 260px;
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          text-decoration: none;
          color: inherit;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .marina-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.06);
        }

        .country {
          font-size: 12px;
          text-transform: uppercase;
          opacity: 0.66;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        .marina-card h3 {
          margin: 0;
          font-size: 24px;
          line-height: 1.15;
        }

        .location {
          margin-top: 8px;
          opacity: 0.7;
        }

        .marina-card p {
          margin: 18px 0;
          line-height: 1.6;
          opacity: 0.84;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .marina-grid {
            grid-template-columns: 1fr 1fr;
          }

          h1 {
            font-size: 40px;
          }
        }

        @media (max-width: 720px) {
          .marina-grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 34px;
          }

          .hero p {
            font-size: 16px;
          }

          .marina-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
