import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CITIES, COUNTRIES, type CityDefinition } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { isLang, LANGS, type Lang } from "@/i18n";
import { absoluteSiteUrl, breadcrumbJsonLd, faqJsonLd, itemListJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type PageCopy = {
  backToCountry: string;
  backToMarinas: string;
  cityDestination: string;
  marinasTitle: string;
  marinasDescription: string;
  viewMarina: string;
  rentTitle: string;
  rentDescription: string;
  faqTitle: string;
  faqDescription: string;
  home: string;
  mediterranean: string;
  cityNotFound: string;
  noMarinas: string;
  faqMarinasQuestion: string;
  faqBoatsQuestion: string;
  faqStructureQuestion: string;
  faqMarinasAnswerPrefix: string;
  faqMarinasAnswerSuffix: string;
  faqBoatsAnswer: string;
  faqStructureAnswerPrefix: string;
  faqStructureAnswerSuffix: string;
  rentMotor: string;
  rentCatamaran: string;
  rentSail: string;
};

function pageCopy(lang: Lang): PageCopy {
  if (lang === "ru") {
    return {
      backToCountry: "Назад к стране",
      backToMarinas: "Назад ко всем маринам",
      cityDestination: "городское направление",
      marinasTitle: "Популярные марины",
      marinasDescription: "Марины и точки отправления, связанные с этим направлением.",
      viewMarina: "Открыть марину",
      rentTitle: "Какие лодки доступны",
      rentDescription: "Основные категории аренды для этого направления.",
      faqTitle: "Частые вопросы",
      faqDescription: "Короткие ответы о маринах, аренде и структуре страниц Sharmar.",
      home: "Главная",
      mediterranean: "Средиземноморье",
      cityNotFound: "Город не найден | Sharmar",
      noMarinas: "марин пока нет",
      faqMarinasQuestion: "Какие марины доступны рядом?",
      faqBoatsQuestion: "Какие лодки доступны?",
      faqStructureQuestion: "Как Sharmar связывает города, марины и лодки?",
      faqMarinasAnswerPrefix: "С этим направлением связаны",
      faqMarinasAnswerSuffix: "Переходите на страницы марин, чтобы смотреть детали и связанные лодки.",
      faqBoatsAnswer: "На странице доступны переходы к моторным яхтам, катамаранам и парусным яхтам. Конкретные лодки, цены и доступность проверяются в карточках объявлений.",
      faqStructureAnswerPrefix: "Sharmar связывает",
      faqStructureAnswerSuffix: "с релевантными маринами и категориями аренды, чтобы посетитель мог перейти от направления к конкретному объявлению.",
      rentMotor: "Моторные яхты",
      rentCatamaran: "Катамараны",
      rentSail: "Парусные яхты",
    };
  }

  if (lang === "me") {
    return {
      backToCountry: "Nazad na državu",
      backToMarinas: "Nazad na sve marine",
      cityDestination: "gradska destinacija",
      marinasTitle: "Popularne marine",
      marinasDescription: "Marine i polazne tačke povezane sa ovom destinacijom.",
      viewMarina: "Otvori marinu",
      rentTitle: "Koja plovila su dostupna",
      rentDescription: "Glavne kategorije najma za ovu destinaciju.",
      faqTitle: "Česta pitanja",
      faqDescription: "Kratki odgovori o marinama, najmu i strukturi Sharmar stranica.",
      home: "Početna",
      mediterranean: "Mediteran",
      cityNotFound: "Grad nije pronađen | Sharmar",
      noMarinas: "trenutno nema povezanih marina",
      faqMarinasQuestion: "Koje marine su dostupne u blizini?",
      faqBoatsQuestion: "Koja plovila su dostupna?",
      faqStructureQuestion: "Kako Sharmar povezuje gradove, marine i plovila?",
      faqMarinasAnswerPrefix: "Sa ovom destinacijom su povezane",
      faqMarinasAnswerSuffix: "Otvorite stranice marina za detalje i povezana plovila.",
      faqBoatsAnswer: "Stranica vodi ka motornim jahtama, katamaranima i jedrilicama. Konkretna plovila, cijene i dostupnost provjeravaju se na stranicama oglasa.",
      faqStructureAnswerPrefix: "Sharmar povezuje",
      faqStructureAnswerSuffix: "sa relevantnim marinama i kategorijama najma, kako bi posjetilac mogao preći od destinacije do konkretnog oglasa.",
      rentMotor: "Motorne jahte",
      rentCatamaran: "Katamarani",
      rentSail: "Jedrilice",
    };
  }

  return {
    backToCountry: "Back to country",
    backToMarinas: "Back to all marinas",
    cityDestination: "city destination",
    marinasTitle: "Popular marinas",
    marinasDescription: "Marinas and departure points connected to this destination.",
    viewMarina: "View marina",
    rentTitle: "Available boat categories",
    rentDescription: "Core rental categories for this destination.",
    faqTitle: "FAQs",
    faqDescription: "Short answers about marinas, rentals, and Sharmar page structure.",
    home: "Home",
    mediterranean: "Mediterranean",
    cityNotFound: "City not found | Sharmar",
    noMarinas: "no marina pages yet",
    faqMarinasQuestion: "Which marinas are available nearby?",
    faqBoatsQuestion: "Which boats are available?",
    faqStructureQuestion: "How does Sharmar connect cities, marinas, and boats?",
    faqMarinasAnswerPrefix: "This destination is connected to",
    faqMarinasAnswerSuffix: "Open the marina pages to review details and related boats.",
    faqBoatsAnswer: "The page links to motor yachts, catamarans, and sailing boats. Specific boats, prices, and availability are checked on individual listing pages.",
    faqStructureAnswerPrefix: "Sharmar connects",
    faqStructureAnswerSuffix: "with relevant marinas and rental categories, so visitors can move from a destination to a specific listing.",
    rentMotor: "Motor yachts",
    rentCatamaran: "Catamarans",
    rentSail: "Sailing boats",
  };
}

type CityLocaleText = {
  displayName: string;
  placeName: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

const CITY_NAMES: Record<
  string,
  {
    ru: { display: string; place: string };
    me: { display: string; place: string };
  }
> = {
  tivat: { ru: { display: "Тиват", place: "Тивате" }, me: { display: "Tivat", place: "Tivtu" } },
  budva: { ru: { display: "Будва", place: "Будве" }, me: { display: "Budva", place: "Budvi" } },
  kotor: { ru: { display: "Котор", place: "Которе" }, me: { display: "Kotor", place: "Kotoru" } },
  bar: { ru: { display: "Бар", place: "Баре" }, me: { display: "Bar", place: "Baru" } },
  "herceg-novi": {
    ru: { display: "Херцег-Нови", place: "Херцег-Нови" },
    me: { display: "Herceg Novi", place: "Herceg Novom" },
  },
  dubrovnik: { ru: { display: "Дубровник", place: "Дубровнике" }, me: { display: "Dubrovnik", place: "Dubrovniku" } },
  split: { ru: { display: "Сплит", place: "Сплите" }, me: { display: "Split", place: "Splitu" } },
  athens: { ru: { display: "Афины", place: "Афинах" }, me: { display: "Atina", place: "Atini" } },
  mykonos: { ru: { display: "Миконос", place: "Миконосе" }, me: { display: "Mikonos", place: "Mikonosu" } },
  santorini: { ru: { display: "Санторини", place: "Санторини" }, me: { display: "Santorini", place: "Santoriniju" } },
  corfu: { ru: { display: "Корфу", place: "Корфу" }, me: { display: "Krf", place: "Krfu" } },
  rhodes: { ru: { display: "Родос", place: "Родосе" }, me: { display: "Rodos", place: "Rodosu" } },
};

const COUNTRY_NAMES: Record<string, { ru: string; me: string }> = {
  montenegro: { ru: "Черногория", me: "Crna Gora" },
  croatia: { ru: "Хорватия", me: "Hrvatska" },
  greece: { ru: "Греция", me: "Grčka" },
};

function localizedCountryName(slug: string, fallback: string, lang: Lang): string {
  if (lang === "ru") return COUNTRY_NAMES[slug]?.ru ?? fallback;
  if (lang === "me") return COUNTRY_NAMES[slug]?.me ?? fallback;
  return fallback;
}

function localizedCityDisplayName(cityTitle: string, lang: Lang): string {
  const city = CITIES.find((item) => item.title === cityTitle);
  if (!city) return cityTitle;
  if (lang === "ru") return CITY_NAMES[city.slug]?.ru.display ?? cityTitle;
  if (lang === "me") return CITY_NAMES[city.slug]?.me.display ?? cityTitle;
  return cityTitle;
}

function cityLocaleText(city: CityDefinition, lang: Lang): CityLocaleText {
  if (lang === "ru") {
    const name = CITY_NAMES[city.slug]?.ru ?? { display: city.title, place: city.title };
    return {
      displayName: name.display,
      placeName: name.place,
      title: `Аренда яхт и марины в ${name.place}`,
      description: `${name.display} — направление Sharmar для аренды яхт, прогулок на лодках и перехода к связанным маринам.`,
      seoTitle: `Аренда яхт в ${name.place} | Sharmar`,
      seoDescription: `Смотрите аренду моторных яхт, катамаранов и парусных яхт в ${name.place}, а также связанные марины и маршруты Sharmar.`,
    };
  }

  if (lang === "me") {
    const name = CITY_NAMES[city.slug]?.me ?? { display: city.title, place: city.title };
    return {
      displayName: name.display,
      placeName: name.place,
      title: `Najam jahti i marine u ${name.place}`,
      description: `${name.display} je Sharmar destinacija za najam jahti, ture brodom i povezane marine.`,
      seoTitle: `Najam jahti u ${name.place} | Sharmar`,
      seoDescription: `Pogledajte najam motornih jahti, katamarana i jedrilica u ${name.place}, uz povezane marine i Sharmar rute.`,
    };
  }

  return {
    displayName: city.title,
    placeName: city.title,
    title: `Yacht rentals and marinas in ${city.title}`,
    description: city.description,
    seoTitle: city.seoTitle,
    seoDescription: city.seoDescription,
  };
}

function localizedRegion(region: string, lang: Lang): string {
  if (lang === "ru") {
    if (region === "Adriatic Sea") return "Адриатическое море";
    if (region === "Bay of Kotor") return "Бока-Которская бухта";
  }

  if (lang === "me") {
    if (region === "Adriatic Sea") return "Jadransko more";
    if (region === "Bay of Kotor") return "Boka Kotorska";
  }

  return region;
}

function localizedMarinaDescription(
  marina: (typeof MARINAS)[number],
  lang: Lang
): string {
  if (lang === "ru") {
    return `${marina.title} — марина в направлении ${localizedCityDisplayName(marina.city, lang)} для аренды яхт, катамаранов и морских прогулок.`;
  }

  if (lang === "me") {
    return `${marina.title} je marina u destinaciji ${localizedCityDisplayName(marina.city, lang)} za najam jahti, katamarane i ture brodom.`;
  }

  return marina.description;
}

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
    LANGS.map((lang) => [lang === "me" ? "sr-Latn-ME" : lang, `${SITE_URL}${cityPath(lang, slug)}`])
  );
}

