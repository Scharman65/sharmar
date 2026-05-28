import type { MetadataRoute } from "next";
import { MARINAS } from "@/data/marinas";
import { LANGS } from "@/i18n";

const SITE_URL = "https://sharmar.me";
const RENT_CATEGORIES = ["motor", "catamaran", "sail"] as const;
const SALE_CATEGORIES = ["motor", "catamaran", "sail"] as const;

function url(path: string): string {
  return `${SITE_URL}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return LANGS.flatMap((lang) => [
    {
      url: url(`/${lang}/marinas`),
    },
    ...MARINAS.map((marina) => ({
      url: url(`/${lang}/marina/${marina.slug}`),
    })),
    {
      url: url(`/${lang}/boats`),
    },
    ...RENT_CATEGORIES.map((category) => ({
      url: url(`/${lang}/rent/${category}`),
    })),
    ...SALE_CATEGORIES.map((category) => ({
      url: url(`/${lang}/sale/${category}`),
    })),
  ]);
}
