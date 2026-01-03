export type ListingKind = "rent" | "sale";
export type BoatType = "motor" | "sail";

export type BoatFormMode =
  | { kind: "rent"; boatType: "motor" }
  | { kind: "rent"; boatType: "sail" }
  | { kind: "sale"; boatType: "motor" }
  | { kind: "sale"; boatType: "sail" };

export type BoatFormValues = {
  title: string;
  description: string;

  locationCity: string;
  locationMarina: string;

  manufacturer: string;
  model: string;
  year: string;

  lengthM: string;
  beamM: string;

  capacityGuests: string;
  cabins: string;
  berths: string;

  mainImageUrl: string;
  galleryImageUrls: string;

  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;

  rentPriceDay: string;
  rentPriceWeek: string;
  rentDeposit: string;
  rentIncludes: string;
  rentCancellation: string;

  salePrice: string;
  saleCurrency: string;
  saleCondition: string;
  saleNegotiable: boolean;
  saleDocuments: string;
  saleServiceHistory: string;

  motorEngineType: string;
  motorEngineCount: string;
  motorHorsePower: string;
  motorEngineHours: string;
  motorCruiseSpeed: string;

  sailDraftM: string;
  sailKeelType: string;
  sailRigType: string;
  sailSailArea: string;
  sailSailsUpdatedYear: string;
};
