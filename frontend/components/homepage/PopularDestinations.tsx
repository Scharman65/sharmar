import Link from "next/link";

type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Where to sail",
    title: "Popular destinations",
    marinas: "View marinas",
    items: [
      ["Budva", "Coastal charters"],
      ["Tivat", "Porto Montenegro"],
      ["Kotor", "Bay experiences"],
      ["Bar", "South coast routes"],
      ["Herceg Novi", "Boka Bay"],
      ["Mediterranean", "More destinations soon"],
    ],
  },
  ru: {
    eyebrow: "Куда отправиться",
    title: "Популярные направления",
    marinas: "Смотреть марины",
    items: [
      ["Будва", "Морские прогулки"],
      ["Тиват", "Porto Montenegro"],
      ["Котор", "Бока-Которская бухта"],
      ["Бар", "Южное побережье"],
      ["Херцег-Нови", "Бока Бэй"],
      ["Средиземноморье", "Скоро больше направлений"],
    ],
  },
  me: {
    eyebrow: "Gdje ploviti",
    title: "Popularne destinacije",
    marinas: "Pogledaj marine",
    items: [
      ["Budva", "Obalne ture"],
      ["Tivat", "Porto Montenegro"],
      ["Kotor", "Iskustva u zalivu"],
      ["Bar", "Rute južne obale"],
      ["Herceg Novi", "Boka Kotorska"],
      ["Mediteran", "Uskoro više destinacija"],
    ],
  },
};

const hrefs = ["city/budva", "city/tivat", "city/kotor", "city/bar", "city/herceg-novi", "boats"];
const classes = ["budva", "tivat", "kotor", "bar", "herceg-novi", "mediterranean"];

export default function PopularDestinations({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <section className="home-section">
      <div className="home-section-head">
        <div>
          <p className="home-eyebrow">{ui.eyebrow}</p>
          <h2>{ui.title}</h2>
        </div>
        <Link href={`/${lang}/marinas`} className="home-section-link">{ui.marinas}</Link>
      </div>

      <div className="destination-grid">
        {ui.items.map(([name, note], index) => (
          <Link key={name} href={`/${lang}/${hrefs[index]}`} className={`destination-card destination-${classes[index]}`}>
            <div className="destination-glow" />
            <strong>{name}</strong>
            <span>{note}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
