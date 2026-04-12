import Link from "next/link";
import type { Metadata } from "next";
import { isLang, type Lang } from "@/i18n";
import AddAuthGuard from "./AddAuthGuard";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";

  return {
    title: lang === "ru" ? "Регистрация яхты" : lang === "me" ? "Registracija jahte" : "Register your yacht",
    description:
      lang === "ru"
        ? "Выберите тип размещения и тип лодки."
        : lang === "me"
          ? "Izaberite tip oglasa i tip plovila."
          : "Choose listing type and boat type.",
  };
}

export default async function AddEntryPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";

  const title =
    lang === "ru" ? "Зарегистрировать яхту" : lang === "me" ? "Registrujte svoju jahtu" : "Register your yacht";
  const subtitle =
    lang === "ru"
      ? "Выберите, как вы хотите разместить лодку."
      : lang === "me"
        ? "Izaberite kako želite da objavite plovilo."
        : "Choose how you want to list your boat.";

  const items = [
    {
      title: lang === "ru" ? "Аренда · Моторная" : lang === "me" ? "Izdavanje · Motorni čamac" : "Rent · Motor",
      href: `/${lang}/add/rent/motor`,
    },
    {
      title: lang === "ru" ? "Аренда · Парусная" : lang === "me" ? "Izdavanje · Jedrilica" : "Rent · Sail",
      href: `/${lang}/add/rent/sail`,
    },
    {
      title: lang === "ru" ? "Продажа · Моторная" : lang === "me" ? "Prodaja · Motorni čamac" : "Sale · Motor",
      href: `/${lang}/add/sale/motor`,
    },
    {
      title: lang === "ru" ? "Продажа · Парусная" : lang === "me" ? "Prodaja · Jedrilica" : "Sale · Sail",
      href: `/${lang}/add/sale/sail`,
    },
  ];

  return (
    <main className="main">
      <AddAuthGuard lang={lang} />
      <div className="container">
        <div className="page-top">
          <h1 className="h1">{title}</h1>
          <p className="kicker">{subtitle}</p>
        </div>

        <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item.href} className="card">
              <Link className="card-link" href={item.href}>
                <div className="card-body">
                  <h3 className="card-title">{item.title}</h3>
                  <div className="card-bottom">
                    <span className="pill">
                      {lang === "ru" ? "Продолжить" : lang === "me" ? "Nastavi" : "Continue"} →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
