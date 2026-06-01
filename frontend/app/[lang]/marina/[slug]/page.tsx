import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LANGS, type Lang } from "@/i18n";
import { MARINAS, type MarinaDefinition } from "@/data/marinas";
import { fetchBoats, type Boat } from "@/lib/strapi";
import { getBoatCardImage } from "@/lib/media";
import { absoluteSiteUrl, breadcrumbJsonLd, itemListJsonLd, webPageJsonLd, SITE_URL } from "@/lib/seo-jsonld";

type PageCopy = {
  marinaNotFound: string;
  home: string;
  marinas: string;
  backToBoats: string;
  mediterraneanMarketplace: string;
  marinaMarketplaceSections: string;
  rentBoats: string;
  charterFrom: string;
  rentDescription: string;
  buyBoats: string;
  boatsForSaleNear: string;
  saleDescription: string;
  forOwners: string;
  listYourYachtIn: string;
  ownersDescription: string;
  listYourBoat: string;
  exploreBoatRentals: string;
  availableBoats: string;
  availableCount: string;
  noBoatsListed: string;
  noBoatsLinked: string;
  typeLabel: string;
  viewDetails: string;
  exploreNearbyMarinas: string;
  viewMarina: string;
  yachtRentalsAndBoatsIn: string;
};

function pageCopy(lang: Lang): PageCopy {
  if (lang === "ru") {
    return {
      marinaNotFound: "Марина не найдена | Sharmar",
      home: "Главная",
      marinas: "Марины",
      backToBoats: "← Назад к лодкам",
      mediterraneanMarketplace: "Средиземноморский маркетплейс",
      marinaMarketplaceSections: "Разделы маркетплейса марин",
      rentBoats: "Аренда лодок",
      charterFrom: "Аренда из",
      rentDescription: "Изучите доступные моторные яхты, катамараны и парусные лодки, связанные с этой мариной.",
      buyBoats: "Покупка лодок",
      boatsForSaleNear: "Лодки на продажу рядом с",
      saleDescription: "Просматривайте премиальные предложения продажи и будущие возможности для владельцев рядом с этой мариной.",
      forOwners: "Для владельцев",
      listYourYachtIn: "Разместите яхту в",
      ownersDescription: "Sharmar помогает владельцам получать структурированные запросы на бронирование и связывать объявления с поиском марин.",
      listYourBoat: "Разместить лодку",
      exploreBoatRentals: "Изучите аренду лодок из этой марины",
      availableBoats: "Доступные лодки в этой марине",
      availableCount: "доступно",
      noBoatsListed: "Сейчас лодки не размещены",
      noBoatsLinked: "Сейчас к этой марине не привязано ни одной лодки.",
      typeLabel: "Тип",
      viewDetails: "Подробнее →",
      exploreNearbyMarinas: "Изучите ближайшие марины",
      viewMarina: "Открыть марину →",
      yachtRentalsAndBoatsIn: "Аренда яхт и лодок в",
    };
  }

  if (lang === "me") {
    return {
      marinaNotFound: "Marina nije pronađena | Sharmar",
      home: "Početna",
      marinas: "Marine",
      backToBoats: "← Nazad na plovila",
      mediterraneanMarketplace: "Mediteranski marketplace",
      marinaMarketplaceSections: "Sekcije marketplace-a marina",
      rentBoats: "Iznajmljivanje plovila",
      charterFrom: "Najam iz",
      rentDescription: "Istražite dostupne motorne jahte, katamarane i jedrilice povezane sa ovom marinom.",
      buyBoats: "Kupovina plovila",
      boatsForSaleNear: "Plovila na prodaju blizu",
      saleDescription: "Pregledajte premium oglase prodaje i buduće mogućnosti za vlasnike oko ove marine.",
      forOwners: "Za vlasnike",
      listYourYachtIn: "Objavite svoju jahtu u",
      ownersDescription: "Sharmar pomaže vlasnicima da dobijaju strukturirane zahtjeve za rezervaciju i povežu oglase sa otkrivanjem marina.",
      listYourBoat: "Objavi plovilo",
      exploreBoatRentals: "Istražite najam plovila iz ove marine",
      availableBoats: "Dostupna plovila u ovoj marini",
      availableCount: "dostupno",
      noBoatsListed: "Trenutno nema objavljenih plovila",
      noBoatsLinked: "Trenutno nema plovila povezanih sa ovom marinom.",
      typeLabel: "Tip",
      viewDetails: "Detalji →",
      exploreNearbyMarinas: "Istražite obližnje marine",
      viewMarina: "Otvori marinu →",
      yachtRentalsAndBoatsIn: "Najam jahti i plovila u",
    };
  }

  return {
    marinaNotFound: "Marina not found | Sharmar",
    home: "Home",
    marinas: "Marinas",
    backToBoats: "← Back to boats",
    mediterraneanMarketplace: "Mediterranean marketplace",
    marinaMarketplaceSections: "Marina marketplace sections",
    rentBoats: "Rent boats",
    charterFrom: "Charter from",
    rentDescription: "Discover available motor yachts, catamarans, and sailing boats connected to this marina.",
    buyBoats: "Buy boats",
    boatsForSaleNear: "Boats for sale near",
    saleDescription: "Browse premium sale listings and future owner opportunities around this marina.",
    forOwners: "For owners",
    listYourYachtIn: "List your yacht in",
    ownersDescription: "Sharmar helps owners receive structured booking requests and connect listings with marina discovery.",
    listYourBoat: "List your boat",
    exploreBoatRentals: "Explore boat rentals from this marina",
    availableBoats: "Available boats in this marina",
    availableCount: "available",
    noBoatsListed: "No boats currently listed",
    noBoatsLinked: "No boats currently linked to this marina.",
    typeLabel: "Type",
    viewDetails: "View details →",
    exploreNearbyMarinas: "Explore nearby marinas",
    viewMarina: "View marina →",
    yachtRentalsAndBoatsIn: "Yacht rentals and boats in",
  };
}

