import Link from "next/link";
import type { Metadata } from "next";
import { COUNTRIES } from "@/data/geography";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";



type FaqCopy = {
  question: string;
  answer: string;
};

type PageCopy = {
  pageTitle: string;
  pageDescription: string;
  backToBoats: string;
  ownerKicker: string;
  ownerDashboard: string;
  whyTitle: string;
  howTitle: string;
  benefitsTitle: string;
  onboardingTitle: string;
  countriesTitle: string;
  faqTitle: string;
};

const COPY: Record<Lang, PageCopy> = {
  en: {
    pageTitle: "List your boat on Sharmar",
    pageDescription: "Sharmar helps boat owners receive structured booking requests and gain visibility across Mediterranean marina pages.",
    backToBoats: "Back to boats",
    ownerKicker: "For boat owners",
    ownerDashboard: "Open owner dashboard",
    whyTitle: "Why list with Sharmar",
    howTitle: "How it works",
    benefitsTitle: "Owner benefits",
    onboardingTitle: "Simple onboarding",
    countriesTitle: "Supported countries",
    faqTitle: "FAQ",
  },
  ru: {
    pageTitle: "Добавьте лодку на Sharmar",
    pageDescription: "Sharmar помогает владельцам лодок получать структурированные заявки и повышать видимость на страницах марин Средиземноморья.",
    backToBoats: "Назад к лодкам",
    ownerKicker: "Для владельцев лодок",
    ownerDashboard: "Открыть кабинет владельца",
    whyTitle: "Почему размещать на Sharmar",
    howTitle: "Как это работает",
    benefitsTitle: "Преимущества для владельцев",
    onboardingTitle: "Простое подключение",
    countriesTitle: "Поддерживаемые страны",
    faqTitle: "Вопросы и ответы",
  },
  me: {
    pageTitle: "Dodajte brod na Sharmar",
    pageDescription: "Sharmar pomaže vlasnicima brodova da dobijaju strukturirane zahtjeve i veću vidljivost kroz mediteranske marine.",
    backToBoats: "Nazad na brodove",
    ownerKicker: "Za vlasnike brodova",
    ownerDashboard: "Otvorite panel vlasnika",
    whyTitle: "Zašto objaviti na Sharmar",
    howTitle: "Kako funkcioniše",
    benefitsTitle: "Prednosti za vlasnike",
    onboardingTitle: "Jednostavno uključivanje",
    countriesTitle: "Podržane države",
    faqTitle: "FAQ",
  },
};

function getCopy(lang: Lang): PageCopy {
  return COPY[lang] ?? COPY.en;
}


type Props = {
  params: Promise<{
    lang: string;
  }>;
};


const faqItems = [
  {
    question: "What does Sharmar help boat owners do?",
    answer:
      "Sharmar helps owners publish boat details, connect listings with Mediterranean destinations, and receive structured booking requests.",
  },
  {
    question: "Does Sharmar promise bookings or earnings?",
    answer:
      "No. Sharmar provides listing, visibility, and request infrastructure, but it does not promise earnings, bookings, traffic, or occupancy.",
  },
  {
    question: "Can I list boats for rent and for sale?",
    answer:
      "Yes. Owners can start a rental listing or a sale listing for motor boats and sailing boats from the existing add boat pages.",
  },
];

function ownersPath(lang: Lang): string {
  return `/${lang}/owners`;
}

