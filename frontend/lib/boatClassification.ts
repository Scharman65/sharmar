export type ListingPurpose = "rent" | "sale";
export type VesselType = "motorboat" | "sailboat" | "catamaran";
export type Propulsion = "motor" | "sail";
export type LegacyBoatType = "Motorboat" | "Sailboat" | "Catamaran";
export type PublicLang = "en" | "ru" | "me" | "sr-Latn-ME";

export function asVesselType(value: unknown): VesselType | null {
  return value === "motorboat" || value === "sailboat" || value === "catamaran"
    ? value
    : null;
}

export function asPropulsion(value: unknown): Propulsion | null {
  return value === "motor" || value === "sail" ? value : null;
}

export function defaultPropulsionForVesselType(vesselType: VesselType): Propulsion {
  if (vesselType === "motorboat") return "motor";
  return "sail";
}

export function boatTypeFromVesselType(vesselType: VesselType): LegacyBoatType {
  if (vesselType === "catamaran") return "Catamaran";
  return vesselType === "motorboat" ? "Motorboat" : "Sailboat";
}

export function normalizeVesselType(value: unknown): VesselType {
  const direct = asVesselType(value);
  if (direct) return direct;

  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text === "catamaran") return "catamaran";
  if (text === "sail" || text === "sailboat" || text === "sailing") return "sailboat";
  if (text === "motor" || text === "motorboat" || text === "speedboat" || text === "rib") return "motorboat";

  return "motorboat";
}

export function normalizePropulsion(value: unknown, vesselType: VesselType): Propulsion {
  return asPropulsion(value) ?? defaultPropulsionForVesselType(vesselType);
}

export function vesselTypeLabel(value: unknown, lang: PublicLang): string {
  const vesselType = normalizeVesselType(value);
  if (vesselType === "catamaran") {
    return lang === "ru" ? "Катамаран" : "Catamaran";
  }
  if (vesselType === "sailboat") {
    return lang === "ru" ? "Парусная лодка" : lang === "me" || lang === "sr-Latn-ME" ? "Jedrilica" : "Sail boat";
  }
  return lang === "ru" ? "Моторная лодка" : lang === "me" || lang === "sr-Latn-ME" ? "Motorni brod" : "Motor boat";
}

export function propulsionLabel(value: unknown, lang: PublicLang): string {
  const propulsion = asPropulsion(value) ?? "sail";
  if (propulsion === "motor") {
    return lang === "ru" ? "Моторный" : "Motor";
  }
  return lang === "ru" ? "Парусный" : lang === "me" || lang === "sr-Latn-ME" ? "Jedra" : "Sail";
}
