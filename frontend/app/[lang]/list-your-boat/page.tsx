import Link from "next/link";
import type { Metadata } from "next";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type Props = {
  params: Promise<{
    lang: string;
  }>;
};

const pageTitle = "List your boat on Sharmar";
const pageDescription =
  "Start a Sharmar boat listing by adding photos, boat details, location, and structured request information.";

const steps = [
  {
    title: "Upload photos",
    text: "Add clear boat photos so visitors can review the vessel before sending a request.",
  },
  {
    title: "Add boat details",
    text: "Enter the vessel type, description, pricing fields, and relevant listing information.",
  },
  {
    title: "Choose country / city / marina",
    text: "Place the boat in the Mediterranean geography layer that best matches its home base.",
  },
  {
    title: "Receive structured booking requests",
    text: "Use Sharmar request infrastructure to receive organized inquiry details from potential guests.",
  },
];

const faqItems = [
  {
    question: "What should I prepare before listing a boat?",
    answer:
      "Prepare boat photos, vessel details, location information, and the listing intent: rental or sale.",
  },
  {
    question: "Where do I manage submitted boats?",
    answer: "Owners can use the owner dashboard to access owner tools that already exist in Sharmar.",
  },
  {
    question: "Does this page change booking or payment behavior?",
    answer:
      "No. This onboarding page links to existing listing and dashboard pages without changing booking, payment, or backend behavior.",
  },
];

function listBoatPath(lang: Lang): string {
  return `/${lang}/list-your-boat`;
}

function languageAlternates() {
  return Object.fromEntries(LANGS.map((lang) => [lang, `${SITE_URL}${listBoatPath(lang)}`]));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const canonical = `${SITE_URL}${listBoatPath(lang)}`;

  return {
    title: `${pageTitle} | Sharmar`,
    description: pageDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(),
        "x-default": `${SITE_URL}${listBoatPath("en")}`,
      },
    },
    openGraph: {
      title: `${pageTitle} | Sharmar`,
      description: pageDescription,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function ListYourBoatPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const pageUrl = absoluteSiteUrl(listBoatPath(lang));
  const addLinks = [
    { href: `/${lang}/add/rent/motor`, label: "Motor boat rental" },
    { href: `/${lang}/add/rent/sail`, label: "Sail boat rental" },
    { href: `/${lang}/add/sale/motor`, label: "Motor boat sale" },
    { href: `/${lang}/add/sale/sail`, label: "Sail boat sale" },
  ];
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: `${pageTitle} | Sharmar`,
      description: pageDescription,
    }),
    breadcrumbJsonLd([
      { name: "Home", url: absoluteSiteUrl(`/${lang}`) },
      { name: "List your boat", url: pageUrl },
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

      <div className="container list-boat-page">
        <Link className="backlink" href={`/${lang}/owners`}>
          Back to owners
        </Link>

        <section className="list-hero">
          <p className="kicker">Owner onboarding</p>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
          <div className="list-actions">
            {addLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={`/${lang}/owner-dashboard`}>Owner dashboard</Link>
          </div>
        </section>

        <section className="list-section" aria-labelledby="flow-title">
          <div className="list-section-head">
            <h2 id="flow-title">Simple onboarding flow</h2>
            <p>Four practical steps for creating a boat listing without changing marketplace operations.</p>
          </div>

          <div className="step-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="step-card">
                <p className="kicker">Step {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="list-section cta-band" aria-labelledby="start-title">
          <div>
            <p className="kicker">Start a listing</p>
            <h2 id="start-title">Choose the page that matches your boat</h2>
            <p>
              Sharmar separates rental and sale listing paths so owners can submit the right information from the
              start.
            </p>
          </div>
          <div className="cta-links">
            {addLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="list-section" aria-labelledby="faq-title">
          <div className="list-section-head">
            <h2 id="faq-title">FAQ</h2>
            <p>Owner onboarding details and expectations.</p>
          </div>
          <div className="faq-grid">
            {faqItems.map((item) => (
              <article key={item.question} className="step-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .list-boat-page {
          padding-bottom: 64px;
        }

        .list-hero,
        .cta-band {
          margin-top: 22px;
          max-width: 980px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .list-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .list-hero p,
        .cta-band p {
          max-width: 760px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .list-actions,
        .cta-links {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .list-actions a,
        .cta-links a {
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

        .list-section {
          margin-top: 28px;
          max-width: 1100px;
        }

        .list-section-head {
          margin-bottom: 14px;
        }

        .list-section-head h2,
        .cta-band h2 {
          margin: 0;
          line-height: 1.15;
        }

        .list-section-head p {
          max-width: 760px;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .step-grid,
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .faq-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .step-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
        }

        .step-card h3 {
          margin: 6px 0 0;
          line-height: 1.2;
        }

        .step-card p:not(.kicker) {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        @media (max-width: 980px) {
          .step-grid,
          .faq-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .list-hero,
          .cta-band {
            padding: 20px;
            border-radius: 18px;
          }

          .step-grid,
          .faq-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
