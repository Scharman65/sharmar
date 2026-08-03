export type RouteGuestLimitValidation =
  | { ok: true; maxGuests: number; boatCapacity: number }
  | { ok: false; error: string };

function finiteInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(parsed) && Number.isFinite(parsed)
    ? parsed
    : null;
}

export function validateRouteGuestLimit(
  maxGuestsValue: unknown,
  boatCapacityValue: unknown
): RouteGuestLimitValidation {
  const maxGuests = finiteInteger(maxGuestsValue);
  if (maxGuests === null || maxGuests < 1) {
    return { ok: false, error: "maxGuests is required" };
  }

  const boatCapacity = finiteInteger(boatCapacityValue);
  if (boatCapacity === null || boatCapacity < 1) {
    return {
      ok: false,
      error: "Boat capacity must be configured before saving routes",
    };
  }

  if (maxGuests > boatCapacity) {
    return {
      ok: false,
      error: `maxGuests cannot exceed boat capacity (${boatCapacity})`,
    };
  }

  return { ok: true, maxGuests, boatCapacity };
}
