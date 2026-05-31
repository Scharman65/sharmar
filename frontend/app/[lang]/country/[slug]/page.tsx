import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COUNTRIES, CITIES, type CountryDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { RENTAL_TYPES } from "@/data/rental-types";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, itemListJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type Props = {
  params: Promise<{
    lang: string;
    slug: string;
  }>;
};

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


function pageCopy(lang: Lang) {
  if (lang === "ru") {
    return {
      back: "Назад ко всем маринам",
      kicker: "Направление страны",
      exploreAll: "Открыть все марины",
      listBoat: "Разместить лодку в",
      citiesTitle: "Города в",
      citiesText: "Статические страницы городов, связанные с направлениями марин Sharmar.",
      viewCity: "Открыть город",
      marinasTitle: "Марины в",
      marinasText: "Премиальные страницы марин, связанные с этим уровнем страны.",
      viewMarina: "Открыть марину",
      rentalsTitle: "Страницы категорий аренды в",
      rentalsText: "Изучите категории аренды, связанные с этим направлением.",
      faqTitle: "Частые вопросы о",
      faqText: "Информация о направлениях на основе опубликованных страниц городов и марин Sharmar.",
    };
  }

  if (lang === "me") {
    return {
      back: "Nazad na sve marine",
      kicker: "Destinacija države",
      exploreAll: "Istraži sve marine",
      listBoat: "Dodaj plovilo u",
      citiesTitle: "Gradovi u",
      citiesText: "Statične stranice gradova povezane sa marina destinacijama Sharmar-a.",
      viewCity: "Otvori grad",
      marinasTitle: "Marine u",
      marinasText: "Premium stranice marina povezane sa ovom državnom destinacijom.",
      viewMarina: "Otvori marinu",
      rentalsTitle: "Stranice kategorija najma u",
      rentalsText: "Istražite kategorije najma povezane sa ovom destinacijom.",
      faqTitle: "Česta pitanja o",
      faqText: "Informacije o destinacijama zasnovane na objavljenim stranicama gradova i marina Sharmar-a.",
    };
  }

  return {
    back: "{copy.back}",
    kicker: "{copy.kicker}",
    exploreAll: "{copy.exploreAll}",
    listBoat: "List a boat in",
    citiesTitle: "Cities in",
    citiesText: "{copy.citiesText}",
    viewCity: "{copy.viewCity}",
    marinasTitle: "Marinas in",
    marinasText: "{copy.marinasText}",
    viewMarina: "{copy.viewMarina}",
    rentalsTitle: "Rental category pages in",
    rentalsText: "{copy.rentalsText}",
    faqTitle: "FAQs about",
    faqText: "{copy.faqText}",
  };
}


function formatTitleList(items: string[], emptyText: string): string {
  if (items.length === 0) return emptyText;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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
  const copy = pageCopy(lang);

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
  const copy = pageCopy(lang);

  if (!country) notFound();

  const cities = getCountryCities(country.slug);
  const marinas = getCountryMarinas(country.slug);
  const countryUrl = absoluteSiteUrl(countryPath(lang, country.slug));
  const cityList = formatTitleList(
    cities.map((city) => city.title),
    `no city pages for ${country.title}`
  );
  const marinaList = formatTitleList(
    marinas.map((marina) => marina.title),
    `no marina pages for ${country.title}`
  );
  const faqItems = [
    {
      question: `What yacht destinations are listed for ${country.title}?`,
      answer: `This country page lists ${cityList} as city destinations in ${country.title}. It also links to marina pages including ${marinaList}, based on Sharmar's static destination data.`,
    },
    {
      question: `Can I browse marinas by city in ${country.title}?`,
      answer: `Yes. The city cards on this page connect to city pages for ${cityList}, where the related marina pages are grouped by destination.`,
    },
    {
      question: "Does Sharmar show boats and marina pages separately?",
      answer: "Yes. Sharmar keeps destination pages, marina pages, rental category pages, and individual boat pages separate so visitors can move from geography to marina details and then to boat listings when those listings are shown.",
    },
  ];
  const jsonLd = [
    webPageJsonLd({
      url: countryUrl,
      name: country.seoTitle,
      description: country.seoDescription,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      { name: country.title, url: countryUrl },
    ]),
    itemListJsonLd(
      cities.map((city) => ({
        name: city.title,
        url: absoluteSiteUrl(`/${lang}/city/${city.slug}`),
      }))
    ),
    faqJsonLd(faqItems),
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
        <Link className="backlink" href={`/${lang}/marinas`}>
          {copy.back}
        </Link>

        <section className="geo-hero">
          <p className="kicker">{copy.kicker}</p>
          <h1>{country.title} yacht rentals and marinas</h1>
          <p>{country.description}</p>
          <div className="geo-actions">
            <Link href={`/${lang}/marinas`}>{copy.exploreAll}</Link>
            <Link href={`/${lang}/owners/${country.slug}`}>{copy.listBoat} {country.title}</Link>
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-cities-title">
          <div className="geo-section-head">
            <h2 id="country-cities-title">{copy.citiesTitle} {country.title}</h2>
            <p>{copy.citiesText}</p>
          </div>

          <div className="geo-grid">
            {cities.map((city) => (
              <Link key={city.slug} className="geo-card" href={`/${lang}/city/${city.slug}`}>
                <p className="kicker">{country.title}</p>
                <h3>{city.title}</h3>
                <p>{city.description}</p>
                <span>{copy.viewCity}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-marinas-title">
          <div className="geo-section-head">
            <h2 id="country-marinas-title">{copy.marinasTitle} {country.title}</h2>
            <p>{copy.marinasText}</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.city}</p>
                <h3>{marina.title}</h3>
                <p>{marina.description}</p>
                <span>{copy.viewMarina}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-rent-title">
          <div className="geo-section-head">
            <h2 id="country-rent-title">{copy.rentalsTitle} {country.title}</h2>
            <p>{copy.rentalsText}</p>
          </div>

          <div className="rent-grid">
            {RENTAL_TYPES.map((rentalType) => (
              <Link key={rentalType.slug} href={`/${lang}/country/${country.slug}/rent/${rentalType.slug}`}>
                {rentalType.pluralTitle}
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="country-faq-title">
          <div className="geo-section-head">
            <h2 id="country-faq-title">{copy.faqTitle} {country.title}</h2>
            <p>{copy.faqText}</p>
          </div>

          <div className="geo-faq-grid">
            {faqItems.map((item) => (
              <article key={item.question} className="geo-faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
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

        .geo-faq-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .geo-faq-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.045);
        }

        .geo-faq-card h3 {
          margin: 0;
          font-size: 16px;
          line-height: 1.35;
        }

        .geo-faq-card p {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .geo-grid,
          .rent-grid,
          .geo-faq-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .geo-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .geo-grid,
          .rent-grid,
          .geo-faq-grid {
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
