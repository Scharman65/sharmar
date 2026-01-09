export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchBoatBySlug } from "@/lib/strapi";
import { isLang, t, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const strapiLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const boat = await fetchBoatBySlug(slug, strapiLocale);


  if (!boat) {
    return { title: "Boat not found" };
  }

  const title = boat.title ?? slug;
  const description = (boat.description ?? "").trim() || t(lang).boats.no_description;

  return { title, description };
}

export default async function BoatPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const tr = t(lang);

  const strapiLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const boat = await fetchBoatBySlug(slug, strapiLocale);

  if (!boat) {
    return (
      <main className="main">

        <div className="container">
          <div className="detail-top">
            <h1 className="h1">Boat not found</h1>
            <Link className="backlink" href={`/${lang}/boats`}>
              ← {tr.boat.back_to_list}
            </Link>
          </div>
          <p className="kicker">Slug: {slug}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container">
        <div className="detail-top">
          <h1 className="h1">{boat.title ?? slug}</h1>
          <Link className="backlink" href={`/${lang}/boats`}>
            ← {tr.boat.back_to_list}
          </Link>
        </div>

        {boat.cover?.url ? (
          <div className="hero">
            <Image
              src={boat.cover.url}
              alt={boat.cover.alternativeText ?? boat.title ?? "Boat"}
              fill
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        ) : null}

        <div className="meta-row">
          <span>
            {tr.boat.type}: {boat.boat_type ?? "—"}
          </span>
          <span>·</span>
          <span>
            {tr.boat.capacity}: {boat.capacity ?? "—"}
          </span>
          <span>·</span>
          <span>
            {boat.license_required ? tr.boat.license_required : tr.boat.license_not_required}
          </span>
          <span>·</span>
          <span>
            {boat.skipper_available ? tr.boat.skipper_available : tr.boat.skipper_not_available}
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          {boat.description?.trim() ? (
            <p style={{ lineHeight: 1.7, margin: 0 }}>{boat.description}</p>
          ) : (
            <p className="kicker">{tr.boats.no_description}</p>
          )}
        </div>

        {boat.purposes?.length ? (
          <div style={{ marginTop: 18 }}>
            <p className="kicker" style={{ marginBottom: 10 }}>
              {tr.boat.purposes}
            </p>
            <div className="badges">
              {boat.purposes.map((p) => (
                <span className="badge" key={p.id}>
                  {p.title ?? `Purpose #${p.id}`}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="actions">
          <Link
            className="button"
            href={`/${lang}/request?slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(
              boat.title ?? slug
            )}`}
          >
            {tr.booking.requestThisBoat}
          </Link>

          <Link className="button secondary" href={`/${lang}/boats`}>
            {tr.boat.back_to_list}
          </Link>
        </div>
      </div>
    </main>
  );
}
