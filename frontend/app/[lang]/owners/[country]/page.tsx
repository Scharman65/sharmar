import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIES, COUNTRIES, type CountryDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

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

function getFaqItems(country: CountryDefinition) {
  return [
    {
      question: `How do I list my boat in ${country.title}?`,
      answer:
        "Choose the rental or sale listing path, add boat details and photos, and select the relevant country, city, or marina details.",
    },
    {
      question: `Does Sharmar promise bookings in ${country.title}?`,
      answer:
        "No. Sharmar provides listing visibility and structured request infrastructure, but it does not promise bookings, traffic, occupancy, or earnings.",
    },
    {
      question: `Can owners use marina pages in ${country.title}?`,
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

  if (!country) {
    return {
      title: "Owner country page not found | Sharmar",
    };
  }

  const title = `List your boat in ${country.title} | Sharmar`;
  const description = `Owner listing page for ${country.title}. Add a boat for rent or sale and connect it with Sharmar city and marina pages.`;
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

  const cities = getCountryCities(country.slug);
  const marinas = getCountryMarinas(country.slug);
  const faqItems = getFaqItems(country);
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
    { href: `/${lang}/add/rent/motor`, label: "List motor boat for rent" },
    { href: `/${lang}/add/rent/sail`, label: "List sail boat for rent" },
    { href: `/${lang}/add/sale/motor`, label: "List motor boat for sale" },
    { href: `/${lang}/add/sale/sail`, label: "List sail boat for sale" },
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
          <p className="kicker">Owners in {country.title}</p>
          <h1>List your boat in {country.title}</h1>
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
            <Link href={`/${lang}/owner-dashboard`}>Owner dashboard</Link>
          </div>
        </section>

        <section className="owner-country-section" aria-labelledby="locations-title">
          <div className="owner-country-section-head">
            <h2 id="locations-title">City and marina links</h2>
            <p>Use these published destination pages to place your boat near the most relevant Sharmar location.</p>
          </div>

          <div className="location-grid">
            {cities.map((city) => (
              <Link key={city.slug} className="location-card" href={`/${lang}/city/${city.slug}`}>
                <p className="kicker">{country.title}</p>
                <h3>{city.title}</h3>
                <p>{city.description}</p>
                <span>View city</span>
              </Link>
            ))}
            {marinas.map((marina) => (
              <Link key={marina.slug} className="location-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{marina.city}</p>
                <h3>{marina.title}</h3>
                <p>{marina.description}</p>
                <span>View marina</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="owner-country-section" aria-labelledby="benefits-title">
          <div className="owner-country-section-head">
            <h2 id="benefits-title">Owner benefits</h2>
            <p>Practical owner acquisition infrastructure for current Sharmar geography pages.</p>
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
            <p className="kicker">Add boat</p>
            <h2 id="add-title">Start with the right listing type</h2>
            <p>
              Choose rental or sale, then add boat details, photos, and location information through existing
              Sharmar listing pages.
            </p>
          </div>
          <Link href={`/${lang}/list-your-boat`}>View onboarding</Link>
        </section>

        <section className="owner-country-section" aria-labelledby="faq-title">
          <div className="owner-country-section-head">
            <h2 id="faq-title">FAQ</h2>
            <p>Owner expectations for listing in {country.title}.</p>
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
