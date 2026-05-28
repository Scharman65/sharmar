import type { MetadataRoute } from "next";
import { CITIES, COUNTRIES } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { RENTAL_TYPES } from "@/data/rental-types";
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
    ...COUNTRIES.map((country) => ({
      url: url(`/${lang}/country/${country.slug}`),
    })),
    ...COUNTRIES.flatMap((country) =>
      RENTAL_TYPES.map((rentalType) => ({
        url: url(`/${lang}/country/${country.slug}/rent/${rentalType.slug}`),
      }))
    ),
    ...CITIES.map((city) => ({
      url: url(`/${lang}/city/${city.slug}`),
    })),
    ...CITIES.flatMap((city) =>
      RENTAL_TYPES.map((rentalType) => ({
        url: url(`/${lang}/city/${city.slug}/rent/${rentalType.slug}`),
      }))
    ),
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
