import en from "./en";
import ru from "./ru";
import me from "./me";

export const LANGS = ["en", "ru", "me"] as const;
export type Lang = (typeof LANGS)[number];

export const SITE_URL = "https://sharmar.me";

const dict = { en, ru, me } as const;

export function isLang(x: string): x is Lang {
  return (LANGS as readonly string[]).includes(x);
}

export function normalizeLang(value: string | null | undefined): Lang {
  return value && isLang(value) ? value : "en";
}

export function htmlLang(lang: Lang): string {
  if (lang === "me") return "sr-Latn-ME";
  return lang;
}

export function localizedPath(lang: Lang, path = ""): string {
  const cleanPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `/${lang}${cleanPath}`;
}

export function absoluteLocalizedUrl(lang: Lang, path = ""): string {
  return `${SITE_URL}${localizedPath(lang, path)}`;
}

export function languageAlternates(path = ""): Record<string, string> {
  return {
    en: absoluteLocalizedUrl("en", path),
    ru: absoluteLocalizedUrl("ru", path),
    "sr-Latn-ME": absoluteLocalizedUrl("me", path),
    "x-default": absoluteLocalizedUrl("en", path),
  };
}

export function t(lang: Lang) {
  return dict[lang];
}

export function formatCount(lang: Lang, n: number) {
  const s = t(lang).boats;
  if (n === 1) return s.count_one;
  return s.count_many.replace("{n}", String(n));
}
