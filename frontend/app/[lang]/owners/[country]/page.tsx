import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIES, COUNTRIES, type CountryDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";



type CountryPageCopy = {
  backToOwners: string;
  ownerDashboard: string;
  ownerBenefits: string;
  addBoat: string;
  faqTitle: string;
  cityMarinaLinks: string;
  startListing: string;
};

const COUNTRY_COPY: Record<Lang, CountryPageCopy> = {
  en: {
    backToOwners: "Back to owners",
    ownerDashboard: "Owner dashboard",
    ownerBenefits: "Owner benefits",
    addBoat: "Add boat",
    faqTitle: "FAQ",
    cityMarinaLinks: "City and marina links",
    startListing: "Start with the right listing type",
  },
  ru: {
    backToOwners: "Назад к владельцам",
    ownerDashboard: "Кабинет владельца",
    ownerBenefits: "Преимущества для владельцев",
    addBoat: "Добавить лодку",
    faqTitle: "Вопросы и ответы",
    cityMarinaLinks: "Города и марины",
    startListing: "Начните с правильного типа размещения",
  },
  me: {
    backToOwners: "Nazad na vlasnike",
    ownerDashboard: "Panel vlasnika",
    ownerBenefits: "Prednosti za vlasnike",
    addBoat: "Dodajte brod",
    faqTitle: "FAQ",
    cityMarinaLinks: "Gradovi i marine",
    startListing: "Počnite sa odgovarajućim tipom oglasa",
  },
};

function getCountryCopy(lang: Lang): CountryPageCopy {
  return COUNTRY_COPY[lang] ?? COUNTRY_COPY.en;
}


type Props = {
  params: Promise<{
    lang: string;
    country: string;
  }>;
};

function getCountry(slug: string): CountryDefinition | null {
  return COUNTRIES.find((country) => country.slug === slug) ?? null;
}

function ownerCountryPath(lang: Lang, countrySlug: string): string {
  return `/${lang}/owners/${countrySlug}`;
}

