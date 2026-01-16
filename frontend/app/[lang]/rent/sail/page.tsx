import type { Metadata } from "next";
import { fetchBoats, fetchLocations, type Boat } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";
import Link from "next/link";
import Image from "next/image";

import { getBoatCardImage } from "@/lib/media";

function normalizeMarinaSlug(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return v.replace(/^marina-/, "");
}

function normalizePriceSort(v: unknown): "asc" | "desc" | null {
  if (typeof v !== "string") return null;
  if (v === "asc" || v === "desc") return v;
  return null;
}

function sortByNullableNumberNullsFirst<T extends Record<string, any>>(
  rows: T[],
  key: keyof T,
  dir: "asc" | "desc"
): T[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key] as number | null | undefined;
    const bv = b[key] as number | null | undefined;

    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;

    if (aNull && !bNull) return -1;
    if (!aNull && bNull) return 1;
    if (aNull && bNull) return 0;

    return (Number(av) - Number(bv)) * mul;
  });
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  return {
    title: `${tr.nav.rent} · ${tr.nav.sail}`,
    description: tr.boats.subtitle,
  };
}

export default async function RentSailPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;

  const marinaRaw = Array.isArray(sp["marina"])
    ? (sp["marina"] as string[])[0]
    : (sp["marina"] as string | undefined);
  const marina = normalizeMarinaSlug(marinaRaw);

  const priceHourRaw = Array.isArray(sp["priceHour"])
    ? (sp["priceHour"] as string[])[0]
    : (sp["priceHour"] as string | undefined);
  const priceHourSort = normalizePriceSort(priceHourRaw);

  const locations = await fetchLocations(lang);
  const boats = await fetchBoats(lang, {
    listingType: "rent",
    vesselType: "sailboat",
    homeMarinaSlug: marina || null,
  });

  const boatsSorted: Boat[] = priceHourSort
    ? sortByNullableNumberNullsFirst(boats, "price_per_hour", priceHourSort)
    : boats;

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">
            {tr.nav.rent} · {tr.nav.sail}
          </h1>
          <p className="kicker">{formatCount(lang, boatsSorted.length)}</p>
        </div>

        {(() => {
          const marinaLabel =
            lang === "ru" ? "Марина" : lang === "me" ? "Marina" : "Marina";
          const allLabel =
            lang === "ru" ? "Все" : lang === "me" ? "Sve" : "All";
          const filterLabel =
            lang === "ru" ? "Фильтр" : lang === "me" ? "Filter" : "Filter";

          const priceLabel =
            lang === "ru"
              ? "Цена/час"
              : lang === "me"
                ? "Cijena/sat"
                : "Price/hour";
          const priceAnyLabel =
            lang === "ru" ? "Любая" : lang === "me" ? "Bilo koja" : "Any";
          const priceAscLabel =
            lang === "ru"
              ? "Сначала ниже"
              : lang === "me"
                ? "Niza prvo"
                : "Lower first";
          const priceDescLabel =
            lang === "ru"
              ? "Сначала выше"
              : lang === "me"
                ? "Visa prvo"
                : "Higher first";

          return (
            <form method="GET" className="mb-4 flex items-center gap-2">
              <label className="text-sm">{marinaLabel}:</label>
              <select
                name="marina"
                defaultValue={marina ?? ""}
                style={{ colorScheme: "light dark" }} className="h-9 rounded-md border px-2 text-sm bg-white text-black border-black/20 dark:bg-zinc-900 dark:text-white dark:border-white/20"
              >
                <option value="">{allLabel}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.slug}>
                    {l.name ?? l.slug}
                  </option>
                ))}
              </select>

              <label className="text-sm">{priceLabel}:</label>
              <select
                name="priceHour"
                defaultValue={priceHourSort ?? ""}
                style={{ colorScheme: "light dark" }} className="h-9 rounded-md border px-2 text-sm bg-white text-black border-black/20 dark:bg-zinc-900 dark:text-white dark:border-white/20"
                aria-label={priceLabel}
              >
                <option value="">{priceAnyLabel}</option>
                <option value="asc">{priceAscLabel}</option>
                <option value="desc">{priceDescLabel}</option>
              </select>

              <button
                type="submit"
                className="h-9 rounded-full border border-black/[.12] px-4 text-sm hover:bg-black/[.04] dark:border-white/[.18] dark:hover:bg-white/[.06]"
              >
                {filterLabel}
              </button>
            </form>
          );
        })()}

        {boatsSorted.length === 0 ? (
          <p className="kicker">{tr.boats.empty}</p>
        ) : (
          <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {boatsSorted.map((b) => {
              const cardImg = getBoatCardImage(b);
              return (
                <li key={b.id} className="card">
                  <Link
                    className="card-link"
                    href={`/${lang}/boats/${encodeURIComponent(b.slug ?? String(b.id))}`}
                  >
                    {cardImg?.src ? (
                      <div className="card-media">
                        <Image
                          src={cardImg.src}
                          alt={cardImg.alt ?? b.title ?? "Boat"}
                          fill
                          sizes="(max-width: 900px) 100vw, 900px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      <div className="card-media" />
                    )}

                    <div className="card-body">
                      <h3 className="card-title">{b.title ?? `Boat #${b.id}`}</h3>

                      <p className="card-sub">
                        <span>
                          {tr.boat.type}: {b.boat_type ?? "—"}
                        </span>
                        <span>·</span>
                        <span>
                          {tr.boat.capacity}: {b.capacity ?? "—"}
                        </span>
                      </p>

                      {(b.price_per_hour || b.price_per_day) && (
                        <p className="card-sub">
                          {b.price_per_hour ? (
                            <span>€{b.price_per_hour} / hour</span>
                          ) : (
                            <span>€{b.price_per_day} / day</span>
                          )}
                          {b.deposit && (
                            <>
                              <span> · </span>
                              <span>Deposit €{b.deposit}</span>
                            </>
                          )}
                        </p>
                      )}

                      <div className="card-bottom">
                        <span className="pill">{tr.boat.view_details} →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