type PageProps = {
  params: Promise<{
    lang: Lang;
    slug: string;
  }>;
};

function getMarina(slug: string) {
  return MARINAS.find((marina) => marina.slug === slug) ?? null;
}

function marinaPath(lang: Lang, slug: string): string {
  return `/${lang}/marina/${slug}`;
}

function languageAlternates(slug: string) {
  return Object.fromEntries(
    LANGS.map((lang) => [lang, `${SITE_URL}${marinaPath(lang, slug)}`])
  );
}

function getRelatedMarinas(currentMarina: MarinaDefinition): MarinaDefinition[] {
  return MARINAS.filter((marina) => marina.slug !== currentMarina.slug)
    .map((marina, index) => {
      const sameCountry = marina.country === currentMarina.country;

      return {
        marina,
        index,
        score: sameCountry ? 1 : 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ marina }) => marina);
}

function money(value: number | null | undefined, currency = "EUR"): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value.toLocaleString("en-US")} ${currency}`.trim();
}

function getBoatPrice(boat: Boat): string | null {
  const currency = boat.currency ?? "EUR";

  if (boat.sale_price != null) return money(boat.sale_price, currency);
  if (boat.price_per_hour != null) return `${money(boat.price_per_hour, currency)} / hour`;
  if (boat.price_per_day != null) return `${money(boat.price_per_day, currency)} / day`;
  if (boat.price_per_week != null) return `${money(boat.price_per_week, currency)} / week`;

  return null;
}

function normalizeMarinaText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function getBoatMarinaCandidates(boat: Boat): string[] {
  const source = boat as Boat & {
    marina?: unknown;
    city?: unknown;
    location?: unknown;
    marinaName?: unknown;
  };

  const location = source.location;
  const locationCandidates =
    location && typeof location === "object"
      ? [
          (location as { city?: unknown }).city,
          (location as { marina?: unknown }).marina,
          (location as { name?: unknown }).name,
        ]
      : [location];

  return [
    source.home_marina?.slug,
    source.home_marina?.name,
    source.home_marina?.region,
    source.marina,
    source.city,
    source.marinaName,
    boat.title,
    boat.slug,
    ...locationCandidates,
  ]
    .map(normalizeMarinaText)
    .filter(Boolean);
}

function getMarinaMatchTerms(marina: MarinaDefinition): string[] {
  const baseTerms = [marina.slug, marina.title, marina.city];

  const aliases: Record<string, string[]> = {
    "porto-montenegro": ["tivat", "porto montenegro", "porto montenegro marina"],
    "budva-marina": ["budva", "budva marina"],
    "kotor-marina": ["kotor", "kotor marina"],
    "dubrovnik-marina": ["dubrovnik", "dubrovnik marina"],
    "split-marina": ["split", "split marina"],
  };

  return [...baseTerms, ...(aliases[marina.slug] ?? [])]
    .map(normalizeMarinaText)
    .filter(Boolean);
}

function boatMatchesMarina(boat: Boat, marina: MarinaDefinition): boolean {
  const candidates = getBoatMarinaCandidates(boat);
  const terms = getMarinaMatchTerms(marina);

  return candidates.some((candidate) =>
    terms.some((term) => candidate === term || candidate.includes(term) || term.includes(candidate))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const marina = getMarina(slug);

  if (!marina) {
    return {
      title: pageCopy(lang).marinaNotFound,
    };
  }

  const canonical = `${SITE_URL}${marinaPath(lang, marina.slug)}`;

  return {
    title: marina.seoTitle,
    description: marina.seoDescription,
    alternates: {
      canonical,
      languages: {
        ...languageAlternates(marina.slug),
        "x-default": `${SITE_URL}${marinaPath("en", marina.slug)}`,
      },
    },
    openGraph: {
      title: marina.seoTitle,
      description: marina.seoDescription,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default async function MarinaPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const marina = getMarina(slug);

  if (!marina) notFound();

  // Frontend-only marina filtering for the safe scaling phase. A later backend phase can
  // replace this with API-level marina filtering once the marina contract is finalized.
  const boats = (await fetchBoats(lang).catch(() => []))
    .filter((boat) => boatMatchesMarina(boat, marina))
    .slice(0, 6);
  const relatedMarinas = getRelatedMarinas(marina);
  const marinaUrl = absoluteSiteUrl(marinaPath(lang, marina.slug));
  const jsonLd = [
    webPageJsonLd({
      url: marinaUrl,
      name: marina.seoTitle,
      description: marina.seoDescription,
    }),
    breadcrumbJsonLd([
      { name: pageCopy(lang).home, url: absoluteSiteUrl(`/${lang}`) },
      { name: pageCopy(lang).marinas, url: absoluteSiteUrl(`/${lang}/marinas`) },
      { name: marina.title, url: marinaUrl },
    ]),
    ...(boats.length
      ? [
          itemListJsonLd(
            boats.map((boat) => {
              const boatUrl = absoluteSiteUrl(`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`);
              const name = boat.title ?? `Boat #${boat.id}`;

              return {
                name,
                url: boatUrl,
                item: {
                  "@type": "Product",
                  name,
                  url: boatUrl,
                  ...(boat.description ? { description: boat.description } : {}),
                  ...(boat.boat_type ?? boat.vesselType ? { category: boat.boat_type ?? boat.vesselType } : {}),
                },
              };
            })
          ),
        ]
      : []),
  ];

  const rentLinks = [
    { href: `/${lang}/rent/motor`, label: "Motor yachts" },
    { href: `/${lang}/rent/catamaran`, label: "Catamarans" },
    { href: `/${lang}/rent/sail`, label: "Sailing boats" },
  ];

  const saleLinks = [
    { href: `/${lang}/sale/motor`, label: "Motor boats for sale" },
    { href: `/${lang}/sale/catamaran`, label: "Catamarans for sale" },
    { href: `/${lang}/sale/sail`, label: "Sailing boats for sale" },
  ];

  const marinaCategoryLinks = [
    { href: `/${lang}/rent/motor`, label: "Rent motor boats" },
    { href: `/${lang}/rent/sail`, label: "Rent sailing yachts" },
    { href: `/${lang}/rent/catamaran`, label: "Catamarans for charter" },
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
      <div className="container">
        <Link className="backlink" href={`/${lang}/boats`}>
          {pageCopy(lang).backToBoats}
        </Link>

        <section className="marina-hero">
          <p className="kicker">{marina.region}</p>
          <h1>{marina.title}</h1>
          <p className="marina-description">{marina.description}</p>

          <div className="marina-meta">
            <span>{marina.city}</span>
            <span>{marina.country}</span>
            <span>{pageCopy(lang).mediterraneanMarketplace}</span>
          </div>
        </section>

        <section className="marina-grid" aria-label={pageCopy(lang).marinaMarketplaceSections}>
          <article className="marina-card">
            <p className="kicker">{pageCopy(lang).rentBoats}</p>
            <h2>{pageCopy(lang).charterFrom} {marina.title}</h2>
            <p>
              {pageCopy(lang).rentDescription}
            </p>
            <div className="link-list">
              {rentLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label} →
                </Link>
              ))}
            </div>
          </article>

          <article className="marina-card">
            <p className="kicker">{pageCopy(lang).buyBoats}</p>
            <h2>{pageCopy(lang).boatsForSaleNear} {marina.city}</h2>
            <p>
              {pageCopy(lang).saleDescription}
            </p>
            <div className="link-list">
              {saleLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label} →
                </Link>
              ))}
            </div>
          </article>

          <article className="marina-card">
            <p className="kicker">{pageCopy(lang).forOwners}</p>
            <h2>{pageCopy(lang).listYourYachtIn} {marina.city}</h2>
            <p>
              {pageCopy(lang).ownersDescription}
            </p>
            <Link className="button" href={`/${lang}/list-your-boat`}>
              {pageCopy(lang).listYourBoat}
            </Link>
          </article>
        </section>

        <section className="marina-category-links" aria-labelledby="marina-category-links-title">
          <div className="marina-section-top">
            <h2 id="marina-category-links-title">{pageCopy(lang).exploreBoatRentals}</h2>
          </div>

          <div className="marina-discovery-links">
            {marinaCategoryLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label} →
              </Link>
            ))}
          </div>
        </section>

        <section className="marina-boats" aria-labelledby="marina-boats-title">
          <div className="marina-section-top">
            <h2 id="marina-boats-title">{pageCopy(lang).availableBoats}</h2>
            <p className="kicker">{boats.length ? `${boats.length} ${pageCopy(lang).availableCount}` : pageCopy(lang).noBoatsListed}</p>
          </div>

          {boats.length === 0 ? (
            <p className="marina-empty">{pageCopy(lang).noBoatsLinked}</p>
          ) : (
            <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {boats.map((boat) => {
                const cardImg = getBoatCardImage(boat);
                const price = getBoatPrice(boat);

                return (
                  <li key={boat.id} className="card">
                    <Link className="card-link" href={`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`}>
                      {cardImg?.src ? (
                        <div className="card-media">
                          <Image
                            src={cardImg.src}
                            alt={cardImg.alt ?? boat.title ?? "Boat"}
                            fill
                            sizes="(max-width: 900px) 100vw, 900px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      ) : (
                        <div className="card-media" />
                      )}

                      <div className="card-body">
                        <h3 className="card-title">{boat.title ?? `Boat #${boat.id}`}</h3>
                        <p className="card-sub">
                          <span>{pageCopy(lang).typeLabel}: {boat.boat_type ?? boat.vesselType ?? "—"}</span>
                        </p>
                        {price ? (
                          <p className="card-sub">
                            <span>{price}</span>
                          </p>
                        ) : null}
                        <div className="card-bottom">
                          <span className="pill">{pageCopy(lang).viewDetails}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {relatedMarinas.length > 0 ? (
          <section className="related-marinas" aria-labelledby="related-marinas-title">
            <div className="marina-section-top">
              <h2 id="related-marinas-title">{pageCopy(lang).exploreNearbyMarinas}</h2>
            </div>

            <ul className="related-marina-grid">
              {relatedMarinas.map((relatedMarina) => (
                <li key={relatedMarina.slug} className="related-marina-card">
                  <Link href={`/${lang}/marina/${relatedMarina.slug}`}>
                    <p className="kicker">
                      {relatedMarina.city}, {relatedMarina.country}
                    </p>
                    <h3>{relatedMarina.title}</h3>
                    <p>{relatedMarina.seoDescription}</p>
                    <span>{pageCopy(lang).viewMarina}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="marina-seo">
          <h2>{pageCopy(lang).yachtRentalsAndBoatsIn} {marina.title}</h2>
          <p>
            {marina.title} is part of Sharmar&apos;s Mediterranean marina network, designed for premium yacht
            discovery, structured booking requests, and owner-confirmed reservations.
          </p>
          <p>
            This page connects marina discovery with boat rentals, yacht sales, and future localized marketplace
            content for {marina.city}, {marina.country}.
          </p>
        </section>
      </div>

      <style>{`
        .marina-hero {
          margin-top: 22px;
          max-width: 920px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .marina-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .marina-description {
          max-width: 700px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .marina-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .marina-meta span {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.06);
          font-size: 13px;
          font-weight: 800;
        }

        .marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
          max-width: 1100px;
        }

        .marina-card,
        .marina-seo {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
        }

        .marina-card h2,
        .marina-seo h2 {
          margin: 6px 0 0;
          line-height: 1.15;
        }

        .marina-card p,
        .marina-seo p {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .link-list {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .link-list a {
          color: inherit;
          text-decoration: none;
          font-weight: 800;
        }

        .link-list a:hover {
          text-decoration: underline;
        }

        .marina-category-links {
          margin-top: 18px;
          max-width: 1100px;
        }

        .marina-discovery-links {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .marina-discovery-links a {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.04);
          color: inherit;
          font-weight: 800;
          text-decoration: none;
        }

        .marina-discovery-links a:hover {
          border-color: rgba(255, 255, 255, 0.24);
        }

        .marina-seo {
          margin-top: 18px;
          max-width: 920px;
        }

        .marina-boats {
          margin-top: 22px;
          max-width: 1100px;
        }

        .related-marinas {
          margin-top: 22px;
          max-width: 1100px;
        }

        .marina-section-top {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .marina-section-top h2 {
          margin: 0;
          line-height: 1.15;
        }

        .marina-empty {
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.66);
        }

        .related-marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .related-marina-card a {
          display: block;
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
        }

        .related-marina-card a:hover {
          border-color: rgba(255, 255, 255, 0.24);
        }

        .related-marina-card h3 {
          margin: 6px 0 0;
          line-height: 1.15;
        }

        .related-marina-card p {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .related-marina-card span {
          display: inline-block;
          margin-top: 4px;
          font-weight: 800;
        }

        @media (max-width: 840px) {
          .marina-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .marina-grid {
            grid-template-columns: 1fr;
          }

          .marina-discovery-links {
            grid-template-columns: 1fr;
          }

          .related-marina-grid {
            grid-template-columns: 1fr;
          }

          .marina-section-top {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}
