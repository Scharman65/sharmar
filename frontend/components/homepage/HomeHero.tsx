import Link from "next/link";
import HomeSearchBar from "./HomeSearchBar";

type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Mediterranean yacht marketplace",
    title: "Find your perfect yacht in Montenegro",
    subtitle: "Rent or buy yachts from verified owners across the Adriatic and the Mediterranean.",
    verified: "Verified owners",
    secure: "Secure booking workflow",
    approval: "Owner approval before confirmation",
    browse: "Browse yachts",
    list: "List your boat",
  },
  ru: {
    eyebrow: "Маркетплейс яхт в Средиземноморье",
    title: "Найдите идеальную яхту в Черногории",
    subtitle: "Арендуйте или покупайте яхты у проверенных владельцев на Адриатике и в Средиземноморье.",
    verified: "Проверенные владельцы",
    secure: "Безопасный процесс бронирования",
    approval: "Подтверждение владельцем до брони",
    browse: "Смотреть яхты",
    list: "Разместить яхту",
  },
  me: {
    eyebrow: "Mediteranski marketplace za jahte",
    title: "Pronađite idealnu jahtu u Crnoj Gori",
    subtitle: "Iznajmite ili kupite jahte od provjerenih vlasnika na Jadranu i Mediteranu.",
    verified: "Provjereni vlasnici",
    secure: "Siguran proces rezervacije",
    approval: "Odobrenje vlasnika prije potvrde",
    browse: "Pogledaj jahte",
    list: "Dodaj jahtu",
  },
};

export default function HomeHero({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <section className="home-hero">
      <div className="home-hero-bg" />
      <div className="home-hero-content">
        <p className="home-eyebrow">{ui.eyebrow}</p>
        <h1 className="home-title">{ui.title}</h1>
        <p className="home-subtitle">{ui.subtitle}</p>

        <HomeSearchBar lang={lang} />

        <div className="home-trust-row">
          <span>{ui.verified}</span>
          <span>{ui.secure}</span>
          <span>{ui.approval}</span>
        </div>

        <div className="home-hero-actions">
          <Link href={`/${lang}/boats`} className="home-primary-link">{ui.browse}</Link>
          <Link href={`/${lang}/list-your-boat`} className="home-secondary-link">{ui.list}</Link>
        </div>
      </div>
    </section>
  );
}
