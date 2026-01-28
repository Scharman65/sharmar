/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import { fetchBoats, fetchLocations, type Boat } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";
import Link from "next/link";
import Image from "next/image";

import { getBoatCardImage } from "@/lib/media";
import { CATEGORIES } from "@/lib/categories";

function normalizeMarinaSlug(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return v.replace(/^marina-/, "");
}

function normalizeSort(v: unknown): "asc" | "desc" | null {
  if (v === "asc" || v === "desc") return v;
  return null;
}

function sortByNullableNumberNullsFirst<T extends Record<string, any>>(
  rows: T[],
  key: string,
  dir: "asc" | "desc",
): T[] {
  const out = [...rows];
  out.sort((a, b) => {
    const av = (a as any)?.[key] ?? null;
    const bv = (b as any)?.[key] ?? null;

    if (av === null && bv === null) return 0;
    if (av === null) return -1;
    if (bv === null) return 1;

    return dir === "asc" ? av - bv : bv - av;
  });
  return out;
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

  const def = CATEGORIES["sale/catamaran"];
  const catLabel =
    lang === "ru" ? "Катамаран" : lang === "me" ? "Catamaran" : "Catamaran";

  const baseBoats = await fetchBoats(lang, {
    listingType: def.listingType,
    ...(def.vesselType ? { vesselType: def.vesselType } : {}),
    ...(def.boatType ? { boatType: def.boatType } : {}),
    homeMarinaSlug: null,
  });

  const isEmpty = baseBoats.length === 0;

  return {
    title: `${tr.nav.sale} · ${catLabel}`,
    description: tr.boats.subtitle,
    robots: isEmpty ? { index: false, follow: true } : { index: true, follow: true },
  };
}


export default async function SaleCatamaranPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  const catLabel =
    lang === "ru" ? "Катамаран" : lang === "me" ? "Catamaran" : "Catamaran";
  const sp = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;

  const priceSaleRaw = Array.isArray(sp["priceSale"])
    ? (sp["priceSale"] as string[])[0]
    : (sp["priceSale"] as string | undefined);
  const priceSaleSort = normalizeSort(priceSaleRaw);

  const marinaRaw = Array.isArray(sp["marina"])
    ? (sp["marina"] as string[])[0]
    : (sp["marina"] as string | undefined);
  const marina = normalizeMarinaSlug(marinaRaw);

  const locations = await fetchLocations(lang);

  const boats = await fetchBoats(lang, {
    listingType: "sale",
    boatType: "Catamaran",
    homeMarinaSlug: marina || null,
  });

  const boatsSorted: Boat[] = priceSaleSort
    ? sortByNullableNumberNullsFirst(boats, "sale_price", priceSaleSort)
    : boats;

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">
            {tr.nav.sale} · {catLabel}
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

              {(() => {
                const priceLabel =
                  lang === "ru" ? "Цена" : lang === "me" ? "Price" : "Price";
                const anyLabel =
                  lang === "ru" ? "Любая" : lang === "me" ? "Any" : "Any";
                const upLabel =
                  lang === "ru"
                    ? "По возрастанию"
                    : lang === "me"
                      ? "Asc"
                      : "Asc";
                const downLabel =
                  lang === "ru" ? "По убыванию" : lang === "me" ? "Desc" : "Desc";
                return (
                  <>
                    <label className="text-sm">{priceLabel}:</label>
                    <select
                      name="priceSale"
                      defaultValue={priceSaleSort ?? ""}
                      style={{ colorScheme: "light dark" }} className="h-9 rounded-md border px-2 text-sm bg-white text-black border-black/20 dark:bg-zinc-900 dark:text-white dark:border-white/20"
                      aria-label="Price"
                    >
                      <option value="">{anyLabel}</option>
                      <option value="asc">{upLabel}</option>
                      <option value="desc">{downLabel}</option>
                    </select>
                  </>
                );
              })()}

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
                    href={`/${lang}/boats/${encodeURIComponent(b.slug)}`}
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

                      <p className="card-sub">
                        <span>
                          {lang === "ru" ? "Бренд" : lang === "me" ? "Brand" : "Brand"}:{" "}
                          {(b as any).brand?.name ??
                            (b as any).brand?.title ??
                            (b as any).builder?.name ??
                            (b as any).builder?.title ??
                            "—"}
                        </span>
                        <span>·</span>
                        <span>
                          {lang === "ru" ? "Год" : lang === "me" ? "Year" : "Year"}:{" "}
                          {(b as any).year ?? "—"}
                        </span>
                        <span>·</span>
                        <span>
                          {lang === "ru" ? "Длина" : lang === "me" ? "Length" : "Length"}:{" "}
                          {(b as any).length_m !== null && (b as any).length_m !== undefined
                            ? `${(b as any).length_m} m`
                            : "—"}
                        </span>
                      </p>

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
