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
  searchParams: Promise<{
    boatDocumentId?: string;
    sourceLocale?: string;
  }>;
};

function initialSourceLocale(value: string | undefined) {
  return value === "ru" || value === "en" || value === "sr-Latn-ME"
    ? value
    : "en";
}

export default async function AdminTranslationPreviewPage({
  params,
  searchParams,
}: Props) {
  const [{ lang: rawLang }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const lang: Lang = isLang(rawLang) ? rawLang : "en";

  return (
    <AdminTranslationPreviewClient
      lang={lang}
      initialBoatDocumentId={(query.boatDocumentId ?? "").trim()}
      initialSourceLocale={initialSourceLocale(query.sourceLocale)}
    />
  );
}
