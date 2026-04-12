/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/i18n";
import { fetchLocations } from "@/lib/strapi";

type Location = {
  id: number;
  slug: string;
  name: string | null;
};

export default function HeaderMarinaFilter({ lang }: { lang: Lang }) {
  const router = useRouter();
  const pathname = usePathname() || `/${lang}/boats`;
  const sp = useSearchParams();

  const marina = sp?.get("marina") ?? "";
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const rowsRaw = await fetchLocations(lang);
        const rows: Location[] = (rowsRaw ?? [])
          .filter((l: any) => l?.slug)
          .map((l: any) => ({
            id: l.id,
            slug: String(l.slug),
            name: (l.name ?? null) as string | null,
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
  }, [lang]);

  const label =
    lang === "ru" ? "Марина" : lang === "me" ? "Marina" : "Marina";
  const allLabel =
    lang === "ru" ? "Все локации" : lang === "me" ? "Sve lokacije" : "All locations";

  return (
    <div className="flex items-center gap-2" data-testid="header-marina-filter">
      <label className="text-sm" htmlFor="header-marina-select">
        {label}:
      </label>

      <select
        id="header-marina-select"
        value={marina}
        onChange={(e) => {
          const next = e.target.value || "";
          const nextParams = new URLSearchParams(sp?.toString() ?? "");

          if (next) nextParams.set("marina", next);
          else nextParams.delete("marina");

          const qs = nextParams.toString();
          router.push(qs ? `/${lang}/boats?${qs}` : `/${lang}/boats`);
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