function languageAlternates(countrySlug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${ownerCountryPath(lang, countrySlug)}`])
  );
}

function getCountryCities(countrySlug: string) {
  return CITIES.filter((city) => city.countrySlug === countrySlug);
}

function getCountryMarinas(countrySlug: string) {
  const marinaSlugs = new Set(getCountryCities(countrySlug).flatMap((city) => city.marinaSlugs));

  return MARINAS.filter((marina) => marinaSlugs.has(marina.slug));
}

function getFaqItems(country: CountryDefinition, lang: Lang) {
  return [
    {
      question: lang === "ru" ? `Как разместить лодку в ${country.title}?` : lang === "me" ? `Kako da dodam brod u ${country.title}?` : `How do I list my boat in ${country.title}?`,
      answer:
        "Choose the rental or sale listing path, add boat details and photos, and select the relevant country, city, or marina details.",
    },
    {
      question: lang === "ru" ? `Sharmar гарантирует бронирования в ${country.title}?` : lang === "me" ? `Da li Sharmar garantuje rezervacije u ${country.title}?` : `Does Sharmar promise bookings in ${country.title}?`,
      answer:
        "No. Sharmar provides listing visibility and structured request infrastructure, but it does not promise bookings, traffic, occupancy, or earnings.",
    },
    {
      question: lang === "ru" ? `Могут ли владельцы использовать страницы марин в ${country.title}?` : lang === "me" ? `Mogu li vlasnici koristiti stranice marina u ${country.title}?` : `Can owners use marina pages in ${country.title}?`,
      answer:
        "Yes. Sharmar country pages connect to city and marina pages so owners can align listings with the closest published destination.",
    },
  ];
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) =>
    COUNTRIES.map((country) => ({
      lang,
      country: country.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, country: countrySlug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const country = getCountry(countrySlug);
  const copy = getCountryCopy(lang);

  if (!country) {
    return {
      title: "Owner country page not found | Sharmar",
    };
  }

  const title = lang === "ru" ? `Разместите лодку в ${country.title} | Sharmar` : lang === "me" ? `Dodajte brod u ${country.title} | Sharmar` : `List your boat in ${country.title} | Sharmar`;
  const description = lang === "ru" ? `Страница владельцев для ${country.title}. Добавьте лодку для аренды или продажи.` : lang === "me" ? `Stranica za vlasnike u ${country.title}. Dodajte brod za najam ili prodaju.` : `Owner listing page for ${country.title}. Add a boat for rent or sale and connect it with Sharmar city and marina pages.`;
  const canonical = `${SITE_URL}${ownerCountryPath(lang, country.slug)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(country.slug),
        "x-default": `${SITE_URL}${ownerCountryPath("en", country.slug)}`,
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

export default async function OwnerCountryPage({ params }: Props) {
  const { lang: rawLang, country: countrySlug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const country = getCountry(countrySlug);

  if (!country) notFound();

  const copy = getCountryCopy(lang);
  const cities = getCountryCities(country.slug);
  const marinas = getCountryMarinas(country.slug);
  const faqItems = getFaqItems(country, lang);
  const pageUrl = absoluteSiteUrl(ownerCountryPath(lang, country.slug));
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: `List your boat in ${country.title} | Sharmar`,
      description: `Owner listing page for ${country.title}. Add a boat for rent or sale and connect it with Sharmar city and marina pages.`,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      { name: "Owners", url: absoluteSiteUrl(`/${lang}/owners`) },
      { name: country.title, url: pageUrl },
    ]),
    faqJsonLd(faqItems),
  ];
  const addLinks = [
    { href: `/${lang}/add/rent/motor`, label: lang === "ru" ? "Сдать моторную лодку" : lang === "me" ? "Dodajte motorni brod za najam" : "List motor boat for rent" },
    { href: `/${lang}/add/rent/sail`, label: lang === "ru" ? "Сдать парусную лодку" : lang === "me" ? "Dodajte jedrilicu za najam" : "List sail boat for rent" },
    { href: `/${lang}/add/sale/motor`, label: lang === "ru" ? "Продать моторную лодку" : lang === "me" ? "Prodajte motorni brod" : "List motor boat for sale" },
    { href: `/${lang}/add/sale/sail`, label: lang === "ru" ? "Продать парусную лодку" : lang === "me" ? "Prodajte jedrilicu" : "List sail boat for sale" },
  ];
  const benefits = [
    `Connect your listing with Sharmar's ${country.title} country page.`,
    "Use city and marina context to describe where the boat is based.",
    "Receive structured request details without any promised earnings or bookings.",
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

      <div className="container owner-country-page">
        <Link className="backlink" href={`/${lang}/owners`}>
          Back to owners
        </Link>

        <section className="owner-country-hero">
          <p className="kicker">{lang === "ru" ? `Владельцы в ${country.title}` : lang === "me" ? `Vlasnici u ${country.title}` : `Owners in ${country.title}`}</p>
          <h1>{lang === "ru" ? `Разместите лодку в ${country.title}` : lang === "me" ? `Dodajte brod u ${country.title}` : `List your boat in ${country.title}`}</h1>
          <p>
            Add a boat for rent or sale and connect it with Sharmar&apos;s {country.title} city and marina
            discovery pages.
          </p>
          <div className="owner-country-actions">
            {addLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={`/${lang}/owner-dashboard`}>{copy.ownerDashboard}</Link>
          </div>
        </section>

        <section className="owner-country-section" aria-labelledby="locations-title">
          <div className="owner-country-section-head">
            <h2 id="locations-title">{copy.cityMarinaLinks}</h2>
            <p>{lang === "ru" ? "Используйте эти страницы направлений, чтобы привязать лодку к наиболее подходящей локации Sharmar." : lang === "me" ? "Koristite ove stranice destinacija kako biste povezali brod sa najrelevantnijom Sharmar lokacijom." : "Use these published destination pages to place your boat near the most relevant Sharmar location."}</p>
          </div>

          <div className="location-grid">
            {cities.map((city) => (
              <Link key={city.slug} className="location-card" href={`/${lang}/city/${city.slug}`}>
                <p className="kicker">{country.title}</p>
                <h3>{city.title}</h3>
                <p>{city.description}</p>
                <span>{lang === "ru" ? "Открыть город" : lang === "me" ? "Otvori grad" : "View city"}</span>
              </Link>
            ))}
            {marinas.map((marina) => (
              <Link key={marina.slug} className="location-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.city}</p>
                <h3>{marina.title}</h3>
                <p>{marina.description}</p>
                <span>{lang === "ru" ? "Открыть марину" : lang === "me" ? "Otvori marinu" : "View marina"}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="owner-country-section" aria-labelledby="benefits-title">
          <div className="owner-country-section-head">
            <h2 id="benefits-title">{copy.ownerBenefits}</h2>
            <p>{lang === "ru" ? "Практичная инфраструктура привлечения владельцев для текущих географических страниц Sharmar." : lang === "me" ? "Praktična infrastruktura za uključivanje vlasnika kroz trenutne Sharmar geografske stranice." : "Practical owner acquisition infrastructure for current Sharmar geography pages."}</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit) => (
              <article key={benefit} className="benefit-card">
                <p>{benefit}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-country-section add-band" aria-labelledby="add-title">
          <div>
            <p className="kicker">{copy.addBoat}</p>
            <h2 id="add-title">{copy.startListing}</h2>
            <p>
              {lang === "ru"
                ? "Выберите аренду или продажу, затем добавьте детали лодки, фотографии и локацию через существующие страницы Sharmar."
                : lang === "me"
                  ? "Izaberite najam ili prodaju, zatim dodajte detalje broda, fotografije i lokaciju kroz postojeće Sharmar stranice."
                  : "Choose rental or sale, then add boat details, photos, and location information through existing Sharmar listing pages."}
            </p>
          </div>
          <Link href={`/${lang}/list-your-boat`}>View onboarding</Link>
        </section>

        <section className="owner-country-section" aria-labelledby="faq-title">
          <div className="owner-country-section-head">
            <h2 id="faq-title">{copy.faqTitle}</h2>
            <p>{lang === "ru" ? `Ожидания владельцев перед размещением в ${country.title}.` : lang === "me" ? `Očekivanja vlasnika prije objave u ${country.title}.` : `Owner expectations for listing in ${country.title}.`}</p>
          </div>
          <div className="faq-grid">
            {faqItems.map((item) => (
              <article key={item.question} className="benefit-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .owner-country-page {
          padding-bottom: 64px;
        }

        .owner-country-hero,
        .add-band {
          margin-top: 22px;
          max-width: 980px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .owner-country-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .owner-country-hero p,
        .add-band p {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .owner-country-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .owner-country-actions a,
        .add-band a,
        .location-card span {
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

        .owner-country-section {
          margin-top: 28px;
          max-width: 1100px;
        }

        .owner-country-section-head {
          margin-bottom: 14px;
        }

        .owner-country-section-head h2,
        .add-band h2 {
          margin: 0;
          line-height: 1.15;
        }

        .owner-country-section-head p {
          max-width: 760px;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .location-grid,
        .benefit-grid,
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .location-card,
        .benefit-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
        }

        .location-card {
          display: flex;
          min-height: 235px;
          flex-direction: column;
          justify-content: space-between;
        }

        .location-card h3,
        .benefit-card h3 {
          margin: 6px 0 0;
          line-height: 1.2;
        }

        .location-card p:not(.kicker),
        .benefit-card p:not(.kicker) {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        @media (max-width: 900px) {
          .location-grid,
          .benefit-grid,
          .faq-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .owner-country-hero,
          .add-band {
            padding: 20px;
            border-radius: 18px;
          }

          .location-grid,
          .benefit-grid,
          .faq-grid {
            grid-template-columns: 1fr;
          }

          .location-card {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
