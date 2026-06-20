import HomeHero from "@/components/homepage/HomeHero";
import PopularDestinations from "@/components/homepage/PopularDestinations";
import FeaturedYachts from "@/components/homepage/FeaturedYachts";
import WhySharmar from "@/components/homepage/WhySharmar";
import OwnerCTA from "@/components/homepage/OwnerCTA";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function LangHome({ params }: Props) {
  const { lang } = await params;

  return (
    <div className="home-page">
      <HomeHero lang={lang} />
      <PopularDestinations lang={lang} />
      <FeaturedYachts lang={lang} />
      <WhySharmar lang={lang} />
      <OwnerCTA lang={lang} />
    </div>
  );
}
