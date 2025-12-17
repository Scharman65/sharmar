import en from "./en";
import ru from "./ru";
import me from "./me";

export const LANGS = ["en", "ru", "me"] as const;
export type Lang = (typeof LANGS)[number];

const dict = { en, ru, me } as const;

export function isLang(x: string): x is Lang {
  return (LANGS as readonly string[]).includes(x);
}

export function t(lang: Lang) {
  return dict[lang];
}

export function formatCount(lang: Lang, n: number) {
  const s = t(lang).boats;
  if (n === 1) return s.count_one;
  return s.count_many.replace("{n}", String(n));
}