function languageAlternates() {
  return Object.fromEntries(LANGS.map((lang) => [lang, `${SITE_URL}${ownersPath(lang)}`]));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const copy = getCopy(lang);
  const canonical = `${SITE_URL}${ownersPath(lang)}`;

  return {
    title: `${copy.pageTitle} | Sharmar`,
    description: copy.pageDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(),
        "x-default": `${SITE_URL}${ownersPath("en")}`,
      },
    },
    openGraph: {
      title: `${copy.pageTitle} | Sharmar`,
      description: copy.pageDescription,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function OwnersPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const copy = getCopy(lang);
  const pageUrl = absoluteSiteUrl(ownersPath(lang));
  const addLinks = [
    { href: `/${lang}/add/rent/motor`, label: lang === "ru" ? "Сдать моторную лодку" : lang === "me" ? "Dodajte motorni brod za najam" : "List motor boat for rent" },
    { href: `/${lang}/add/rent/sail`, label: lang === "ru" ? "Сдать парусную лодку" : lang === "me" ? "Dodajte jedrilicu za najam" : "List sail boat for rent" },
    { href: `/${lang}/add/sale/motor`, label: lang === "ru" ? "Продать моторную лодку" : lang === "me" ? "Prodajte motorni brod" : "List motor boat for sale" },
    { href: `/${lang}/add/sale/sail`, label: lang === "ru" ? "Продать парусную лодку" : lang === "me" ? "Prodajte jedrilicu" : "List sail boat for sale" },
  ];
  const benefits = [
    "Structured request details from potential guests",
    "Destination context through country, city, and marina pages",
    "Separate rental and sale listing paths",
    "Owner dashboard access for submitted boats",
  ];
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: `${copy.pageTitle} | Sharmar`,
      description: copy.pageDescription,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      { name: "Owners", url: pageUrl },
    ]),
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

      <div className="container owner-page">
        <Link className="backlink" href={`/${lang}/boats`}>
          {copy.backToBoats}
        </Link>

        <section className="owner-hero">
          <p className="kicker">{copy.ownerKicker}</p>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.pageDescription}</p>
          <div className="owner-actions">
            {addLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={`/${lang}/owner-dashboard`}>{copy.ownerDashboard}</Link>
          </div>
        </section>

        <section className="owner-section" aria-labelledby="why-list-title">
          <div className="owner-section-head">
            <h2 id="why-list-title">{copy.whyTitle}</h2>
            <p>
              Sharmar is built around boat discovery, marina context, and clear request collection for owners.
            </p>
          </div>
          <div className="owner-grid">
            {[
              "Present your boat with photos, vessel details, location, and listing type.",
              "Connect ownership supply with Mediterranean country, city, and marina discovery pages.",
              "Use existing owner tools without changing booking, payment, or dashboard infrastructure.",
            ].map((text) => (
              <article key={text} className="owner-card">
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-section" aria-labelledby="how-title">
          <div className="owner-section-head">
            <h2 id="how-title">{copy.howTitle}</h2>
            <p>Owners choose a listing path, add boat details, and receive structured requests through Sharmar.</p>
          </div>
          <div className="owner-grid">
            {["Choose rental or sale", "Add boat details", "Publish for review and discovery"].map((step, index) => (
              <article key={step} className="owner-card">
                <p className="kicker">Step {index + 1}</p>
                <h3>{step}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-section" aria-labelledby="benefits-title">
          <div className="owner-section-head">
            <h2 id="benefits-title">{copy.benefitsTitle}</h2>
            <p>Practical marketplace infrastructure without promises of earnings, bookings, or traffic.</p>
          </div>
          <div className="owner-grid">
            {benefits.map((benefit) => (
              <article key={benefit} className="owner-card">
                <p>{benefit}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-section owner-band" aria-labelledby="onboarding-title">
          <div>
            <p className="kicker">{copy.onboardingTitle}</p>
            <h2 id="onboarding-title">Start with the boat you want to list</h2>
            <p>
              Use the listing form that matches the boat and intent. You can return to the owner dashboard after
              submitting or managing boats.
            </p>
          </div>
          <Link href={`/${lang}/list-your-boat`}>View onboarding flow</Link>
        </section>

        <section className="owner-section" aria-labelledby="countries-title">
          <div className="owner-section-head">
            <h2 id="countries-title">{copy.countriesTitle}</h2>
            <p>Owner pages are available for Sharmar's current Mediterranean country layer.</p>
          </div>
          <div className="owner-grid">
            {COUNTRIES.map((country) => (
              <Link key={country.slug} className="owner-card owner-link-card" href={`/${lang}/owners/${country.slug}`}>
                <p className="kicker">Owner page</p>
                <h3>{country.title}</h3>
                <span>List in {country.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="owner-section" aria-labelledby="faq-title">
          <div className="owner-section-head">
            <h2 id="faq-title">{copy.faqTitle}</h2>
            <p>Clear owner expectations before starting a listing.</p>
          </div>
          <div className="owner-faq-grid">
            {faqItems.map((item) => (
              <article key={item.question} className="owner-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .owner-page {
          padding-bottom: 64px;
        }

        .owner-hero,
        .owner-band {
          margin-top: 22px;
          max-width: 980px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .owner-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .owner-hero p,
        .owner-band p {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .owner-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .owner-actions a,
        .owner-band a,
        .owner-link-card span {
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

        .owner-section {
          margin-top: 28px;
          max-width: 1100px;
        }

        .owner-section-head {
          margin-bottom: 14px;
        }

        .owner-section-head h2,
        .owner-band h2 {
          margin: 0;
          line-height: 1.15;
        }

        .owner-section-head p {
          max-width: 760px;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .owner-grid,
        .owner-faq-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .owner-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
        }

        .owner-link-card {
          min-height: 170px;
        }

        .owner-card h3 {
          margin: 6px 0 0;
          line-height: 1.2;
        }

        .owner-card p:not(.kicker) {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .owner-band {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
        }

        @media (max-width: 900px) {
          .owner-grid,
          .owner-faq-grid {
            grid-template-columns: 1fr 1fr;
          }

          .owner-band {
            display: grid;
          }
        }

        @media (max-width: 640px) {
          .owner-hero,
          .owner-band {
            padding: 20px;
            border-radius: 18px;
          }

          .owner-grid,
          .owner-faq-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
