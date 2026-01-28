/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/i18n";
import { fetchLocations } from "@/lib/strapi";
type Location = { id: number; slug: string; name: string | null };

function isRentOrSale(pathname: string): "rent" | "sale" | null {
  const p = pathname || "";
  if (p.includes("/rent/")) return "rent";
  if (p.includes("/sale/")) return "sale";
  return null;
}

export default function HeaderMarinaFilter({ lang }: { lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname() || `/${lang}/boats`;
  const sp = useSearchParams();

  const mode = useMemo(() => isRentOrSale(pathname), [pathname]);
  const marina = sp?.get("marina") ?? "";

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mode) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("sort", "slug:asc");
        qs.set("pagination[pageSize]", "200");
        qs.set("fields[0]", "name");
        qs.set("fields[1]", "slug");

        const rowsRaw = await fetchLocations(lang);
        const rows: Location[] = (rowsRaw ?? []).map((l: any) => ({
          id: l.id,
          slug: l.slug,
          name: (l.name ?? null) as (string | null),
        }));

        if (alive) setLocations(rows);
      } catch {
        if (alive) setLocations([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [lang, mode]);

  if (!mode) return null;

  const label = lang === "ru" ? "Марина" : "Marina";
  const allLabel = lang === "ru" ? "Все" : lang === "me" ? "Sve" : "All";

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm">{label}:</label>

      <select
        value={marina}
        onChange={(e) => {
          const next = e.target.value || "";
          const nextParams = new URLSearchParams(sp?.toString() ?? "");
          if (next) nextParams.set("marina", next);
          else nextParams.delete("marina");

          const qs = nextParams.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="h-9 rounded-md border border-black/[.12] px-2 text-sm dark:border-white/[.18] bg-white text-black dark:bg-transparent dark:text-white"
        aria-label="Marina"
      >
        <option value="">{loading ? "…" : allLabel}</option>
        {locations.map((l) => (
          <option key={l.id} value={l.slug}>
            {l.name ?? l.slug}
          </option>
        ))}
      </select>
    </div>
  );
}
