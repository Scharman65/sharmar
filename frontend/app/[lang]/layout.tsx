import Link from "next/link";
import "../globals.css";
import { isLang, t, type Lang } from "@/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import HeaderMarinaFilter from "./HeaderMarinaFilter";

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
          <Link href={`/${lang}/boats`} className="logo">
            Sharmar
          </Link>

          <nav className="nav">
            <Link href={`/${lang}/sale/motor`} className="nav-button">
              {tr.nav.sale} · {tr.nav.motor}
            </Link>
            <Link href={`/${lang}/sale/sail`} className="nav-button">
              {tr.nav.sale} · {tr.nav.sail}
            </Link>
            <Link href={`/${lang}/rent/motor`} className="nav-button">
              {tr.nav.rent} · {tr.nav.motor}
            </Link>
            <Link href={`/${lang}/rent/sail`} className="nav-button">
              {tr.nav.rent} · {tr.nav.sail}
            </Link>

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
