import type { Metadata } from "next";
import { Suspense } from "react";

import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";
import OwnerResetPasswordForm from "./OwnerResetPasswordForm";

type Props = {
  params: Promise<{ lang: string }>;
};

const SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Reset owner password | Sharmar",
    description: "Set a new password for your Sharmar owner account.",
  },
  ru: {
    title: "Сброс пароля владельца | Sharmar",
    description: "Задайте новый пароль для аккаунта владельца Sharmar.",
  },
  me: {
    title: "Reset lozinke vlasnika | Sharmar",
    description: "Postavite novu lozinku za Sharmar nalog vlasnika.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const canonical = absoluteLocalizedUrl(lang, "owner-reset-password");
  return {
    title: SEO[lang].title,
    description: SEO[lang].description,
    alternates: {
      canonical,
      languages: languageAlternates("owner-reset-password"),
    },
  };
}

export default function OwnerResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <OwnerResetPasswordForm />
    </Suspense>
  );
}
