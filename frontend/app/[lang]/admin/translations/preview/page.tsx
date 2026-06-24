import { isLang, type Lang } from "@/i18n";
import AdminTranslationPreviewClient from "./AdminTranslationPreviewClient";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AdminTranslationPreviewPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";

  return <AdminTranslationPreviewClient lang={lang} />;
}
