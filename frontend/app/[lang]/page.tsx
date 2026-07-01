import type { Metadata } from "next";

import HomeHero from "@/components/homepage/HomeHero";
import PopularDestinations from "@/components/homepage/PopularDestinations";
import FeaturedYachts from "@/components/homepage/FeaturedYachts";
import WhySharmar from "@/components/homepage/WhySharmar";
import OwnerCTA from "@/components/homepage/OwnerCTA";
import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const HOME_SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Sharmar — Yacht Rental and Boat Marketplace in Montenegro",
    description:
      "Rent or buy yachts from verified owners in Montenegro. Explore boats, marinas and sea experiences across the Adriatic with Sharmar.",
  },
  ru: {
    title: "Sharmar — аренда яхт и маркетплейс лодок в Черногории",
    description:
      "Арендуйте или покупайте яхты у проверенных владельцев в Черногории. Лодки, марины и морские маршруты на Адриатике.",
  },
  me: {
    title: "Sharmar — najam jahti i marketplace plovila u Crnoj Gori",
    description:
      "Iznajmite ili kupite jahte od provjerenih vlasnika u Crnoj Gori. Plovila, marine i morske ture na Jadranu.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const seo = HOME_SEO[lang];
  const canonical = absoluteLocalizedUrl(lang);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: languageAlternates(),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
      locale: lang === "ru" ? "ru_RU" : lang === "me" ? "sr_ME" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}

export default async function LangHome({ params }: Props) {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);

  return (
    <div className="home-page">
      <HomeHero lang={lang} />
      <PopularDestinations lang={lang} />
      <FeaturedYachts lang={lang} />
      <WhySharmar lang={lang} />
      <OwnerCTA lang={lang} />
    </div>
  );
}
