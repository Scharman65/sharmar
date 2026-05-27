import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Lang } from "@/i18n";
import { MARINAS, type MarinaDefinition } from "@/data/marinas";
import { fetchBoats, type Boat } from "@/lib/strapi";
import { getBoatCardImage } from "@/lib/media";

type PageProps = {
  params: Promise<{
    lang: Lang;
    slug: string;
  }>;
};

function getMarina(slug: string) {
  return MARINAS.find((marina) => marina.slug === slug) ?? null;
}

function getRelatedMarinas(currentMarina: MarinaDefinition): MarinaDefinition[] {
  return MARINAS.filter((marina) => marina.slug !== currentMarina.slug)
    .map((marina, index) => {
      const sameCountry = marina.country === currentMarina.country;
      const sameRegion = Boolean(currentMarina.region) && marina.region === currentMarina.region;

      return {
        marina,
        index,
        score: (sameCountry ? 2 : 0) + (sameRegion ? 1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .map(({ marina }) => marina);
}

function money(value: number | null | undefined, currency = "EUR"): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value.toLocaleString("en-US")} ${currency}`.trim();
}

function getBoatPrice(boat: Boat): string | null {
  const currency = boat.currency ?? "EUR";

  if (boat.sale_price != null) return money(boat.sale_price, currency);
  if (boat.price_per_hour != null) return `${money(boat.price_per_hour, currency)} / hour`;
  if (boat.price_per_day != null) return `${money(boat.price_per_day, currency)} / day`;
  if (boat.price_per_week != null) return `${money(boat.price_per_week, currency)} / week`;

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const marina = getMarina(slug);

  if (!marina) {
    return {
      title: "Marina not found | Sharmar",
    };
  }

  return {
    title: marina.seoTitle,
    description: marina.seoDescription,
  };
}

export default async function MarinaPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const marina = getMarina(slug);

  if (!marina) notFound();

  const boats = await fetchBoats(lang, { homeMarinaSlug: slug }).catch(() => []);
  const relatedMarinas = getRelatedMarinas(marina);

  const rentLinks = [
    { href: `/${lang}/rent/motor`, label: "Motor yachts" },
    { href: `/${lang}/rent/catamaran`, label: "Catamarans" },
    { href: `/${lang}/rent/sail`, label: "Sailing boats" },
  ];

  const saleLinks = [
    { href: `/${lang}/sale/motor`, label: "Motor boats for sale" },
    { href: `/${lang}/sale/catamaran`, label: "Catamarans for sale" },
    { href: `/${lang}/sale/sail`, label: "Sailing boats for sale" },
  ];

  return (
    <main className="main">
      <div className="container">
        <Link className="backlink" href={`/${lang}/boats`}>
          ← Back to boats
        </Link>

        <section className="marina-hero">
          <p className="kicker">{marina.region}</p>
          <h1>{marina.title}</h1>
          <p className="marina-description">{marina.description}</p>

          <div className="marina-meta">
            <span>{marina.city}</span>
            <span>{marina.country}</span>
            <span>Mediterranean marketplace</span>
          </div>
        </section>

        <section className="marina-grid" aria-label="Marina marketplace sections">
          <article className="marina-card">
            <p className="kicker">Rent boats</p>
            <h2>Charter from {marina.title}</h2>
            <p>
              Discover available motor yachts, catamarans, and sailing boats connected to this marina.
            </p>
            <div className="link-list">
              {rentLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label} →
                </Link>
              ))}
            </div>
          </article>

          <article className="marina-card">
            <p className="kicker">Buy boats</p>
            <h2>Boats for sale near {marina.city}</h2>
            <p>
              Browse premium sale listings and future owner opportunities around this marina.
            </p>
            <div className="link-list">
              {saleLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label} →
                </Link>
              ))}
            </div>
          </article>

          <article className="marina-card">
            <p className="kicker">For owners</p>
            <h2>List your yacht in {marina.city}</h2>
            <p>
              Sharmar helps owners receive structured booking requests, protect availability, and grow visibility.
            </p>
            <Link className="button" href={`/${lang}/add/rent/motor`}>
              Add your boat
            </Link>
          </article>
        </section>

        <section className="marina-boats" aria-labelledby="marina-boats-title">
          <div className="marina-section-top">
            <h2 id="marina-boats-title">Available boats in this marina</h2>
            <p className="kicker">{boats.length ? `${boats.length} available` : "No boats currently listed"}</p>
          </div>

          {boats.length === 0 ? (
            <p className="marina-empty">No boats are currently listed for this marina.</p>
          ) : (
            <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {boats.map((boat) => {
                const cardImg = getBoatCardImage(boat);
                const price = getBoatPrice(boat);

                return (
                  <li key={boat.id} className="card">
                    <Link className="card-link" href={`/${lang}/boats/${encodeURIComponent(boat.slug ?? String(boat.id))}`}>
                      {cardImg?.src ? (
                        <div className="card-media">
                          <Image
                            src={cardImg.src}
                            alt={cardImg.alt ?? boat.title ?? "Boat"}
                            fill
                            sizes="(max-width: 900px) 100vw, 900px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                      ) : (
                        <div className="card-media" />
                      )}

                      <div className="card-body">
                        <h3 className="card-title">{boat.title ?? `Boat #${boat.id}`}</h3>
                        <p className="card-sub">
                          <span>Type: {boat.boat_type ?? boat.vesselType ?? "—"}</span>
                        </p>
                        {price ? (
                          <p className="card-sub">
                            <span>{price}</span>
                          </p>
                        ) : null}
                        <div className="card-bottom">
                          <span className="pill">View details →</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {relatedMarinas.length > 0 ? (
          <section className="related-marinas" aria-labelledby="related-marinas-title">
            <div className="marina-section-top">
              <h2 id="related-marinas-title">Explore nearby marinas</h2>
            </div>

            <ul className="related-marina-grid">
              {relatedMarinas.map((relatedMarina) => (
                <li key={relatedMarina.slug} className="related-marina-card">
                  <Link href={`/${lang}/marina/${relatedMarina.slug}`}>
                    <p className="kicker">
                      {relatedMarina.city}, {relatedMarina.country}
                    </p>
                    <h3>{relatedMarina.title}</h3>
                    <p>{relatedMarina.seoDescription}</p>
                    <span>View marina →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="marina-seo">
          <h2>Yacht rentals and boats in {marina.title}</h2>
          <p>
            {marina.title} is part of Sharmar&apos;s Mediterranean marina network, designed for premium yacht
            discovery, structured booking requests, and owner-confirmed reservations.
          </p>
          <p>
            This page connects marina discovery with boat rentals, yacht sales, and future localized marketplace
            content for {marina.city}, {marina.country}.
          </p>
        </section>
      </div>

      <style>{`
        .marina-hero {
          margin-top: 22px;
          max-width: 920px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
        }

        .marina-hero h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 7vw, 64px);
          line-height: 0.98;
          letter-spacing: -0.05em;
        }

        .marina-description {
          max-width: 700px;
          margin: 18px 0 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: 18px;
          line-height: 1.55;
        }

        .marina-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .marina-meta span {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.06);
          font-size: 13px;
          font-weight: 800;
        }

        .marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
          max-width: 1100px;
        }

        .marina-card,
        .marina-seo {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
        }

        .marina-card h2,
        .marina-seo h2 {
          margin: 6px 0 0;
          line-height: 1.15;
        }

        .marina-card p,
        .marina-seo p {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .link-list {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .link-list a {
          color: inherit;
          text-decoration: none;
          font-weight: 800;
        }

        .link-list a:hover {
          text-decoration: underline;
        }

        .marina-seo {
          margin-top: 18px;
          max-width: 920px;
        }

        .marina-boats {
          margin-top: 22px;
          max-width: 1100px;
        }

        .related-marinas {
          margin-top: 22px;
          max-width: 1100px;
        }

        .marina-section-top {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .marina-section-top h2 {
          margin: 0;
          line-height: 1.15;
        }

        .marina-empty {
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.66);
        }

        .related-marina-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .related-marina-card a {
          display: block;
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 18px;
          background: rgba(255,255,255,0.045);
          color: inherit;
          text-decoration: none;
        }

        .related-marina-card a:hover {
          border-color: rgba(255, 255, 255, 0.24);
        }

        .related-marina-card h3 {
          margin: 6px 0 0;
          line-height: 1.15;
        }

        .related-marina-card p {
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
        }

        .related-marina-card span {
          display: inline-block;
          margin-top: 4px;
          font-weight: 800;
        }

        @media (max-width: 840px) {
          .marina-hero {
            padding: 20px;
            border-radius: 18px;
          }

          .marina-grid {
            grid-template-columns: 1fr;
          }

          .related-marina-grid {
            grid-template-columns: 1fr;
          }

          .marina-section-top {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}
