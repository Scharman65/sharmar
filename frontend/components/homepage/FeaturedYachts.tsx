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
      ["Premium motor yachts", "For rent", "From €100 / hour", "rent/motor"],
      ["Sailing yachts", "Private sailing", "Daily charters", "rent/sail"],
      ["Catamarans", "Group trips", "Comfort at sea", "rent/catamaran"],
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
      ["Премиальные моторные яхты", "Аренда", "От €100 / час", "rent/motor"],
      ["Парусные яхты", "Частные прогулки", "Дневные чартеры", "rent/sail"],
      ["Катамараны", "Для групп", "Комфорт на море", "rent/catamaran"],
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
      ["Premium motorne jahte", "Najam", "Od €100 / sat", "rent/motor"],
      ["Jedrilice", "Privatno jedrenje", "Dnevni čarteri", "rent/sail"],
      ["Katamarani", "Grupne ture", "Komfor na moru", "rent/catamaran"],
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
                  <div className="featured-yacht-media featured-yacht-media-1" />
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
          ui.items.map(([title, type, price, href], index) => (
            <Link key={title} href={`/${lang}/${href}`} className="featured-yacht-card">
              <div className={`featured-yacht-media featured-yacht-media-${index + 1}`} />
              <div className="featured-yacht-body">
                <span>{type}</span>
                <h3>{title}</h3>
                <p>{price}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
