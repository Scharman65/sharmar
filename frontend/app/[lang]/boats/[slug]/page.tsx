/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";
import { getBoatCardImage } from "@/lib/media";
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
  const description =
    (boat.description ?? "").trim() || t(lang).boats.no_description;

  return { title, description };
}

export default async function BoatPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const tr = t(lang);

  const marinaLabel = lang === "ru" ? "Марина" : "Marina";


  const specsLabel = lang === "ru" ? "Характеристики" : "Specifications";
  const saleLabel = lang === "ru" ? "Продажа" : "Sale";
  const rentLabel = lang === "ru" ? "Аренда" : "Rent";

  const fmtMoney = (v: unknown) => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return null;
    return `${n} ${boat?.currency ?? ""}`.trim();
  };

  const rows: Array<{ label: string; value: string }> = [];
  const add = (
    label: string,
    value: unknown,
    fmt: (x: unknown) => string | null = (x) => {
      if (x === null || x === undefined) return null;
      const t = String(x).trim();
      return t ? t : null;
    },
  ) => {
    const v = fmt(value);
    if (v) rows.push({ label, value: v });
  };
  const strapiLocale = lang === "me" ? "sr-Latn-ME" : lang;
  const boat = await fetchBoatBySlug(slug, strapiLocale);


  const heroImg = getBoatCardImage(boat);
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

        {heroImg ? (
          <div className="hero">
            <Image
              src={heroImg.src}
              alt={heroImg.alt}
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
          <span data-testid="boat-home-marina">
            {marinaLabel}: {boat.homeMarina?.name ?? "—"}
            {boat.homeMarina?.region ? ` (${boat.homeMarina.region})` : ""}
          </span>
          <span>·</span>
          <span>
            {boat.license_required
              ? tr.boat.license_required
              : tr.boat.license_not_required}
          </span>
          <span>·</span>
          <span>
            {boat.skipper_available
              ? tr.boat.skipper_available
              : tr.boat.skipper_not_available}
          </span>
        </div>

        {(() => {
          rows.length = 0;

          add(lang === "ru" ? "Тип" : "Type", boat.boat_type ?? boat.vesselType ?? null);
          add(lang === "ru" ? "Вместимость" : "Capacity", boat.capacity, (x) => (x === null || x === undefined) ? null : `${x}`);
          add(lang === "ru" ? "Марина" : "Marina", (boat as any).home_marina?.name ?? boat.homeMarina?.name ?? null);
          add(lang === "ru" ? "Длина" : "Length", ((boat as any).length_m ?? (boat as any).lengthM ?? boat.length_m ?? null), (x) => (x === null || x === undefined) ? null : `${x} m`);
          add(lang === "ru" ? "Мощность двигателя" : "Engine power", ((boat as any).engine_hp ?? (boat as any).engineHp ?? boat.engine_hp ?? null), (x) => (x === null || x === undefined) ? null : `${x} hp`);

          const listing = (boat as any).listing_type ?? null;

          if (listing === "sale") {
            add(lang === "ru" ? "Год" : "Year", (boat as any).year ?? null);
          }

          if (listing === "rent") {
            add(lang === "ru" ? "Цена/час" : "Price/hour", (boat as any).price_per_hour ?? null, fmtMoney);
            add(lang === "ru" ? "Цена/день" : "Price/day", (boat as any).price_per_day ?? null, fmtMoney);
            add(lang === "ru" ? "Цена/неделя" : "Price/week", (boat as any).price_per_week ?? null, fmtMoney);
            add(lang === "ru" ? "Депозит" : "Deposit", (boat as any).deposit ?? null, fmtMoney);

            add(lang === "ru" ? "Шкипер/час" : "Skipper/hour", (boat as any).skipper_price_per_hour ?? null, fmtMoney);
            add(lang === "ru" ? "Шкипер/день" : "Skipper/day", (boat as any).skipper_price_per_day ?? null, fmtMoney);
          }

          add(
            lang === "ru" ? "Лицензия" : "License",
            boat.license_required === true
              ? (lang === "ru" ? "Требуется" : "Required")
              : boat.license_required === false
                ? (lang === "ru" ? "Не требуется" : "Not required")
                : null,
          );

          add(
            lang === "ru" ? "Шкипер" : "Skipper",
            boat.skipper_available === true
              ? (lang === "ru" ? "Доступен" : "Available")
              : boat.skipper_available === false
                ? (lang === "ru" ? "Недоступен" : "Not available")
                : null,
          );

          if (!rows.length) return null;

          return (
            <div style={{ marginTop: 18 }}>
              <p className="kicker" style={{ marginBottom: 10 }}>
                {specsLabel}
                {listing ? (
                  <span style={{ marginLeft: 10, opacity: 0.7 }}>
                    · {listing === "sale" ? saleLabel : listing === "rent" ? rentLabel : String(listing)}
                  </span>
                ) : null}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {rows.map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ opacity: 0.8 }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
              boat.title ?? slug,
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
