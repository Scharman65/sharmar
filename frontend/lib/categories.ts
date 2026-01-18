export type ListingType = "rent" | "sale";
export type BoatType = "Motor" | "Sail" | "Catamaran" | "Superyacht";

export type CategoryKey =
  | "rent/motor"
  | "rent/sail"
  | "rent/catamaran"
  | "sale/motor"
  | "sale/sail"
  | "sale/catamaran";

export type CategoryDef = {
  key: CategoryKey;
  listingType: ListingType;
  boatType: BoatType;
};

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  "rent/motor": { key: "rent/motor", listingType: "rent", boatType: "Motor" },
  "rent/sail": { key: "rent/sail", listingType: "rent", boatType: "Sail" },
  "rent/catamaran": {
    key: "rent/catamaran",
    listingType: "rent",
    boatType: "Catamaran",
  },
  "sale/motor": { key: "sale/motor", listingType: "sale", boatType: "Motor" },
  "sale/sail": { key: "sale/sail", listingType: "sale", boatType: "Sail" },
  "sale/catamaran": {
    key: "sale/catamaran",
    listingType: "sale",
    boatType: "Catamaran",
  },
};
