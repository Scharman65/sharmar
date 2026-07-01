import type { Metadata } from "next";

import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";
import OwnerLoginForm from "./OwnerLoginForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
};

const OWNER_LOGIN_SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Owner login | Sharmar",
    description: "Sign in to the Sharmar owner dashboard to manage boat listings, availability, and booking requests.",
  },
  ru: {
    title: "Вход владельца | Sharmar",
    description: "Войдите в кабинет владельца Sharmar, чтобы управлять лодками, доступностью и заявками на бронирование.",
  },
  me: {
    title: "Prijava vlasnika | Sharmar",
    description: "Prijavite se u Sharmar panel vlasnika za upravljanje plovilima, dostupnošću i zahtjevima za rezervaciju.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const seo = OWNER_LOGIN_SEO[lang];
  const canonical = absoluteLocalizedUrl(lang, "owner-login");

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: languageAlternates("owner-login"),
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

export default function OwnerLoginPage() {
  return <OwnerLoginForm />;
}
