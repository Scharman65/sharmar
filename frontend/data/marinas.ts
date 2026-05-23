export type MarinaDefinition = {
  slug: string;
  city: string;
  country: string;
  region: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export const MARINAS: MarinaDefinition[] = [
  {
    slug: "porto-montenegro",
    city: "Tivat",
    country: "Montenegro",
    region: "Adriatic Sea",
    title: "Porto Montenegro Marina",
    description:
      "Luxury yacht marina in Tivat with premium motor yachts, catamarans, and sailing boats.",
    seoTitle:
      "Porto Montenegro Yacht Rentals & Boats for Sale | Sharmar",
    seoDescription:
      "Explore yacht rentals, catamarans, sailing boats, and premium charters in Porto Montenegro.",
  },

  {
    slug: "budva-marina",
    city: "Budva",
    country: "Montenegro",
    region: "Adriatic Sea",
    title: "Budva Marina",
    description:
      "Discover yacht rentals and boats for sale in Budva Marina on the Adriatic coast.",
    seoTitle:
      "Budva Marina Yacht Rentals & Boats for Sale | Sharmar",
    seoDescription:
      "Browse motor yachts, sailing boats, and catamarans available in Budva Marina.",
  },

  {
    slug: "kotor-marina",
    city: "Kotor",
    country: "Montenegro",
    region: "Bay of Kotor",
    title: "Kotor Marina",
    description:
      "Premium marina access to the Bay of Kotor with yacht rentals and sailing experiences.",
    seoTitle:
      "Kotor Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoDescription:
      "Find sailing boats, catamarans, and yacht charters in Kotor Marina.",
  },

  {
    slug: "dubrovnik-marina",
    city: "Dubrovnik",
    country: "Croatia",
    region: "Adriatic Sea",
    title: "Dubrovnik Marina",
    description:
      "Mediterranean yacht rentals and boat marketplace near Dubrovnik Old Town.",
    seoTitle:
      "Dubrovnik Yacht Rentals & Boats for Sale | Sharmar",
    seoDescription:
      "Discover premium yacht charters and sailing boats in Dubrovnik Marina.",
  },

  {
    slug: "split-marina",
    city: "Split",
    country: "Croatia",
    region: "Adriatic Sea",
    title: "Split Marina",
    description:
      "Explore catamarans, sailing yachts, and motor boats in Split Marina.",
    seoTitle:
      "Split Marina Yacht Rentals & Sailing Boats | Sharmar",
    seoDescription:
      "Browse yacht charters and premium boats in Split Marina on the Adriatic coast.",
  },
];
