"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGS, type Lang } from "@/i18n";

function replaceLang(pathname: string, nextLang: Lang) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return `/${nextLang}`;
  parts[0] = nextLang;
  return "/" + parts.join("/");
}

export default function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = usePathname() || `/${lang}`;

  return (
    <div className="lang">
      {LANGS.map((l) => (
        <Link
          key={l}
          className={`lang-link ${l === lang ? "active" : ""}`}
          href={replaceLang(pathname, l)}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
