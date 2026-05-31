import Link from "next/link";
import type { Metadata } from "next";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type Props = {
  params: Promise<{
    lang: string;
  }>;
};

type StepCopy = {
  title: string;
  text: string;
};

type FaqCopy = {
  question: string;
  answer: string;
};

type PageCopy = {
  pageTitle: string;
  pageDescription: string;
  homeBreadcrumb: string;
  pageBreadcrumb: string;
  backToOwners: string;
  ownerOnboarding: string;
  ownerDashboard: string;
  flowTitle: string;
  flowDescription: string;
  stepLabel: string;
  startKicker: string;
  startTitle: string;
  startDescription: string;
  faqTitle: string;
  faqDescription: string;
  addLinks: {
    rentMotor: string;
    rentSail: string;
    saleMotor: string;
    saleSail: string;
  };
  steps: StepCopy[];
  faqItems: FaqCopy[];
};

const COPY: Record<Lang, PageCopy> = {
  en: {
    pageTitle: "List your boat on Sharmar",
    pageDescription:
      "Start a Sharmar boat listing by adding photos, boat details, location, and structured request information.",
    homeBreadcrumb: "Home",
    pageBreadcrumb: "List your boat",
    backToOwners: "Back to owners",
    ownerOnboarding: "Owner onboarding",
    ownerDashboard: "Owner dashboard",
    flowTitle: "Simple onboarding flow",
    flowDescription: "Four practical steps for creating a boat listing without changing marketplace operations.",
    stepLabel: "Step",
    startKicker: "Start a listing",
    startTitle: "Choose the page that matches your boat",
    startDescription:
      "Sharmar separates rental and sale listing paths so owners can submit the right information from the start.",
    faqTitle: "FAQ",
    faqDescription: "Owner onboarding details and expectations.",
    addLinks: {
      rentMotor: "Motor boat rental",
      rentSail: "Sail boat rental",
      saleMotor: "Motor boat sale",
      saleSail: "Sail boat sale",
    },
    steps: [
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
    ],
    faqItems: [
      {
        question: "What should I prepare before listing a boat?",
        answer: "Prepare boat photos, vessel details, location information, and the listing intent: rental or sale.",
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
    ],
  },
  ru: {
    pageTitle: "Добавить лодку на Sharmar",
    pageDescription:
      "Создайте объявление на Sharmar: добавьте фотографии, характеристики лодки, локацию и данные для структурированных запросов.",
    homeBreadcrumb: "Главная",
    pageBreadcrumb: "Добавить лодку",
    backToOwners: "Назад к владельцам",
    ownerOnboarding: "Подключение владельца",
    ownerDashboard: "Кабинет владельца",
    flowTitle: "Простой процесс добавления",
    flowDescription: "Четыре практических шага для создания объявления без изменения работы marketplace.",
    stepLabel: "Шаг",
    startKicker: "Начать объявление",
    startTitle: "Выберите страницу под вашу лодку",
    startDescription:
      "Sharmar разделяет аренду и продажу, чтобы владелец сразу отправлял правильную информацию.",
    faqTitle: "Вопросы и ответы",
    faqDescription: "Детали подключения владельца и ожидания перед публикацией.",
    addLinks: {
      rentMotor: "Аренда моторной лодки",
      rentSail: "Аренда парусной лодки",
      saleMotor: "Продажа моторной лодки",
      saleSail: "Продажа парусной лодки",
    },
    steps: [
      {
        title: "Загрузите фотографии",
        text: "Добавьте чёткие фотографии лодки, чтобы гости могли оценить судно перед отправкой запроса.",
      },
      {
        title: "Добавьте детали лодки",
        text: "Укажите тип судна, описание, цены и важные данные для объявления.",
      },
      {
        title: "Выберите страну / город / марину",
        text: "Разместите лодку в географии Средиземноморья, которая лучше всего соответствует её базе.",
      },
      {
        title: "Получайте структурированные запросы",
        text: "Используйте инфраструктуру Sharmar, чтобы получать организованные заявки от потенциальных гостей.",
      },
    ],
    faqItems: [
      {
        question: "Что подготовить перед добавлением лодки?",
        answer: "Подготовьте фотографии, характеристики судна, локацию и тип объявления: аренда или продажа.",
      },
      {
        question: "Где управлять отправленными объявлениями?",
        answer: "Владельцы могут использовать кабинет владельца для доступа к уже существующим инструментам Sharmar.",
      },
      {
        question: "Эта страница меняет бронирование или оплату?",
        answer:
          "Нет. Эта страница ведёт на существующие страницы добавления и кабинета, не меняя бронирование, оплату или backend.",
      },
    ],
  },
  me: {
    pageTitle: "Dodajte brod na Sharmar",
    pageDescription:
      "Započnite Sharmar oglas dodavanjem fotografija, detalja o brodu, lokacije i strukturiranih podataka za upite.",
    homeBreadcrumb: "Početna",
    pageBreadcrumb: "Dodajte brod",
    backToOwners: "Nazad na vlasnike",
    ownerOnboarding: "Uključivanje vlasnika",
    ownerDashboard: "Panel vlasnika",
    flowTitle: "Jednostavan proces dodavanja",
    flowDescription: "Četiri praktična koraka za kreiranje oglasa bez mijenjanja rada marketplace sistema.",
    stepLabel: "Korak",
    startKicker: "Započnite oglas",
    startTitle: "Izaberite stranicu koja odgovara vašem brodu",
    startDescription:
      "Sharmar odvaja najam i prodaju kako bi vlasnici odmah poslali prave informacije.",
    faqTitle: "FAQ",
    faqDescription: "Detalji uključivanja vlasnika i očekivanja prije objave.",
    addLinks: {
      rentMotor: "Najam motornog broda",
      rentSail: "Najam jedrilice",
      saleMotor: "Prodaja motornog broda",
      saleSail: "Prodaja jedrilice",
    },
    steps: [
      {
        title: "Dodajte fotografije",
        text: "Dodajte jasne fotografije broda kako bi posjetioci mogli pregledati plovilo prije slanja upita.",
      },
      {
        title: "Dodajte detalje broda",
        text: "Unesite tip plovila, opis, cijene i važne informacije za oglas.",
      },
      {
        title: "Izaberite državu / grad / marinu",
        text: "Postavite brod u mediteranski geografski sloj koji najbolje odgovara njegovoj bazi.",
      },
      {
        title: "Primajte strukturirane upite",
        text: "Koristite Sharmar infrastrukturu za organizovane zahtjeve potencijalnih gostiju.",
      },
    ],
    faqItems: [
      {
        question: "Šta treba pripremiti prije dodavanja broda?",
        answer: "Pripremite fotografije, detalje plovila, lokaciju i namjenu oglasa: najam ili prodaja.",
      },
      {
        question: "Gdje upravljam poslatim oglasima?",
        answer: "Vlasnici mogu koristiti panel vlasnika za pristup postojećim Sharmar alatima.",
      },
      {
        question: "Da li ova stranica mijenja rezervacije ili plaćanja?",
        answer:
          "Ne. Ova stranica vodi ka postojećim stranicama za dodavanje i panelu, bez promjene rezervacija, plaćanja ili backend logike.",
      },
    ],
  },
};

function getCopy(lang: Lang): PageCopy {
  return COPY[lang] ?? COPY.en;
}

function listBoatPath(lang: Lang): string {
  return `/${lang}/list-your-boat`;
}

function languageAlternates() {
  return Object.fromEntries(LANGS.map((lang) => [lang, `${SITE_URL}${listBoatPath(lang)}`]));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const copy = getCopy(lang);
  const canonical = `${SITE_URL}${listBoatPath(lang)}`;

  return {
    title: `${copy.pageTitle} | Sharmar`,
    description: copy.pageDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(),
        "x-default": `${SITE_URL}${listBoatPath("en")}`,
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

export default async function ListYourBoatPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const copy = getCopy(lang);
  const pageUrl = absoluteSiteUrl(listBoatPath(lang));
  const addLinks = [
    { href: `/${lang}/add/rent/motor`, label: copy.addLinks.rentMotor },
    { href: `/${lang}/add/rent/sail`, label: copy.addLinks.rentSail },
    { href: `/${lang}/add/sale/motor`, label: copy.addLinks.saleMotor },
    { href: `/${lang}/add/sale/sail`, label: copy.addLinks.saleSail },
  ];
  const jsonLd = [
    webPageJsonLd({
      url: pageUrl,
      name: `${copy.pageTitle} | Sharmar`,
      description: copy.pageDescription,
    }),
    breadcrumbJsonLd([
      { name: copy.homeBreadcrumb, url: absoluteSiteUrl(`/${lang}`) },
      { name: copy.pageBreadcrumb, url: pageUrl },
    ]),
    faqJsonLd(copy.faqItems),
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
          {copy.backToOwners}
        </Link>

        <section className="list-hero">
          <p className="kicker">{copy.ownerOnboarding}</p>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.pageDescription}</p>
          <div className="list-actions">
            {addLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={`/${lang}/owner-dashboard`}>{copy.ownerDashboard}</Link>
          </div>
        </section>

        <section className="list-section" aria-labelledby="flow-title">
          <div className="list-section-head">
            <h2 id="flow-title">{copy.flowTitle}</h2>
            <p>{copy.flowDescription}</p>
          </div>

          <div className="step-grid">
            {copy.steps.map((step, index) => (
              <article key={step.title} className="step-card">
                <p className="kicker">
                  {copy.stepLabel} {index + 1}
                </p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="list-section cta-band" aria-labelledby="start-title">
          <div>
            <p className="kicker">{copy.startKicker}</p>
            <h2 id="start-title">{copy.startTitle}</h2>
            <p>{copy.startDescription}</p>
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
            <h2 id="faq-title">{copy.faqTitle}</h2>
            <p>{copy.faqDescription}</p>
          </div>
          <div className="faq-grid">
            {copy.faqItems.map((item) => (
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
