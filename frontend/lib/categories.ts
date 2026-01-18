export type ListingType = "rent" | "sale";
export type BoatType = "Motor" | "Sail" | "Catamaran" | "Superyacht";

export type CategoryKey =
  | "rent/motor"
  | "rent/sail"
  | "rent/catamaran"
  | "sale/motor"
  | "sale/sail"
  | "sale/catamaran";

export type VesselType = "motorboat" | "sailboat";

export type CategoryDef = {
  key: CategoryKey;
  listingType: ListingType;
  boatType: BoatType;
  vesselType?: VesselType | null;
};

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  "rent/motor": { key: "rent/motor", listingType: "rent", boatType: "Motor", vesselType: "motorboat" },
  "rent/sail": { key: "rent/sail", listingType: "rent", boatType: "Sail", vesselType: "sailboat" },
  "rent/catamaran": {
    key: "rent/catamaran",
    listingType: "rent",
    boatType: "Catamaran",
    vesselType: "sailboat",
  },
  "sale/motor": { key: "sale/motor", listingType: "sale", boatType: "Motor", vesselType: "motorboat" },
  "sale/sail": { key: "sale/sail", listingType: "sale", boatType: "Sail", vesselType: "sailboat" },
  "sale/catamaran": {
    key: "sale/catamaran",
    listingType: "sale",
    boatType: "Catamaran",
    vesselType: "sailboat",
  },
};
