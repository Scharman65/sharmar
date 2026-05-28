export type CountryDefinition = {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export type CityDefinition = {
  slug: string;
  title: string;
  countrySlug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  marinaSlugs: string[];
};

export const COUNTRIES: CountryDefinition[] = [
  {
    slug: "montenegro",
    title: "Montenegro",
    description:
      "Discover premium yacht rentals and marina destinations across Montenegro, from Porto Montenegro to Budva and the Bay of Kotor.",
    seoTitle: "Yacht Rentals in Montenegro | Sharmar",
    seoDescription:
      "Explore yacht charters, catamarans, sailing boats, and premium marinas in Montenegro with Sharmar.",
  },
  {
    slug: "croatia",
    title: "Croatia",
    description:
      "Explore yacht charters and Adriatic marina destinations in Croatia, including Dubrovnik and Split.",
    seoTitle: "Yacht Rentals in Croatia | Sharmar",
    seoDescription:
      "Browse premium yacht rentals, sailing boats, and marina destinations in Croatia with Sharmar.",
  },
];

export const CITIES: CityDefinition[] = [
  {
    slug: "tivat",
    title: "Tivat",
    countrySlug: "montenegro",
    description:
      "Tivat is a premium Montenegro yacht destination connected to Porto Montenegro and the Bay of Kotor coastline.",
    seoTitle: "Yacht Rentals in Tivat | Sharmar",
    seoDescription:
      "Find yacht rentals, catamarans, and sailing boats in Tivat, Montenegro, connected to Porto Montenegro.",
    marinaSlugs: ["porto-montenegro"],
  },
  {
    slug: "budva",
    title: "Budva",
    countrySlug: "montenegro",
    description:
      "Budva offers Adriatic yacht rentals, marina access, and coastal boat discovery in Montenegro.",
    seoTitle: "Yacht Rentals in Budva | Sharmar",
    seoDescription:
      "Explore yacht charters, motor boats, and sailing experiences around Budva Marina in Montenegro.",
    marinaSlugs: ["budva-marina"],
  },
  {
    slug: "kotor",
    title: "Kotor",
    countrySlug: "montenegro",
    description:
      "Kotor connects yacht renters with the Bay of Kotor, sailing routes, and premium marina discovery.",
    seoTitle: "Yacht Rentals in Kotor | Sharmar",
    seoDescription:
      "Discover sailing boats, catamarans, and yacht charters near Kotor Marina in Montenegro.",
    marinaSlugs: ["kotor-marina"],
  },
  {
    slug: "dubrovnik",
    title: "Dubrovnik",
    countrySlug: "croatia",
    description:
      "Dubrovnik is a Croatian Adriatic yacht destination for marina access, sailing trips, and premium charters.",
    seoTitle: "Yacht Rentals in Dubrovnik | Sharmar",
    seoDescription:
      "Browse yacht rentals, sailing boats, and marina access around Dubrovnik, Croatia.",
    marinaSlugs: ["dubrovnik-marina"],
  },
  {
    slug: "split",
    title: "Split",
    countrySlug: "croatia",
    description:
      "Split is a central Croatian yacht charter base with catamarans, sailing boats, and Adriatic marina access.",
    seoTitle: "Yacht Rentals in Split | Sharmar",
    seoDescription:
      "Explore yacht charters, catamarans, and sailing boats from Split Marina in Croatia.",
    marinaSlugs: ["split-marina"],
  },
];
