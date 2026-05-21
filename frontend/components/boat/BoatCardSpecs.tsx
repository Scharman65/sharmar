import type { Boat } from "@/lib/strapi";
import { applyMarketplaceFee, toPriceNumber } from "@/lib/pricing";

type Props = {
  boat: Boat;
};

function money(value?: number | null) {
  if (typeof value !== "number") return null;
  return `€${value.toLocaleString("en-US")}`;
}

export function BoatCardSpecs({ boat }: Props) {
  const specs: string[] = [];

  if (typeof boat.length_m === "number") specs.push(`${boat.length_m} m`);
  if (typeof boat.engine_hp === "number") specs.push(`${boat.engine_hp} hp`);
  if (typeof boat.year === "number") specs.push(String(boat.year));

  const price =
    boat.listing_type === "sale"
      ? money(applyMarketplaceFee(boat.sale_price))
      : toPriceNumber(boat.price_per_day)
        ? `${money(applyMarketplaceFee(boat.price_per_day))} / day`
        : toPriceNumber(boat.price_per_hour)
          ? `${money(applyMarketplaceFee(boat.price_per_hour))} / hour`
          : null;

  if (price) specs.push(price);

  if (!specs.length) return null;

  return (
    <p className="card-sub">
      {specs.map((spec, index) => (
        <span key={`${spec}-${index}`}>
          {index > 0 ? " · " : ""}
          {spec}
        </span>
      ))}
    </p>
  );
}
