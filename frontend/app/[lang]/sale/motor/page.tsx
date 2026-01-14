import type { Metadata } from "next";
import { fetchBoats, fetchLocations } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";
import Link from "next/link";
import Image from "next/image";

import { getBoatCardImage } from "@/lib/media";
function normalizeMarinaSlug(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return v.replace(/^marina-/, "");
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
    title: `${tr.nav.sale} · ${tr.nav.motor}`,
    description: tr.boats.subtitle,
  };
}

export default async function SaleMotorPage({ params, searchParams }: Props) {
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
  const locations = await fetchLocations(lang);
  const boats = await fetchBoats(lang, {
    listingType: "sale",
    vesselType: "motorboat",
    homeMarinaSlug: marina || null,
  });

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">
            {tr.nav.sale} · {tr.nav.motor}
          </h1>
          <p className="kicker">{formatCount(lang, boats.length)}</p>
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
                className="h-9 rounded-md border border-black/[.12] px-2 text-sm dark:border-white/[.18] bg-transparent"
              >
                <option value="">{allLabel}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.slug}>
                    {l.name ?? l.slug}
                  </option>
                ))}
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

        {boats.length === 0 ? (
          <p className="kicker">{tr.boats.empty}</p>
        ) : (
          <ul
            className="grid"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {boats.map((b) => {
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
                        src={cardImg?.src ?? b.cover.url}
                        alt={cardImg?.alt ?? b.cover.alternativeText ?? b.title ?? "Boat"}
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
