import type { Metadata } from "next";

import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";
import OwnerForgotPasswordForm from "./OwnerForgotPasswordForm";

type Props = {
  params: Promise<{ lang: string }>;
};

const SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Forgot owner password | Sharmar",
    description: "Request a one-time password reset link for your Sharmar owner account.",
  },
  ru: {
    title: "Восстановление пароля владельца | Sharmar",
    description: "Запросите одноразовую ссылку для сброса пароля аккаунта владельца Sharmar.",
  },
  me: {
    title: "Zaboravljena lozinka vlasnika | Sharmar",
    description: "Zatražite jednokratni link za reset lozinke za Sharmar nalog vlasnika.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const canonical = absoluteLocalizedUrl(lang, "owner-forgot-password");
  return {
    title: SEO[lang].title,
    description: SEO[lang].description,
    alternates: {
      canonical,
      languages: languageAlternates("owner-forgot-password"),
    },
  };
}

export default function OwnerForgotPasswordPage() {
  return <OwnerForgotPasswordForm />;
}
