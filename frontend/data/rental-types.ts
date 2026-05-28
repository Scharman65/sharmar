export type RentalTypeDefinition = {
  slug: string;
  title: string;
  pluralTitle: string;
  descriptionLabel: string;
  seoLabel: string;
};

export const RENTAL_TYPES: RentalTypeDefinition[] = [
  {
    slug: "motor",
    title: "Motor yacht",
    pluralTitle: "Motor yachts",
    descriptionLabel: "motor yacht rentals",
    seoLabel: "Motor Yacht Rentals",
  },
  {
    slug: "catamaran",
    title: "Catamaran",
    pluralTitle: "Catamarans",
    descriptionLabel: "catamaran rentals",
    seoLabel: "Catamaran Rentals",
  },
  {
    slug: "sail",
    title: "Sailing boat",
    pluralTitle: "Sailing boats",
    descriptionLabel: "sailing boat rentals",
    seoLabel: "Sailing Boat Rentals",
  },
];

export type RentalTypeSlug = (typeof RENTAL_TYPES)[number]["slug"];

export function getRentalType(slug: string): RentalTypeDefinition | null {
  return RENTAL_TYPES.find((type) => type.slug === slug) ?? null;
}
