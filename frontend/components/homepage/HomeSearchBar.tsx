import Link from "next/link";

type Props = {
  lang: string;
};

const t = {
  en: {
    destination: "Destination",
    montenegro: "Montenegro",
    boatType: "Boat type",
    motorYacht: "Motor yacht",
    marina: "Marina",
    anyMarina: "Any marina",
    search: "Search yachts",
  },
  ru: {
    destination: "Направление",
    montenegro: "Черногория",
    boatType: "Тип лодки",
    motorYacht: "Моторная яхта",
    marina: "Марина",
    anyMarina: "Любая марина",
    search: "Найти яхты",
  },
  me: {
    destination: "Destinacija",
    montenegro: "Crna Gora",
    boatType: "Tip plovila",
    motorYacht: "Motorna jahta",
    marina: "Marina",
    anyMarina: "Bilo koja marina",
    search: "Pretraži jahte",
  },
};

export default function HomeSearchBar({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <div className="home-search">
      <Link href={`/${lang}/country/montenegro`} className="home-search-item">
        <span className="home-search-label">{ui.destination}</span>
        <strong>{ui.montenegro}</strong>
      </Link>
      <Link href={`/${lang}/rent/motor`} className="home-search-item">
        <span className="home-search-label">{ui.boatType}</span>
        <strong>{ui.motorYacht}</strong>
      </Link>
      <Link href={`/${lang}/marinas`} className="home-search-item">
        <span className="home-search-label">{ui.marina}</span>
        <strong>{ui.anyMarina}</strong>
      </Link>
      <Link href={`/${lang}/boats`} className="home-search-button">
        {ui.search}
      </Link>
    </div>
  );
}
