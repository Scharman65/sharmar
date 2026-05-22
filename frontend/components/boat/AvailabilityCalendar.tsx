"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/availability";
import type { Lang } from "@/i18n";
import type { Boat } from "@/lib/strapi";

type AvailabilityCalendarProps = {
  lang: Lang;
  availability: AvailabilityResponse | null;
  boat: Boat;
  slug: string;
  requestSlotLabel: string;
  availabilityTitle: string;
  availabilityEmpty: string;
  availabilityUnavailable: string;
};

type SlotGroup = {
  key: string;
  dayName: string;
  dateLabel: string;
  slots: AvailabilitySlot[];
};

function localeForLang(lang: Lang): string {
  if (lang === "ru") return "ru-RU";
  if (lang === "me") return "sr-Latn-ME";
  return "en-US";
}

function datePartsForSlot(slot: AvailabilitySlot, timeZone: string, lang: Lang) {
  const locale = localeForLang(lang);
  const start = new Date(slot.slot_start_utc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(start);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const key = `${get("year")}-${get("month")}-${get("day")}`;

  return {
    key,
    dayName: new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "short",
    }).format(start),
    dateLabel: new Intl.DateTimeFormat(locale, {
      timeZone,
      month: "short",
      day: "numeric",
    }).format(start),
  };
}

function formatSlotTime(slot: AvailabilitySlot, timeZone: string, lang: Lang): string {
  const locale = localeForLang(lang);
  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${fmt.format(new Date(slot.slot_start_utc))}-${fmt.format(new Date(slot.slot_end_utc))}`;
}

function groupSlots(slots: AvailabilitySlot[], timeZone: string, lang: Lang): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();

  [...slots]
    .sort((a, b) => Date.parse(a.slot_start_utc) - Date.parse(b.slot_start_utc))
    .forEach((slot) => {
      const parts = datePartsForSlot(slot, timeZone, lang);
      const current = groups.get(parts.key);

      if (current) {
        current.slots.push(slot);
      } else {
        groups.set(parts.key, {
          ...parts,
          slots: [slot],
        });
      }
    });

  return Array.from(groups.values());
}

function slotKey(slot: AvailabilitySlot): string {
  return `${slot.slot_start_utc}-${slot.slot_end_utc}`;
}

function buildRequestHref(lang: Lang, boat: Boat, slug: string, slot: AvailabilitySlot): string {
  const params = new URLSearchParams({
    boatId: String(boat.id),
    boatSlug: slug,
    boatTitle: boat.title ?? slug,
    slug,
    title: boat.title ?? slug,
    currency: String(boat.currency ?? "EUR"),
    slot_start_utc: slot.slot_start_utc,
    slot_end_utc: slot.slot_end_utc,
  });

  if (boat.price_per_hour !== null && boat.price_per_hour !== undefined) {
    params.set("pph", String(boat.price_per_hour));
  }
  if (boat.price_per_day !== null && boat.price_per_day !== undefined) {
    params.set("ppd", String(boat.price_per_day));
  }
  if (boat.price_per_week !== null && boat.price_per_week !== undefined) {
    params.set("ppw", String(boat.price_per_week));
  }
  if (boat.sale_price !== null && boat.sale_price !== undefined) {
    params.set("sale", String(boat.sale_price));
  }

  return `/${lang}/request?${params.toString()}`;
}

export function AvailabilityCalendar({
  lang,
  availability,
  boat,
  slug,
  requestSlotLabel,
  availabilityTitle,
  availabilityEmpty,
  availabilityUnavailable,
}: AvailabilityCalendarProps) {
  const timeZone = availability?.timezone || "Europe/Podgorica";
  const groups = useMemo(
    () => groupSlots(availability?.data ?? [], timeZone, lang),
    [availability?.data, lang, timeZone]
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(groups[0]?.key ?? null);
  const activeGroup = groups.find((group) => group.key === selectedDate) ?? groups[0] ?? null;
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(
    activeGroup?.slots[0] ? slotKey(activeGroup.slots[0]) : null
  );
  const selectedSlot =
    activeGroup?.slots.find((slot) => slotKey(slot) === selectedSlotKey) ?? activeGroup?.slots[0] ?? null;

  function selectDate(group: SlotGroup) {
    setSelectedDate(group.key);
    setSelectedSlotKey(group.slots[0] ? slotKey(group.slots[0]) : null);
  }

  return (
    <section style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <p className="kicker" style={{ margin: 0 }}>
          {availabilityTitle}
        </p>
        {groups.length ? (
          <span style={{ fontSize: 13, opacity: 0.72 }}>
            {groups.reduce((sum, group) => sum + group.slots.length, 0)} slots
          </span>
        ) : null}
      </div>

      {!availability ? (
        <p className="kicker" style={{ margin: 0 }}>
          {availabilityUnavailable}
        </p>
      ) : !groups.length ? (
        <p className="kicker" style={{ margin: 0 }}>
          {availabilityEmpty}
        </p>
      ) : (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 16,
            background: "rgba(255,255,255,0.04)",
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
              gap: 10,
            }}
          >
            {groups.map((group) => {
              const isActive = group.key === activeGroup?.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectDate(group)}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    border: isActive ? "1px solid rgba(255,255,255,0.72)" : "1px solid rgba(255,255,255,0.12)",
                    background: isActive ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)",
                    color: "inherit",
                    padding: "12px 12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.78, textTransform: "uppercase" }}>
                    {group.dayName}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>
                    {group.dateLabel}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72 }}>
                    {group.slots.length} available
                  </div>
                </button>
              );
            })}
          </div>

          {activeGroup ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{activeGroup.dateLabel}</div>
                  <div style={{ marginTop: 4, opacity: 0.72, fontSize: 13 }}>{activeGroup.dayName}</div>
                </div>
                <div style={{ opacity: 0.72, fontSize: 13 }}>{timeZone}</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                  gap: 10,
                }}
              >
                {activeGroup.slots.map((slot) => {
                  const key = slotKey(slot);
                  const isActive = selectedSlot ? key === slotKey(selectedSlot) : false;

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelectedSlotKey(key)}
                      style={{
                        borderRadius: 999,
                        border: isActive ? "1px solid rgba(255,255,255,0.78)" : "1px solid rgba(255,255,255,0.14)",
                        background: isActive ? "rgba(37,99,235,0.58)" : "rgba(255,255,255,0.06)",
                        color: "inherit",
                        padding: "11px 12px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {formatSlotTime(slot, timeZone, lang)}
                    </button>
                  );
                })}
              </div>

              {selectedSlot ? (
                <Link
                  className="button"
                  href={buildRequestHref(lang, boat, slug, selectedSlot)}
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  {requestSlotLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
