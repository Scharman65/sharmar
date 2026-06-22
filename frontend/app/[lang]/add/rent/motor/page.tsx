import { BoatForm } from "@/components/boat-form/BoatForm";
import { fetchLocations } from "@/lib/strapi";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function Page({ params }: PageProps) {
  const { lang } = await params;
  const locations = await fetchLocations(lang);

  return <BoatForm mode={{ kind: "rent", boatType: "motor" }} locations={locations} />;
}
