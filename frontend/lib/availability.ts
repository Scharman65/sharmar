import type { Lang } from "@/i18n";

export type AvailabilitySlot = {
  slot_start_utc: string;
  slot_end_utc: string;
};

export type AvailabilityResponse = {
  ok: true;
  boatId: number;
  listing_type: "rent" | "sale";
  timezone: string;
  from: string;
  to: string;
  stepMinutes: number;
  data: AvailabilitySlot[];
};

function isoDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUTC(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function getApiBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || "";
  if (v) return v.replace(/\/+$/, "");
  return "https://api.sharmar.me";
}

export type FetchAvailabilityOpts = {
  from?: string;
  to?: string;
  stepMinutes?: number;
};

export async function fetchAvailability(
  lang: Lang,
  boatId: number,
  opts: FetchAvailabilityOpts = {}
): Promise<AvailabilityResponse | null> {
  if (!Number.isFinite(boatId) || boatId <= 0) return null;

  const stepMinutes = opts.stepMinutes ?? 60;

  const today = new Date();
  const from = opts.from ?? isoDateUTC(today);
  const to = opts.to ?? isoDateUTC(addDaysUTC(today, 14));

  const base = getApiBaseUrl();
  const url =
    `${base}/api/availability/${boatId}` +
    `?from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}` +
    `&step=${encodeURIComponent(String(stepMinutes))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "accept-language": lang,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) return null;

  const json = (await res.json()) as any;
  if (!json || json.ok !== true) return null;

  return json as AvailabilityResponse;
}
