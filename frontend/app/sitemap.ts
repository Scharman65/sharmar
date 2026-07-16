import type { MetadataRoute } from "next";
import { CITIES, COUNTRIES } from "@/data/geography";
import { MARINAS } from "@/data/marinas";
import { RENTAL_TYPES } from "@/data/rental-types";
import { LANGS } from "@/i18n";
import { fetchBoats } from "@/lib/strapi";

const SITE_URL = "https://sharmar.me";
const RENT_CATEGORIES = ["motor", "catamaran", "sail"] as const;
const SALE_CATEGORIES = ["motor", "catamaran", "sail"] as const;

function url(path: string): string {
  return `${SITE_URL}${path}`;
}

async function shouldIncludeTopLevelCategory(
  lang: (typeof LANGS)[number],
  listingType: "rent" | "sale",
  category: (typeof RENT_CATEGORIES)[number] | (typeof SALE_CATEGORIES)[number]
): Promise<boolean> {
  if (category !== "catamaran") return true;

  try {
    const boats = await fetchBoats(lang, {
      listingType,
      boatType: "Catamaran",
    });
    return boats.length > 0;
  } catch {
    return true;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await Promise.all(
    LANGS.map(async (lang) => {
      const rentCategories = (
        await Promise.all(
          RENT_CATEGORIES.map(async (category) => ({
            category,
            include: await shouldIncludeTopLevelCategory(lang, "rent", category),
          }))
        )
      )
        .filter((item) => item.include)
        .map((item) => item.category);

      const saleCategories = (
        await Promise.all(
          SALE_CATEGORIES.map(async (category) => ({
            category,
            include: await shouldIncludeTopLevelCategory(lang, "sale", category),
          }))
        )
      )
        .filter((item) => item.include)
        .map((item) => item.category);

      return [
        {
          url: url(`/${lang}/marinas`),
        },
        {
          url: url(`/${lang}/owners`),
        },
        {
          url: url(`/${lang}/list-your-boat`),
        },
        ...COUNTRIES.map((country) => ({
          url: url(`/${lang}/country/${country.slug}`),
        })),
        ...COUNTRIES.map((country) => ({
          url: url(`/${lang}/owners/${country.slug}`),
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
        ...rentCategories.map((category) => ({
          url: url(`/${lang}/rent/${category}`),
        })),
        ...saleCategories.map((category) => ({
          url: url(`/${lang}/sale/${category}`),
        })),
      ];
    })
  );

  return entries.flat();
}
