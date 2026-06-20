"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type DurationOption = {
  label: string;
  slotCount: number;
  enabled: boolean;
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

function formatTime(value: string, timeZone: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeForLang(lang), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDate(value: string, timeZone: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeForLang(lang), {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}


function bookingCopy(lang: Lang) {
  if (lang === "ru") {
    return {
      fullDay: "Весь день",
      hour: "час",
      hours: "часа",
      until: "До",
      duration: "Длительность",
      yourTrip: "ВАША ПОЕЗДКА",
      date: "Дата",
      time: "Время",
      noPayment: "Оплата пока не требуется. Отправьте заявку, и владелец подтвердит доступность.",
      availableDates: "Доступные даты",
      tripDuration: "Длительность поездки",
      selectedBooking: "Выбранное бронирование",
      slot: "слот",
      slots: "слотов",
      timeSingle: "время",
      timePlural: "времени",
    };
  }

  if (lang === "me") {
    return {
      fullDay: "Cijeli dan",
      hour: "sat",
      hours: "sata",
      until: "Do",
      duration: "Trajanje",
      yourTrip: "VAŠE PUTOVANJE",
      date: "Datum",
      time: "Vrijeme",
      noPayment: "Plaćanje još nije potrebno. Pošaljite zahtjev i vlasnik potvrđuje dostupnost.",
      availableDates: "Dostupni datumi",
      tripDuration: "Trajanje putovanja",
      selectedBooking: "Odabrana rezervacija",
      slot: "termin",
      slots: "termina",
      timeSingle: "vrijeme",
      timePlural: "vremena",
    };
  }

  return {
    fullDay: "Full day",
    hour: "hour",
    hours: "hours",
    until: "Until",
    duration: "Duration",
    yourTrip: "YOUR TRIP",
    date: "Date",
    time: "Time",
    noPayment: "No payment yet. Send a request and the owner confirms availability.",
    availableDates: "Available dates",
    tripDuration: "Trip duration",
    selectedBooking: "Selected booking request",
    slot: "slot",
    slots: "slots",
    timeSingle: "time",
    timePlural: "times",
  };
}

function formatDuration(slotCount: number, lang: Lang): string {
  const copy = bookingCopy(lang);

  if (slotCount === 8) return copy.fullDay;
  return `${slotCount} ${slotCount === 1 ? copy.hour : copy.hours}`;
}

function bookingCtaLabel(label: string): string {
  return label
    .replace("this slot", "this booking")
    .replace("этот слот", "это бронирование")
    .replace("ovaj termin", "ovu rezervaciju");
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

function getConsecutiveSlots(slots: AvailabilitySlot[], startSlot: AvailabilitySlot | null): AvailabilitySlot[] {
  if (!startSlot) return [];

  const sorted = [...slots].sort((a, b) => Date.parse(a.slot_start_utc) - Date.parse(b.slot_start_utc));
  const startIndex = sorted.findIndex((slot) => slotKey(slot) === slotKey(startSlot));
  if (startIndex < 0) return [];

  const consecutive = [sorted[startIndex]];

  for (let index = startIndex + 1; index < sorted.length; index += 1) {
    const previous = consecutive[consecutive.length - 1];
    const current = sorted[index];

    if (previous.slot_end_utc !== current.slot_start_utc) break;
    consecutive.push(current);
  }

  return consecutive;
}

function getValidDurationOptions(slots: AvailabilitySlot[], startSlot: AvailabilitySlot | null): DurationOption[] {
  const consecutive = getConsecutiveSlots(slots, startSlot);
  const availableCount = consecutive.length;

  return [
    { label: "1h", slotCount: 1, enabled: availableCount >= 1 },
    { label: "2h", slotCount: 2, enabled: availableCount >= 2 },
    { label: "3h", slotCount: 3, enabled: availableCount >= 3 },
    { label: "4h", slotCount: 4, enabled: availableCount >= 4 },
    { label: "Full day", slotCount: 8, enabled: availableCount >= 8 },
  ];
}

function buildDurationSlotRange(
  slots: AvailabilitySlot[],
  startSlot: AvailabilitySlot | null,
  slotCount: number
): AvailabilitySlot | null {
  const consecutive = getConsecutiveSlots(slots, startSlot);
  const safeSlotCount = Math.max(1, Math.floor(slotCount));

  if (!consecutive.length || consecutive.length < safeSlotCount) return startSlot;

  return {
    slot_start_utc: consecutive[0].slot_start_utc,
    slot_end_utc: consecutive[safeSlotCount - 1].slot_end_utc,
  };
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
  const [selectedDurationSlots, setSelectedDurationSlots] = useState(1);
  const selectedSlot =
    activeGroup?.slots.find((slot) => slotKey(slot) === selectedSlotKey) ?? activeGroup?.slots[0] ?? null;
  const durationOptions = useMemo(
    () => getValidDurationOptions(activeGroup?.slots ?? [], selectedSlot),
    [activeGroup?.slots, selectedSlot]
  );
  const selectedDurationIsValid = durationOptions.some(
    (option) => option.slotCount === selectedDurationSlots && option.enabled
  );
  const requestSlotRange =
    buildDurationSlotRange(activeGroup?.slots ?? [], selectedSlot, selectedDurationSlots) ?? selectedSlot;
  const totalSlots = groups.reduce((sum, group) => sum + group.slots.length, 0);
  const selectedDateLabel = requestSlotRange ? formatDate(requestSlotRange.slot_start_utc, timeZone, lang) : null;
  const selectedTimeLabel = requestSlotRange
    ? `${formatTime(requestSlotRange.slot_start_utc, timeZone, lang)}-${formatTime(
        requestSlotRange.slot_end_utc,
        timeZone,
        lang
      )}`
    : null;
  const copy = bookingCopy(lang);
  const ctaLabel = bookingCtaLabel(requestSlotLabel) || "Request this booking";

  useEffect(() => {
    if (!selectedDurationIsValid) setSelectedDurationSlots(1);
  }, [selectedDurationIsValid]);

  function selectDate(group: SlotGroup) {
    setSelectedDate(group.key);
    setSelectedSlotKey(group.slots[0] ? slotKey(group.slots[0]) : null);
    setSelectedDurationSlots(1);
  }

  function selectSlot(slot: AvailabilitySlot) {
    setSelectedSlotKey(slotKey(slot));
    setSelectedDurationSlots(1);
  }

  return (
    <>
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
            {totalSlots} {totalSlots === 1 ? copy.slot : copy.slots}
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
            borderRadius: 16,
            padding: 14,
            background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
            display: "grid",
            gap: 14,
            boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 2,
              WebkitOverflowScrolling: "touch",
            }}
            aria-label={copy.availableDates}
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
                    minWidth: 104,
                    flex: "0 0 auto",
                    textAlign: "left",
                    borderRadius: 12,
                    border: isActive ? "1px solid rgba(255,255,255,0.82)" : "1px solid rgba(255,255,255,0.13)",
                    background: isActive ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)",
                    color: "inherit",
                    padding: "10px 11px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 10px 28px rgba(0,0,0,0.2)" : "none",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.74, textTransform: "uppercase" }}>
                    {group.dayName}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 17, fontWeight: 850 }}>
                    {group.dateLabel}
                  </div>
                  <div style={{ marginTop: 5, fontSize: 12, opacity: 0.76 }}>
                    {group.slots.length} {group.slots.length === 1 ? copy.timeSingle : copy.timePlural}
                  </div>
                </button>
              );
            })}
          </div>

          {activeGroup ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 850, fontSize: 18 }}>{activeGroup.dateLabel}</div>
                    <div style={{ marginTop: 4, opacity: 0.72, fontSize: 13 }}>{activeGroup.dayName}</div>
                  </div>
                  <div style={{ opacity: 0.72, fontSize: 12, textAlign: "right" }}>{timeZone}</div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                      gap: 8,
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
                          onClick={() => selectSlot(slot)}
                          style={{
                            borderRadius: 12,
                            border: isActive ? "1px solid rgba(255,255,255,0.84)" : "1px solid rgba(255,255,255,0.13)",
                            background: isActive ? "rgba(37,99,235,0.62)" : "rgba(255,255,255,0.055)",
                            color: "inherit",
                            padding: "10px 11px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "grid",
                            gap: 3,
                            minHeight: 58,
                          }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 850 }}>
                            {formatTime(slot.slot_start_utc, timeZone, lang)}
                          </span>
                          <span style={{ fontSize: 12, opacity: 0.74 }}>
                            {formatTime(slot.slot_start_utc, timeZone, lang)}–{formatTime(slot.slot_end_utc, timeZone, lang)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedSlot ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.84 }}>{copy.duration}</div>
                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        overflowX: "auto",
                        padding: 3,
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.16)",
                      }}
                      aria-label={copy.tripDuration}
                    >
                      {durationOptions.map((option) => {
                        const isActive = option.slotCount === selectedDurationSlots && option.enabled;

                        return (
                          <button
                            key={option.slotCount}
                            type="button"
                            aria-pressed={isActive}
                            disabled={!option.enabled}
                            onClick={() => setSelectedDurationSlots(option.slotCount)}
                            style={{
                              flex: "1 0 auto",
                              minWidth: 72,
                              borderRadius: 11,
                              border: isActive
                                ? "1px solid rgba(255,255,255,0.8)"
                                : "1px solid rgba(255,255,255,0)",
                              background: isActive ? "rgba(255,255,255,0.17)" : "transparent",
                              color: "inherit",
                              opacity: option.enabled ? 1 : 0.34,
                              padding: "8px 11px",
                              fontWeight: 850,
                              cursor: option.enabled ? "pointer" : "not-allowed",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside
                style={{
                  border: "1px solid rgba(255,255,255,0.13)",
                  borderRadius: 14,
                  background: "rgba(0,0,0,0.18)",
                  padding: 14,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, textTransform: "uppercase" }}>{copy.yourTrip}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 850 }}>{boat.title ?? slug}</div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ opacity: 0.68 }}>{copy.date}</span>
                    <strong style={{ textAlign: "right" }}>{selectedDateLabel ?? activeGroup.dateLabel}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ opacity: 0.68 }}>{copy.time}</span>
                    <strong style={{ textAlign: "right" }}>
                      {selectedTimeLabel ?? (selectedSlot ? formatSlotTime(selectedSlot, timeZone, lang) : "-")}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ opacity: 0.68 }}>{copy.duration}</span>
                    <strong style={{ textAlign: "right" }}>{formatDuration(selectedDurationSlots, lang)}</strong>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.11)",
                    paddingTop: 12,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.68 }}>
                    {copy.noPayment}
                  </div>
                  {requestSlotRange ? (
                    <Link
                      className="button"
                      href={buildRequestHref(lang, boat, slug, requestSlotRange)}
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      {ctaLabel}
                    </Link>
                  ) : null}
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      )}

      {requestSlotRange ? <div className="mobile-booking-spacer" aria-hidden="true" /> : null}
    </section>

    {requestSlotRange ? (
      <div className="mobile-booking-bar" role="region" aria-label={copy.selectedBooking}>
        <div className="mobile-booking-summary">
          <div className="mobile-booking-primary">{ctaLabel}</div>
          <div className="mobile-booking-meta">
            <span>{selectedDateLabel ?? activeGroup?.dateLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedTimeLabel ?? (selectedSlot ? formatSlotTime(selectedSlot, timeZone, lang) : "-")}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(selectedDurationSlots, lang)}</span>
          </div>
        </div>
        <Link
          className="mobile-booking-link"
          href={buildRequestHref(lang, boat, slug, requestSlotRange)}
          aria-label={`${ctaLabel}: ${selectedDateLabel ?? activeGroup?.dateLabel}, ${
            selectedTimeLabel ?? (selectedSlot ? formatSlotTime(selectedSlot, timeZone, lang) : "-")
          }, ${formatDuration(selectedDurationSlots, lang)}`}
        >
          {ctaLabel}
        </Link>
      </div>
    ) : null}

    <style jsx>{`
      .mobile-booking-spacer,
      .mobile-booking-bar {
        display: none;
      }

      @media (max-width: 720px) {
        .mobile-booking-spacer {
          display: block;
          height: calc(104px + env(safe-area-inset-bottom, 0px));
        }

        .mobile-booking-bar {
          position: fixed;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 45;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(8, 9, 10, 0.9);
          box-shadow: 0 -18px 46px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(18px);
        }

        .mobile-booking-summary {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .mobile-booking-primary {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.94);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mobile-booking-meta {
          display: flex;
          min-width: 0;
          gap: 6px;
          align-items: center;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.68);
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
        }

        .mobile-booking-meta span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-booking-link {
          min-height: 44px;
          max-width: 44vw;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.13);
          color: rgba(255, 255, 255, 0.96);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.1;
          text-align: center;
          text-decoration: none;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
        }

        .mobile-booking-link:hover {
          background: rgba(255, 255, 255, 0.17);
          border-color: rgba(255, 255, 255, 0.42);
        }

        .mobile-booking-link:focus-visible {
          outline: 3px solid rgba(255, 255, 255, 0.9);
          outline-offset: 3px;
        }
      }
    `}</style>
    </>
  );
}