function formatTitleList(items: string[], emptyText: string, lang: Lang): string {
  if (items.length === 0) return emptyText;
  if (items.length === 1) return items[0];
  if (items.length === 2) {
    const joiner = lang === "ru" ? " и " : lang === "me" ? " i " : " and ";
    return `${items[0]}${joiner}${items[1]}`;
  }

  const lastJoiner = lang === "ru" ? " и " : lang === "me" ? " i " : ", and ";
  return `${items.slice(0, -1).join(", ")}${lastJoiner}${items[items.length - 1]}`;
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
  const copy = pageCopy(lang);

  if (!city) {
    return {
      title: copy.cityNotFound,
    };
  }

  const cityText = cityLocaleText(city, lang);
  const canonical = `${SITE_URL}${cityPath(lang, city.slug)}`;

  return {
    title: cityText.seoTitle,
    description: cityText.seoDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(city.slug),
        "x-default": `${SITE_URL}${cityPath("en", city.slug)}`,
      },
    },
    openGraph: {
      title: cityText.seoTitle,
      description: cityText.seoDescription,
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

  const copy = pageCopy(lang);
  const cityText = cityLocaleText(city, lang);
  const country = COUNTRIES.find((item) => item.slug === city.countrySlug);
  const countryTitle = country
    ? localizedCountryName(country.slug, country.title, lang)
    : localizedCountryName(city.countrySlug, city.countrySlug, lang);
  const marinas = MARINAS.filter((marina) => city.marinaSlugs.includes(marina.slug));
  const cityUrl = absoluteSiteUrl(cityPath(lang, city.slug));
  const marinaList = formatTitleList(
    marinas.map((marina) => marina.title),
    copy.noMarinas,
    lang
  );
  const faqItems = [
    {
      question: copy.faqMarinasQuestion,
      answer: `${copy.faqMarinasAnswerPrefix} ${marinaList}. ${copy.faqMarinasAnswerSuffix}`,
    },
    {
      question: copy.faqBoatsQuestion,
      answer: copy.faqBoatsAnswer,
    },
    {
      question: copy.faqStructureQuestion,
      answer: `${copy.faqStructureAnswerPrefix} ${cityText.displayName} ${copy.faqStructureAnswerSuffix}`,
    },
  ];
  const jsonLd = [
    webPageJsonLd({
      url: cityUrl,
      name: cityText.seoTitle,
      description: cityText.seoDescription,
    }),
    breadcrumbJsonLd([
      { name: copy.home, url: absoluteSiteUrl(`/${lang}`) },
      {
        name: countryTitle,
        url: absoluteSiteUrl(`/${lang}/country/${country?.slug ?? city.countrySlug}`),
      },
      { name: cityText.displayName, url: cityUrl },
    ]),
    itemListJsonLd(
      marinas.map((marina) => ({
        name: marina.title,
        url: absoluteSiteUrl(`/${lang}/marina/${marina.slug}`),
      }))
    ),
    faqJsonLd(faqItems),
  ];
  const rentLinks = [
    { href: `/${lang}/city/${city.slug}/rent/motor`, label: copy.rentMotor },
    { href: `/${lang}/city/${city.slug}/rent/catamaran`, label: copy.rentCatamaran },
    { href: `/${lang}/city/${city.slug}/rent/sail`, label: copy.rentSail },
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
            {copy.backToCountry} {countryTitle}
          </Link>
        ) : (
          <Link className="backlink" href={`/${lang}/marinas`}>
            {copy.backToMarinas}
          </Link>
        )}

        <section className="geo-hero">
          <p className="kicker">{countryTitle} {copy.cityDestination}</p>
          <h1>{cityText.title}</h1>
          <p>{cityText.description}</p>
        </section>

        <section className="geo-section" aria-labelledby="city-marinas-title">
          <div className="geo-section-head">
            <h2 id="city-marinas-title">{copy.marinasTitle}</h2>
            <p>{copy.marinasDescription}</p>
          </div>

          <div className="geo-grid">
            {marinas.map((marina) => (
              <Link key={marina.slug} className="geo-card" href={`/${lang}/marina/${marina.slug}`}>
                <p className="kicker">{localizedRegion(marina.region, lang)}</p>
                <h3>{marina.title}</h3>
                <p>{localizedMarinaDescription(marina, lang)}</p>
                <span>{copy.viewMarina}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-rent-title">
          <div className="geo-section-head">
            <h2 id="city-rent-title">{copy.rentTitle}</h2>
            <p>{copy.rentDescription}</p>
          </div>

          <div className="rent-grid">
            {rentLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="geo-section" aria-labelledby="city-faq-title">
          <div className="geo-section-head">
            <h2 id="city-faq-title">{copy.faqTitle}</h2>
            <p>{copy.faqDescription}</p>
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
