import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { fetchBoats } from "@/lib/strapi";
import { isLang, t, formatCount, type Lang } from "@/i18n";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);
  return { title: tr.nav.boats, description: tr.boats.subtitle };
}

export default async function BoatsPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  const marinaLabel = lang === "ru" ? "Марина" : "Marina";

  const boats = await fetchBoats(lang);

  return (
    <main className="main">
      <div className="container">
        <div className="page-top">
          <h1 className="h1">{tr.nav.boats}</h1>
          <p className="kicker">{formatCount(lang, boats.length)}</p>
        </div>

        {boats.length === 0 ? (
          <p className="kicker">{tr.boats.empty}</p>
        ) : (
          <ul
            className="grid"
            style={{ listStyle: "none", padding: 0, margin: 0 }}
          >
            {boats.map((b) => (
              <li key={b.id} className="card">
                <Link
                  className="card-link"
                  href={`/${lang}/boats/${encodeURIComponent(b.slug ?? String(b.id))}`}
                >
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
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
