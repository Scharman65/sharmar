import { BoatForm } from "@/components/boat-form/BoatForm";
import AddAuthGuard from "../../AddAuthGuard";
import { isLang, type Lang } from "@/i18n";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function AddRentSailPage({ params }: Props) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang: Lang = raw;

  return (
    <>
      <AddAuthGuard lang={lang} />
      <BoatForm mode={{ kind: "rent", boatType: "sail" }} />
    </>
  );
}
