export type ListingKind = "rent" | "sale";
export type BoatType = "motor" | "sail" | "catamaran";
export type Propulsion = "motor" | "sail";

export type BoatFormMode =
  | { kind: "rent"; boatType: "motor" }
  | { kind: "rent"; boatType: "sail" }
  | { kind: "rent"; boatType: "catamaran" }
  | { kind: "sale"; boatType: "motor" }
  | { kind: "sale"; boatType: "sail" }
  | { kind: "sale"; boatType: "catamaran" };

export type BoatFormLocation = {
  id: number;
  name?: string | null;
  slug?: string | null;
};

export type BoatFormValues = {
  title: string;
  description: string;
  year: string;
  lengthM: string;
  capacityGuests: string;
  ownerPhone: string;
  homeMarinaId: string;
  imageIds?: number[];

  instantBooking: boolean;

  rentPriceHour: string;
  rentPriceDay: string;
  rentPriceWeek: string;
  minRentalHours: string;

  salePrice: string;
  motorHorsePower: string;
  propulsion: Propulsion;
};
