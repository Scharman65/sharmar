import type { Lang } from "@/i18n";
import { applyMarketplaceFee, toPriceNumber } from "@/lib/pricing";

type PriceSummaryProps = {
  lang: Lang;
  listingType?: string | null;
  currency?: string | null;
  pricePerHour?: number | string | null;
  pricePerDay?: number | string | null;
  pricePerWeek?: number | string | null;
  deposit?: number | string | null;
  salePrice?: number | string | null;
  boatId?: number | string | null;
  slug?: string | null;
  title?: string | null;
};

function fmtMoney(value: unknown, currency?: string | null) {
  const n = toPriceNumber(value);
  if (n === null) return null;

  return `${n.toLocaleString("en-US")} ${currency ?? "EUR"}`.trim();
}

export function PriceSummary({
  lang,
  listingType,
  currency,
  pricePerHour,
  pricePerDay,
  pricePerWeek,
  deposit,
  salePrice,
  boatId,
  slug,
  title,
}: PriceSummaryProps) {
  const isRu = lang === "ru";
  const bookingFeeLabel =
    lang === "ru"
      ? "Сбор за бронирование"
      : lang === "me"
        ? "Naknada za rezervaciju"
        : "Booking fee";

  const rows =
    listingType === "sale"
      ? [
          {
            label: isRu ? "Цена продажи" : "Sale price",
            value: fmtMoney(applyMarketplaceFee(salePrice), currency),
          },
        ]
      : [
          {
            label: isRu ? "Цена за час" : "Price per hour",
            value: fmtMoney(applyMarketplaceFee(pricePerHour), currency),
          },
          {
            label: isRu ? "Цена за день" : "Price per day",
            value: fmtMoney(applyMarketplaceFee(pricePerDay), currency),
          },
          {
            label: isRu ? "Цена за неделю" : "Price per week",
            value: fmtMoney(applyMarketplaceFee(pricePerWeek), currency),
          },
          {
            label: bookingFeeLabel,
            value: fmtMoney(deposit, currency),
          },
        ];

  const visibleRows = rows.filter((row) => row.value);

  if (!visibleRows.length) return null;

  return (
    <section
      style={{
        marginTop: 24,
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.92)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
        {isRu ? "Стоимость" : "Pricing"}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {visibleRows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "baseline",
            }}
          >
            <span style={{ opacity: 0.82 }}>{row.label}</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
