import type { Metadata } from "next";
import { Suspense } from "react";

import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

const REQUEST_SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Booking request | Sharmar",
    description: "Send a structured yacht booking request through Sharmar for owner review and confirmation.",
  },
  ru: {
    title: "Заявка на бронирование | Sharmar",
    description: "Отправьте структурированную заявку на бронирование яхты через Sharmar для проверки и подтверждения владельцем.",
  },
  me: {
    title: "Zahtjev za rezervaciju | Sharmar",
    description: "Pošaljite strukturirani zahtjev za rezervaciju jahte preko Sharmar platforme na pregled i potvrdu vlasnika.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const seo = REQUEST_SEO[lang];
  const canonical = absoluteLocalizedUrl(lang, "request");

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: languageAlternates("request"),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
  };
}

export default function RequestLayout({ children }: Props) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
