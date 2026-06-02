import Link from "next/link";
import { fetchFeaturedBoats } from "@/lib/strapi";

type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Handpicked fleet",
    title: "Featured yacht categories",
    realTitle: "Featured yachts",
    all: "View all yachts",
    from: "From",
    request: "View yacht",
    verified: "Verified",
    featured: "Featured",
    items: [
      ["Premium motor yachts", "For rent", "From €100 / hour", "rent/motor"],
      ["Sailing yachts", "Private sailing", "Daily charters", "rent/sail"],
      ["Catamarans", "Group trips", "Comfort at sea", "rent/catamaran"],
    ],
  },
  ru: {
    eyebrow: "Подборка флота",
    title: "Популярные категории яхт",
    realTitle: "Избранные яхты",
    all: "Смотреть все яхты",
    from: "От",
    request: "Смотреть яхту",
    verified: "Проверено",
    featured: "Избранное",
    items: [
      ["Премиальные моторные яхты", "Аренда", "От €100 / час", "rent/motor"],
      ["Парусные яхты", "Частные прогулки", "Дневные чартеры", "rent/sail"],
      ["Катамараны", "Для групп", "Комфорт на море", "rent/catamaran"],
    ],
  },
  me: {
    eyebrow: "Odabrana flota",
    title: "Popularne kategorije jahti",
    realTitle: "Izdvojene jahte",
    all: "Pogledaj sve jahte",
    from: "Od",
    request: "Pogledaj jahtu",
    verified: "Provjereno",
    featured: "Izdvojeno",
    items: [
      ["Premium motorne jahte", "Najam", "Od €100 / sat", "rent/motor"],
      ["Jedrilice", "Privatno jedrenje", "Dnevni čarteri", "rent/sail"],
      ["Katamarani", "Grupne ture", "Komfor na moru", "rent/catamaran"],
    ],
  },
};

function formatPrice(value?: number | null, currency?: string | null): string | null {
  if (typeof value !== "number") return null;
  const rounded = Math.round(value);
  return `${currency || "EUR"} ${rounded}`;
}

export default async function FeaturedYachts({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;
  const featuredBoats = await fetchFeaturedBoats(lang, 3);

  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <p className="home-eyebrow">{ui.eyebrow}</p>
          <h2>{featuredBoats.length ? ui.realTitle : ui.title}</h2>
        </div>
        <Link href={`/${lang}/boats`} className="home-section-link">{ui.all}</Link>
      </div>

      {featuredBoats.length ? (
        <div className="featured-yacht-grid">
          {featuredBoats.map((boat) => {
            const image = boat.cover?.url ?? null;
            const price =
              formatPrice(boat.price_per_hour, boat.currency) ??
              formatPrice(boat.price_per_day, boat.currency) ??
              formatPrice(boat.sale_price, boat.currency);

            return (
              <Link key={boat.id} href={`/${lang}/boats/${boat.slug}`} className="featured-yacht-card">
                <div
                  className="featured-yacht-media"
                  style={image ? { backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(4,10,18,0.32)), url(${image})` } : undefined}
                />
                <div className="featured-yacht-body">
                  <span>
                    {boat.featured_listing ? `★ ${ui.featured}` : null}
                    {boat.featured_listing && boat.verified_listing ? " · " : null}
                    {boat.verified_listing ? `✓ ${ui.verified}` : null}
                  </span>
                  <h3>{boat.title ?? boat.slug}</h3>
                  <p>{price ? `${ui.from} ${price}` : ui.request}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="featured-yacht-grid">
          {ui.items.map(([title, type, price, href], index) => (
            <Link key={title} href={`/${lang}/${href}`} className="featured-yacht-card">
              <div className={`featured-yacht-media featured-yacht-media-${index + 1}`} />
              <div className="featured-yacht-body">
                <span>{type}</span>
                <h3>{title}</h3>
                <p>{price}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
