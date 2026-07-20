import type { Metadata } from "next";
import { isLang, type Lang } from "@/i18n";
import AdminCockpitClient from "./AdminCockpitClient";

export const metadata: Metadata = {
  title: "Admin dashboard | Sharmar",
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

export default async function AdminDashboardPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";

  return <AdminCockpitClient lang={lang} />;
}
