import Link from "next/link";
import Image from "next/image";
import { fetchFeaturedBoats, type Boat } from "@/lib/strapi";
import { getBoatCardImage } from "@/lib/media";
import { BoatCardSpecs } from "@/components/boat/BoatCardSpecs";

type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Handpicked fleet",
    title: "Featured yachts",
    fallbackTitle: "Featured yacht categories",
    all: "View all yachts",
    verified: "Verified listing",
    featured: "Featured yacht",
    items: [
      {
        title: "Premium motor yachts",
        type: "For rent",
        price: "From €100 / hour",
        href: "rent/motor",
        mediaClass: "featured-yacht-media-1",
        imageAlt: "Premium motor yacht on the Mediterranean coast",
      },
      {
        title: "Sailing yachts",
        type: "Private sailing",
        price: "Daily charters",
        href: "rent/sail",
        mediaClass: "featured-yacht-media-2",
        imageAlt: "Sailing yacht under sail on open water",
      },
      {
        title: "Catamarans",
        type: "Group trips",
        price: "Comfort at sea",
        href: "rent/catamaran",
        mediaClass: "featured-yacht-media-3",
        imageAlt: "Catamaran on clear coastal water",
      },
      {
        title: "Marinas",
        type: "Departure points",
        price: "Yacht bases",
        href: "marinas",
        mediaClass: "featured-yacht-media-4",
        imageAlt: "Marina with yachts at sunset",
      },
    ],
  },
  ru: {
    eyebrow: "Подборка флота",
    title: "Избранные яхты",
    fallbackTitle: "Популярные категории яхт",
    all: "Смотреть все яхты",
    verified: "Проверенное объявление",
    featured: "Избранная яхта",
    items: [
      {
        title: "Премиальные моторные яхты",
        type: "Аренда",
        price: "От €100 / час",
        href: "rent/motor",
        mediaClass: "featured-yacht-media-1",
        imageAlt: "Премиальная моторная яхта у средиземноморского берега",
      },
      {
        title: "Парусные яхты",
        type: "Частные прогулки",
        price: "Дневные чартеры",
        href: "rent/sail",
        mediaClass: "featured-yacht-media-2",
        imageAlt: "Парусная яхта под парусами в открытом море",
      },
      {
        title: "Катамараны",
        type: "Для групп",
        price: "Комфорт на море",
        href: "rent/catamaran",
        mediaClass: "featured-yacht-media-3",
        imageAlt: "Катамаран на прозрачной прибрежной воде",
      },
      {
        title: "Марины",
        type: "Точки отправления",
        price: "Яхтенные базы",
        href: "marinas",
        mediaClass: "featured-yacht-media-4",
        imageAlt: "Марина с яхтами на закате",
      },
    ],
  },
  me: {
    eyebrow: "Odabrana flota",
    title: "Istaknute jahte",
    fallbackTitle: "Popularne kategorije jahti",
    all: "Pogledaj sve jahte",
    verified: "Provjeren oglas",
    featured: "Istaknuta jahta",
    items: [
      {
        title: "Premium motorne jahte",
        type: "Najam",
        price: "Od €100 / sat",
        href: "rent/motor",
        mediaClass: "featured-yacht-media-1",
        imageAlt: "Premium motorna jahta uz mediteransku obalu",
      },
      {
        title: "Jedrilice",
        type: "Privatno jedrenje",
        price: "Dnevni čarteri",
        href: "rent/sail",
        mediaClass: "featured-yacht-media-2",
        imageAlt: "Jedrilica pod jedrima na otvorenom moru",
      },
      {
        title: "Katamarani",
        type: "Grupne ture",
        price: "Komfor na moru",
        href: "rent/catamaran",
        mediaClass: "featured-yacht-media-3",
        imageAlt: "Katamaran na čistoj obalnoj vodi",
      },
      {
        title: "Marine",
        type: "Polazne tačke",
        price: "Baze za jahte",
        href: "marinas",
        mediaClass: "featured-yacht-media-4",
        imageAlt: "Marina sa jahtama u sumrak",
      },
    ],
  },
};

async function getSafeFeaturedBoats(lang: string): Promise<Boat[]> {
  try {
    return await fetchFeaturedBoats(lang, 3);
  } catch (err) {
    console.error("FEATURED_YACHTS_FALLBACK", err);
    return [];
  }
}

export default async function FeaturedYachts({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;
  const boats = await getSafeFeaturedBoats(lang);
  const hasLiveBoats = boats.length > 0;

  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <p className="home-eyebrow">{ui.eyebrow}</p>
          <h2>{hasLiveBoats ? ui.title : ui.fallbackTitle}</h2>
        </div>
        <Link href={`/${lang}/boats`} className="home-section-link">{ui.all}</Link>
      </div>

      <div className="featured-yacht-grid">
        {hasLiveBoats ? (
          boats.map((boat) => {
            const image = getBoatCardImage(boat);

            return (
              <Link
                key={boat.id}
                href={`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`}
                className="featured-yacht-card"
              >
                {image ? (
                  <div className="featured-yacht-media" style={{ position: "relative", overflow: "hidden" }}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 900px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div className="featured-yacht-media featured-yacht-media-missing" aria-hidden="true" />
                )}

                <div className="featured-yacht-body">
                  <span>{boat.boat_type ?? boat.vesselType ?? "Yacht"}</span>
                  <h3>{boat.title ?? `Boat #${boat.id}`}</h3>
                  <BoatCardSpecs boat={boat} />

                  {boat.verified_listing || boat.featured_listing ? (
                    <div className="badges">
                      {boat.verified_listing ? <span className="badge">✓ {ui.verified}</span> : null}
                      {boat.featured_listing ? <span className="badge">★ {ui.featured}</span> : null}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })
        ) : (
          ui.items.map((item) => (
            <Link key={item.title} href={`/${lang}/${item.href}`} className="featured-yacht-card">
              <div
                className={`featured-yacht-media ${item.mediaClass}`}
                role={item.imageAlt ? "img" : undefined}
                aria-label={item.imageAlt ?? undefined}
                aria-hidden={item.imageAlt ? undefined : true}
              />
              <div className="featured-yacht-body">
                <span>{item.type}</span>
                <h3>{item.title}</h3>
                <p>{item.price}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
