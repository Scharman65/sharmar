import type { Metadata } from "next";
import { fetchBoats } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  return {
    title: `${tr.nav.sale} · ${tr.nav.sail}`,
    description: tr.boats.subtitle,
  };
}

export default async function SaleSailPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  const boats = await fetchBoats(lang, {
    listingType: "sale",
    vesselType: "sailboat",
  });

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">
            {tr.nav.sale} · {tr.nav.sail}
          </h1>
          <p className="kicker">{formatCount(lang, boats.length)}</p>
        </div>

        {boats.length === 0 ? (
          <p className="kicker">{tr.boats.empty}</p>
        ) : (
          <ul className="grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {boats.map((b) => (
              <li key={b.id} className="card">
                <Link className="card-link" href={`/${lang}/boats/${encodeURIComponent(b.slug ?? String(b.id))}`}>
                  {b.cover?.url ? (
                    <div className="card-media">
                      <Image
                        src={b.cover.url}
                        alt={b.cover.alternativeText ?? b.title ?? "Boat"}
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
                      <span>{tr.boat.type}: {b.boat_type ?? "—"}</span>
                      <span>·</span>
                      <span>{tr.boat.capacity}: {b.capacity ?? "—"}</span>
                    </p>

                    <div className="card-bottom">
                      <span className="pill">{tr.boat.view_details} →</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
