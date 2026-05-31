import Link from "next/link";

type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Handpicked fleet",
    title: "Featured yacht categories",
    all: "View all yachts",
    items: [
      ["Premium motor yachts", "For rent", "From €100 / hour", "rent/motor"],
      ["Sailing yachts", "Private sailing", "Daily charters", "rent/sail"],
      ["Catamarans", "Group trips", "Comfort at sea", "rent/catamaran"],
    ],
  },
  ru: {
    eyebrow: "Подборка флота",
    title: "Популярные категории яхт",
    all: "Смотреть все яхты",
    items: [
      ["Премиальные моторные яхты", "Аренда", "От €100 / час", "rent/motor"],
      ["Парусные яхты", "Частные прогулки", "Дневные чартеры", "rent/sail"],
      ["Катамараны", "Для групп", "Комфорт на море", "rent/catamaran"],
    ],
  },
  me: {
    eyebrow: "Odabrana flota",
    title: "Popularne kategorije jahti",
    all: "Pogledaj sve jahte",
    items: [
      ["Premium motorne jahte", "Najam", "Od €100 / sat", "rent/motor"],
      ["Jedrilice", "Privatno jedrenje", "Dnevni čarteri", "rent/sail"],
      ["Katamarani", "Grupne ture", "Komfor na moru", "rent/catamaran"],
    ],
  },
};

export default function FeaturedYachts({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <p className="home-eyebrow">{ui.eyebrow}</p>
          <h2>{ui.title}</h2>
        </div>
        <Link href={`/${lang}/boats`} className="home-section-link">{ui.all}</Link>
      </div>

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
    </section>
  );
}
