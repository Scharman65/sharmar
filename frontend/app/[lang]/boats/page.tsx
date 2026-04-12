import Link from "next/link";
import Image from "next/image";
import { getBoatCardImage } from "@/lib/media";
import type { Metadata } from "next";
import { fetchBoats } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ marina?: string; listing?: string; type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  return { title: tr.nav.boats, description: tr.boats.subtitle };
}

export default async function BoatsPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  const marinaLabel = lang === "ru" ? "Марина" : "Marina";
  const sp = (await searchParams) ?? {};
  const marina = typeof sp.marina === "string" ? sp.marina.trim() : "";
  const listingRaw = typeof sp.listing === "string" ? sp.listing.trim() : "";
  const listing = listingRaw === "rent" || listingRaw === "sale" ? listingRaw : "";
  const typeRaw = typeof sp.type === "string" ? sp.type.trim() : "";
  const boatType =
    typeRaw === "motor"
      ? "Motorboat"
      : typeRaw === "sail"
        ? "Sailboat"
        : typeRaw === "catamaran"
          ? "Catamaran"
          : "";

  const boats = await fetchBoats(
    lang,
    marina || listing || boatType
      ? {
          ...(marina ? { homeMarinaSlug: marina } : {}),
          ...(listing ? { listingType: listing } : {}),
          ...(boatType ? { boatType } : {}),
        }
      : undefined,
  );

  const resetHref = `/${lang}/boats`;
  const activeFilters: string[] = [];
  if (listing) activeFilters.push(`${lang === "ru" ? "Сделка" : "Listing"}: ${listing}`);
  if (typeRaw) activeFilters.push(`${lang === "ru" ? "Тип" : "Type"}: ${typeRaw}`);
  if (marina) activeFilters.push(`${marinaLabel}: ${marina}`);

  const resetLabel =
    lang === "ru"
      ? "Сбросить фильтры"
      : lang === "me"
        ? "Resetuj filtere"
        : "Reset filters";

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">{tr.nav.boats}</h1>
          <p className="kicker">{formatCount(lang, boats.length)}</p>
        </div>

        {activeFilters.length > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {activeFilters.map((item) => (
                <span
                  key={item}
                  className="badge"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {item}
                </span>
              ))}
            </div>

            <Link
              href={resetHref}
              className="nav-button"
              style={{ whiteSpace: "nowrap" }}
            >
              {resetLabel}
            </Link>
          </div>
        ) : null}

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

                    <p className="card-sub" data-testid="boat-home-marina">
                      <span>
                        {marinaLabel}: {b.homeMarina?.name ?? "—"}
                        {b.homeMarina?.region
                          ? ` (${b.homeMarina.region})`
                          : ""}
                      </span>
                    </p>

                    {b.purposes?.length ? (
                      <div className="badges">
                        {b.purposes.map((p) => (
                          <span className="badge" key={p.id}>
                            {p.title ?? `Purpose #${p.id}`}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="card-bottom">
                      <span className="kicker">
                        {b.license_required
                          ? tr.boat.license_required
                          : tr.boat.license_not_required}
                        {" · "}
                        {b.skipper_available
                          ? tr.boat.skipper_available
                          : tr.boat.skipper_not_available}
                      </span>
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
