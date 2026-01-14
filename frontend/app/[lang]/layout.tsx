import Link from "next/link";
import "../globals.css";
import { isLang, t, type Lang } from "@/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderMarinaFilter from "./HeaderMarinaFilter";
import HeaderTopNav from "./HeaderTopNav";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <Link href={`/`} className="logo">
            Sharmar
          </Link>

          <nav className="nav">

            <HeaderTopNav lang={lang} labels={{
              rent: tr.nav.rent,
              sale: tr.nav.sale,
              motor: tr.nav.motor,
              sail: tr.nav.sail,
              catamaran: (lang === "ru" ? "Катамаран" : lang === "me" ? "Katamaran" : "Catamaran"),
              superyacht: (lang === "ru" ? "Суперяхта" : lang === "me" ? "Super jahta" : "Super yacht"),
              soon: (lang === "ru" ? "Скоро" : lang === "me" ? "Uskoro" : "Soon"),
            }} />

<div data-testid="header-marina-filter"><HeaderMarinaFilter lang={lang} /></div>


            <LanguageSwitcher lang={lang} />
          </nav>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <span>© 2025 Sharmar Boats</span>
      </footer>
    </div>
  );
}
