import type { Metadata } from "next";
import { isLang, type Lang } from "@/i18n";
import AdminTranslationPreviewClient from "./AdminTranslationPreviewClient";

export const metadata: Metadata = {
  title: "Admin translation preview | Sharmar",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AdminTranslationPreviewPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";

  return <AdminTranslationPreviewClient lang={lang} />;
}
