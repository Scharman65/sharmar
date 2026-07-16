import { fetchLocations } from "@/lib/strapi";
import { BoatForm } from "@/components/boat-form/BoatForm";

export const dynamic = "force-dynamic";

export default async function AddSaleCatamaranPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locations = await fetchLocations(lang);
  return <BoatForm mode={{ kind: "sale", boatType: "catamaran" }} locations={locations} listingLanguage={lang} />;
}
