import type { Boat } from "./strapi";

export function getBoatCardImage(boat: Boat | null | undefined): { src: string; alt: string } | null {
  if (!boat) return null;

  const alt =
    boat.cover?.alternativeText ??
    boat.title ??
    "Boat";

  if (boat.cover?.url) {
    return { src: boat.cover.url, alt };
  }

  if (boat.images && boat.images.length > 0 && boat.images[0]?.url) {
    return { src: boat.images[0].url, alt };
  }

  return null;
}
