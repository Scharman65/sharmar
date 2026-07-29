"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/availability";
import type { Lang } from "@/i18n";
import type { Boat } from "@/lib/strapi";
import {
  buildBookingRequestParams,
  buildBookingSelectionSummary,
  buildSlotRangeForDuration,
  getRouteDurationHours,
  getRoutePriceBreakdown,
  getValidStartSlotsForDuration,
  localDateKey,
  type BookingRoute,
} from "@/lib/bookingSelection";

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
  startSlots: AvailabilitySlot[];
};

function localeForLang(lang: Lang): string {
  if (lang === "ru") return "ru-RU";
  if (lang === "me") return "sr-Latn-ME";
  return "en-US";
}

function copyForLang(lang: Lang) {
  if (lang === "ru") {
    return {
      routeStep: "Шаг 1",
      routeTitle: "Выберите маршрут",
      routeHelp: "Сначала выберите маршрут. Даты и время будут показаны только для его длительности.",
      dateStep: "Шаг 2",
      dateTitle: "Выберите дату",
      dateLocked: "Сначала выберите маршрут.",
      timeStep: "Шаг 3",
      timeTitle: "Выберите время начала",
      timeLocked: "Сначала выберите маршрут и дату.",
      reviewStep: "Шаг 4",
      reviewTitle: "Проверьте поездку",
      continueStep: "Шаг 5",
      noRoute: "Маршруты для бронирования пока не настроены.",
      routeUnavailable: "Для этого маршрута нет доступных стартов на выбранные даты.",
      unavailableRoute: "Недоступно",
      duration: "Длительность",
      price: "Стоимость маршрута",
      bookingFee: "Сбор за бронирование",
      total: "Ориентировочный итог",
      basePrice: "Базовая стоимость",
      route: "Маршрут",
      boat: "Лодка",
      date: "Дата",
      start: "Начало",
      end: "Окончание",
      guests: "Гости",
      guestsLabel: "Количество гостей",
      timezone: "Часовой пояс",
      selectRoute: "Выберите маршрут",
      selectDate: "Выберите дату",
      selectTime: "Выберите время",
      validSelection: "Готово к заявке",
      noPayment: "Сейчас заявка перейдёт к безопасному онлайн-бронированию. Сервер заново проверит слот и рассчитает цену.",
      cta: "Перейти к бронированию",
      starts: "вариантов начала",
      startOne: "вариант начала",
    };
  }

  if (lang === "me") {
    return {
      routeStep: "Korak 1",
      routeTitle: "Izaberite rutu",
      routeHelp: "Prvo izaberite rutu. Datumi i termini se prikazuju za njeno trajanje.",
      dateStep: "Korak 2",
      dateTitle: "Izaberite datum",
      dateLocked: "Prvo izaberite rutu.",
      timeStep: "Korak 3",
      timeTitle: "Izaberite vrijeme polaska",
      timeLocked: "Prvo izaberite rutu i datum.",
      reviewStep: "Korak 4",
      reviewTitle: "Provjerite putovanje",
      continueStep: "Korak 5",
      noRoute: "Rute za rezervaciju još nisu podešene.",
      routeUnavailable: "Za ovu rutu nema dostupnih polazaka u odabranim datumima.",
      unavailableRoute: "Nedostupno",
      duration: "Trajanje",
      price: "Cijena rute",
      bookingFee: "Naknada za rezervaciju",
      total: "Procijenjeni ukupno",
      basePrice: "Osnovna cijena",
      route: "Ruta",
      boat: "Brod",
      date: "Datum",
      start: "Početak",
      end: "Kraj",
      guests: "Gosti",
      guestsLabel: "Broj gostiju",
      timezone: "Vremenska zona",
      selectRoute: "Izaberite rutu",
      selectDate: "Izaberite datum",
      selectTime: "Izaberite vrijeme",
      validSelection: "Spremno za zahtjev",
      noPayment: "Zahtjev sada ide na sigurnu online rezervaciju. Server ponovo provjerava termin i računa cijenu.",
      cta: "Idi na rezervaciju",
      starts: "polazaka",
      startOne: "polazak",
    };
  }

  return {
    routeStep: "Step 1",
    routeTitle: "Choose route",
    routeHelp: "Choose a route first. Dates and starts are filtered for its duration.",
    dateStep: "Step 2",
    dateTitle: "Choose date",
    dateLocked: "Choose a route first.",
    timeStep: "Step 3",
    timeTitle: "Choose start time",
    timeLocked: "Choose a route and date first.",
    reviewStep: "Step 4",
    reviewTitle: "Review trip",
    continueStep: "Step 5",
    noRoute: "Booking routes are not configured yet.",
    routeUnavailable: "This route has no available starts in the selected dates.",
    unavailableRoute: "Unavailable",
    duration: "Duration",
    price: "Route price",
    bookingFee: "Booking fee",
    total: "Estimated total",
    basePrice: "Base price",
    route: "Route",
    boat: "Boat",
    date: "Date",
    start: "Start",
    end: "End",
    guests: "Guests",
    guestsLabel: "Guests",
    timezone: "Time zone",
    selectRoute: "Choose a route",
    selectDate: "Choose a date",
    selectTime: "Choose a start time",
    validSelection: "Ready for request",
    noPayment: "This continues to secure online booking. The server will re-check the slot and calculate price again.",
    cta: "Continue to booking",
    starts: "starts",
    startOne: "start",
  };
}

function datePartsForSlot(slot: AvailabilitySlot, timeZone: string, lang: Lang) {
  const locale = localeForLang(lang);
  const start = new Date(slot.slot_start_utc);
  const key = localDateKey(slot.slot_start_utc, timeZone) ?? "";

  return {
    key,
    dayName: new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(start),
    dateLabel: new Intl.DateTimeFormat(locale, { timeZone, month: "short", day: "numeric" }).format(start),
  };
}

function groupSlots(slots: AvailabilitySlot[], timeZone: string, lang: Lang): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();

  [...slots]
    .sort((a, b) => Date.parse(a.slot_start_utc) - Date.parse(b.slot_start_utc))
    .forEach((slot) => {
      const parts = datePartsForSlot(slot, timeZone, lang);
      if (!parts.key) return;

      const current = groups.get(parts.key);
      if (current) {
        current.slots.push(slot);
      } else {
        groups.set(parts.key, { ...parts, slots: [slot], startSlots: [] });
      }
    });

  return Array.from(groups.values());
}

function slotKey(slot: AvailabilitySlot): string {
  return `${slot.slot_start_utc}-${slot.slot_end_utc}`;
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

function formatDuration(hours: number | null, lang: Lang): string {
  if (!hours || !Number.isFinite(hours) || hours <= 0) return "-";
  const rounded = Math.round(hours * 100) / 100;
  const value = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);

  if (lang === "ru") {
    const whole = Math.floor(rounded);
    const mod10 = whole % 10;
    const mod100 = whole % 100;
    const noun = mod10 === 1 && mod100 !== 11 ? "час" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "часа" : "часов";
    return `${value} ${noun}`;
  }

  if (lang === "me") {
    return `${value} h`;
  }

  return `${value} ${rounded === 1 ? "hour" : "hours"}`;
}

function money(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${formatted} ${currency}`;
}

function normalizedRoutes(boat: Boat): BookingRoute[] {
  return (boat.experiences ?? []).filter((route) => {
    const duration = getRouteDurationHours(route);
    const breakdown = getRoutePriceBreakdown(route);
    return Boolean(duration && breakdown);
  });
}

export function AvailabilityCalendar({
  lang,
  availability,
  boat,
  slug,
  availabilityTitle,
  availabilityEmpty,
  availabilityUnavailable,
}: AvailabilityCalendarProps) {
  const copy = copyForLang(lang);
  const timeZone = availability?.timezone || "Europe/Podgorica";
  const routes = useMemo(() => normalizedRoutes(boat), [boat]);
  const rawGroups = useMemo(() => groupSlots(availability?.data ?? [], timeZone, lang), [availability?.data, lang, timeZone]);

  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [guests, setGuests] = useState<number>(1);

  const selectedRoute = selectedRouteId !== null ? routes.find((route) => route.id === selectedRouteId) ?? null : null;
  const selectedDuration = getRouteDurationHours(selectedRoute);

  const groups = useMemo(() => {
    if (!selectedRoute || !selectedDuration) return [];

    return rawGroups
      .map((group) => ({
        ...group,
        startSlots: getValidStartSlotsForDuration(group.slots, selectedDuration, timeZone),
      }))
      .filter((group) => group.startSlots.length > 0);
  }, [rawGroups, selectedDuration, selectedRoute, timeZone]);

  const activeGroup = groups.find((group) => group.key === selectedDate) ?? groups[0] ?? null;
  const selectedSlot =
    activeGroup?.startSlots.find((slot) => slotKey(slot) === selectedSlotKey) ?? null;
  const slotRange = buildSlotRangeForDuration(activeGroup?.slots ?? [], selectedSlot, selectedDuration, timeZone);
  const selectionSummary = buildBookingSelectionSummary({
    route: selectedRoute,
    slotRange,
    fallbackCurrency: boat.currency,
  });
  const canContinue = Boolean(selectionSummary && guests > 0);
  const ctaLabel = copy.cta;

  const totalStarts = groups.reduce((sum, group) => sum + group.startSlots.length, 0);
  const selectedDateLabel = slotRange ? formatDate(slotRange.slot_start_utc, timeZone, lang) : null;
  const selectedStartLabel = slotRange ? formatTime(slotRange.slot_start_utc, timeZone, lang) : null;
  const selectedEndLabel = slotRange ? formatTime(slotRange.slot_end_utc, timeZone, lang) : null;
  const disabledReason = !selectedRoute
    ? copy.selectRoute
    : !activeGroup
      ? copy.selectDate
      : !slotRange
        ? copy.selectTime
        : copy.validSelection;

  function groupsForRoute(route: BookingRoute): SlotGroup[] {
    const duration = getRouteDurationHours(route);
    if (!duration) return [];
    return rawGroups
      .map((group) => ({
        ...group,
        startSlots: getValidStartSlotsForDuration(group.slots, duration, timeZone),
      }))
      .filter((group) => group.startSlots.length > 0);
  }

  function selectRoute(route: BookingRoute) {
    const routeGroups = groupsForRoute(route);
    const firstGroup = routeGroups[0] ?? null;
    const firstSlot = firstGroup?.startSlots[0] ?? null;

    setSelectedRouteId(route.id);
    setSelectedDate(firstGroup?.key ?? null);
    setSelectedSlotKey(firstSlot ? slotKey(firstSlot) : null);
  }

  function selectDate(group: SlotGroup) {
    const firstSlot = group.startSlots[0] ?? null;
    setSelectedDate(group.key);
    setSelectedSlotKey(firstSlot ? slotKey(firstSlot) : null);
  }

  const requestHref =
    canContinue && selectionSummary && selectedRoute && slotRange
      ? buildBookingRequestParams({
          lang,
          boatId: boat.id,
          boatSlug: slug,
          boatTitle: boat.title ?? slug,
          boatDocumentId: boat.documentId,
          route: selectedRoute,
          slotRange,
          guests,
        })
      : "";

  return (
    <>
      <section id="booking-flow" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline", marginBottom: 12 }}>
          <p className="kicker" style={{ margin: 0 }}>
            {availabilityTitle}
          </p>
          {selectedRoute ? (
            <span style={{ fontSize: 13, opacity: 0.72 }}>
              {totalStarts} {totalStarts === 1 ? copy.startOne : copy.starts}
            </span>
          ) : null}
        </div>

        {!availability ? (
          <p className="kicker" style={{ margin: 0 }}>{availabilityUnavailable}</p>
        ) : !routes.length ? (
          <p className="kicker" style={{ margin: 0 }}>{copy.noRoute}</p>
        ) : !(availability.data ?? []).length ? (
          <p className="kicker" style={{ margin: 0 }}>{availabilityEmpty}</p>
        ) : (
          <div className="booking-shell">
            <div className="booking-grid">
              <div className="booking-steps">
                <section className="booking-step" aria-labelledby="booking-route-title">
                  <div className="step-head">
                    <span>{copy.routeStep}</span>
                    <div>
                      <h2 id="booking-route-title">{copy.routeTitle}</h2>
                      <p>{copy.routeHelp}</p>
                    </div>
                  </div>

                  <div className="route-grid">
                    {routes.map((route) => {
                      const isActive = route.id === selectedRouteId;
                      const duration = getRouteDurationHours(route);
                      const breakdown = getRoutePriceBreakdown(route);
                      const currency = route.currency || boat.currency || "EUR";
                      const routeGroups = groupsForRoute(route);
                      const available = routeGroups.length > 0;

                      return (
                        <button
                          key={route.documentId ? `document:${route.documentId}` : `id:${route.id}`}
                          type="button"
                          aria-pressed={isActive}
                          disabled={!available}
                          className={`route-card ${isActive ? "is-active" : ""}`}
                          onClick={() => selectRoute(route)}
                        >
                          {route.cover?.url ? (
                            <img
                              src={route.cover.url}
                              alt={route.cover.alternativeText || route.title || "Route"}
                              className="route-image"
                            />
                          ) : null}
                          <span className="route-card-top">
                            <strong>{route.title || copy.route}</strong>
                            <span>{available ? `${routeGroups.reduce((sum, group) => sum + group.startSlots.length, 0)} ${copy.starts}` : copy.unavailableRoute}</span>
                          </span>
                          <span className="route-meta">
                            <span>{formatDuration(duration, lang)}</span>
                            <span>{money(breakdown?.customerTotalAmount, currency)}</span>
                          </span>
                          {breakdown ? (
                            <span className="route-price-lines">
                              <span>{copy.basePrice}: {money(breakdown.ownerAmount, currency)}</span>
                              <span>{copy.bookingFee}: {money(breakdown.marketplaceFeeAmount, currency)}</span>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className={`booking-step ${selectedRoute ? "" : "is-locked"}`} aria-labelledby="booking-date-title">
                  <div className="step-head">
                    <span>{copy.dateStep}</span>
                    <div>
                      <h2 id="booking-date-title">{copy.dateTitle}</h2>
                      <p>{selectedRoute ? `${copy.timezone}: ${timeZone}` : copy.dateLocked}</p>
                    </div>
                  </div>

                  {selectedRoute && groups.length ? (
                    <div className="date-row" aria-label={copy.dateTitle}>
                      {groups.map((group) => {
                        const isActive = group.key === activeGroup?.key;
                        return (
                          <button
                            key={group.key}
                            type="button"
                            aria-pressed={isActive}
                            className={`date-card ${isActive ? "is-active" : ""}`}
                            onClick={() => selectDate(group)}
                          >
                            <span>{group.dayName}</span>
                            <strong>{group.dateLabel}</strong>
                            <small>{group.startSlots.length} {group.startSlots.length === 1 ? copy.startOne : copy.starts}</small>
                          </button>
                        );
                      })}
                    </div>
                  ) : selectedRoute ? (
                    <p className="step-note">{copy.routeUnavailable}</p>
                  ) : null}
                </section>

                <section className={`booking-step ${selectedRoute && activeGroup ? "" : "is-locked"}`} aria-labelledby="booking-time-title">
                  <div className="step-head">
                    <span>{copy.timeStep}</span>
                    <div>
                      <h2 id="booking-time-title">{copy.timeTitle}</h2>
                      <p>{selectedRoute && activeGroup ? `${copy.duration}: ${formatDuration(selectedDuration, lang)}` : copy.timeLocked}</p>
                    </div>
                  </div>

                  {selectedRoute && activeGroup ? (
                    <div className="time-grid" aria-label={copy.timeTitle}>
                      {activeGroup.startSlots.map((slot) => {
                        const range = buildSlotRangeForDuration(activeGroup.slots, slot, selectedDuration, timeZone);
                        const key = slotKey(slot);
                        const isActive = selectedSlot ? key === slotKey(selectedSlot) : false;
                        if (!range) return null;

                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isActive}
                            className={`time-card ${isActive ? "is-active" : ""}`}
                            onClick={() => setSelectedSlotKey(key)}
                          >
                            <strong>{formatTime(range.slot_start_utc, timeZone, lang)}</strong>
                            <span>{formatTime(range.slot_start_utc, timeZone, lang)}-{formatTime(range.slot_end_utc, timeZone, lang)}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="booking-summary" aria-label={copy.reviewTitle}>
                <div className="summary-heading">
                  <span>{copy.reviewStep}</span>
                  <h2>{copy.reviewTitle}</h2>
                </div>

                <label className="guest-control">
                  <span>{copy.guestsLabel}</span>
                  <input
                    value={guests}
                    min={1}
                    type="number"
                    inputMode="numeric"
                    onChange={(event) => setGuests(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                  />
                </label>

                <div className="summary-lines">
                  <div><span>{copy.boat}</span><b>{boat.title ?? slug}</b></div>
                  <div><span>{copy.route}</span><b>{selectionSummary?.routeTitle ?? "-"}</b></div>
                  <div><span>{copy.date}</span><b>{selectedDateLabel ?? "-"}</b></div>
                  <div><span>{copy.start}</span><b>{selectedStartLabel ?? "-"}</b></div>
                  <div><span>{copy.end}</span><b>{selectedEndLabel ?? "-"}</b></div>
                  <div><span>{copy.duration}</span><b>{formatDuration(selectionSummary?.durationHours ?? null, lang)}</b></div>
                  <div><span>{copy.guests}</span><b>{guests}</b></div>
                  <div><span>{copy.basePrice}</span><b>{money(selectionSummary?.basePrice, selectionSummary?.currency ?? boat.currency ?? "EUR")}</b></div>
                  <div><span>{copy.bookingFee}</span><b>{money(selectionSummary?.marketplaceFee, selectionSummary?.currency ?? boat.currency ?? "EUR")}</b></div>
                  <div className="summary-total"><span>{copy.total}</span><b>{money(selectionSummary?.customerTotal, selectionSummary?.currency ?? boat.currency ?? "EUR")}</b></div>
                </div>

                <div className="booking-cta-block">
                  <div className="summary-heading compact">
                    <span>{copy.continueStep}</span>
                    <h2>{ctaLabel}</h2>
                  </div>
                  <p>{copy.noPayment}</p>
                  {canContinue ? (
                    <Link className="booking-primary" href={requestHref} aria-label={ctaLabel}>
                      {ctaLabel}
                    </Link>
                  ) : (
                    <button className="booking-primary is-disabled" type="button" disabled aria-label={disabledReason}>
                      {disabledReason}
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>

      {canContinue ? <div className="mobile-booking-spacer" aria-hidden="true" /> : null}
      {canContinue && selectionSummary ? (
        <div className="mobile-booking-bar" role="region" aria-label={copy.reviewTitle}>
          <div className="mobile-booking-summary">
            <div className="mobile-booking-primary">{selectionSummary.routeTitle}</div>
            <div className="mobile-booking-meta">
              <span>{selectedDateLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedStartLabel}-{selectedEndLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{money(selectionSummary.customerTotal, selectionSummary.currency)}</span>
            </div>
          </div>
          <Link className="mobile-booking-link" href={requestHref} aria-label={ctaLabel}>
            {ctaLabel}
          </Link>
        </div>
      ) : null}

      <style jsx>{`
        .booking-shell {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 14px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.035));
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        }

        .booking-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 380px);
          gap: 14px;
          align-items: start;
          min-width: 0;
          max-width: 100%;
        }

        .booking-steps,
        .summary-lines,
        .booking-summary {
          display: grid;
          gap: 14px;
          min-width: 0;
          max-width: 100%;
        }

        .booking-step,
        .booking-summary {
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          padding: 14px;
          background: rgba(0, 0, 0, 0.16);
          min-width: 0;
          max-width: 100%;
        }

        .booking-step.is-locked {
          opacity: 0.72;
        }

        .step-head,
        .summary-heading {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .step-head > span,
        .summary-heading > span {
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.78);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .step-head h2,
        .summary-heading h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
        }

        .step-head p,
        .booking-cta-block p,
        .step-note {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
          line-height: 1.45;
        }

        .route-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
          gap: 10px;
          margin-top: 14px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .route-card,
        .date-card,
        .time-card {
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.055);
          color: inherit;
          cursor: pointer;
          text-align: left;
          min-width: 0;
          max-width: 100%;
        }

        .route-card {
          width: 100%;
          min-height: 150px;
          display: grid;
          gap: 8px;
          padding: 11px;
          overflow-wrap: anywhere;
        }

        .route-card:disabled {
          cursor: not-allowed;
          opacity: 0.44;
        }

        .route-card.is-active,
        .date-card.is-active,
        .time-card.is-active {
          border-color: rgba(248, 214, 111, 0.9);
          background: rgba(248, 214, 111, 0.14);
          box-shadow: inset 0 0 0 1px rgba(248, 214, 111, 0.28);
        }

        .route-image {
          display: block;
          width: 100%;
          max-width: 100%;
          aspect-ratio: 16 / 8;
          object-fit: cover;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
        }

        .route-card-top,
        .route-meta,
        .route-price-lines,
        .summary-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
          max-width: 100%;
        }

        .route-card-top {
          align-items: flex-start;
        }

        .route-card-top strong,
        .route-card-top span,
        .route-meta span,
        .summary-lines span,
        .summary-lines b {
          min-width: 0;
        }

        .route-card-top span,
        .route-price-lines,
        .route-meta span:first-child,
        .summary-lines span,
        .guest-control span {
          color: rgba(255, 255, 255, 0.68);
        }

        .route-meta {
          font-weight: 850;
        }

        .route-price-lines {
          display: grid;
          gap: 3px;
          font-size: 12px;
        }

        .date-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-top: 14px;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
        }

        .date-card {
          min-width: 104px;
          flex: 0 0 auto;
          display: grid;
          gap: 4px;
          padding: 10px 11px;
        }

        .date-card span {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          text-transform: uppercase;
        }

        .date-card strong {
          font-size: 17px;
        }

        .date-card small {
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
        }

        .time-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(116px, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .time-card {
          display: grid;
          gap: 3px;
          min-height: 58px;
          padding: 10px 11px;
        }

        .time-card span {
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
        }

        .guest-control {
          display: grid;
          gap: 7px;
        }

        .guest-control input {
          width: 100%;
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: inherit;
          padding: 0 12px;
        }

        .summary-heading.compact {
          margin-bottom: 8px;
        }

        .summary-lines > div {
          align-items: baseline;
        }

        .summary-lines b {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .summary-total {
          margin-top: 2px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .summary-total span,
        .summary-total b {
          color: rgba(255, 255, 255, 0.96);
          font-size: 17px;
        }

        .booking-cta-block {
          border-top: 1px solid rgba(255, 255, 255, 0.11);
          padding-top: 14px;
        }

        :global(.booking-primary) {
          width: 100%;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 12px;
          border: 1px solid rgba(248, 214, 111, 0.9);
          border-radius: 12px;
          background: rgb(248, 214, 111);
          color: rgb(25, 28, 31);
          font-weight: 900;
          text-align: center;
          text-decoration: none;
          box-shadow: 0 12px 28px rgba(248, 214, 111, 0.18);
        }

        :global(.booking-primary.is-disabled) {
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.58);
          box-shadow: none;
        }

        .mobile-booking-spacer,
        .mobile-booking-bar {
          display: none;
        }

        @media (max-width: 980px) {
          .booking-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .booking-shell {
            padding: 10px;
          }

          .booking-step,
          .booking-summary {
            border-radius: 12px;
            padding: 12px;
          }

          .step-head,
          .summary-heading {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .route-grid {
            grid-template-columns: 1fr;
          }

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
            background: rgba(8, 9, 10, 0.92);
            box-shadow: 0 -18px 46px rgba(0, 0, 0, 0.36);
            backdrop-filter: blur(18px);
          }

          .mobile-booking-summary {
            min-width: 0;
            display: grid;
            gap: 3px;
          }

          .mobile-booking-primary,
          .mobile-booking-meta {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-booking-primary {
            color: rgba(255, 255, 255, 0.94);
            font-size: 13px;
            font-weight: 850;
            line-height: 1.2;
          }

          .mobile-booking-meta {
            display: flex;
            min-width: 0;
            gap: 6px;
            align-items: center;
            color: rgba(255, 255, 255, 0.68);
            font-size: 11px;
            font-weight: 700;
            line-height: 1.2;
          }

          :global(.mobile-booking-link) {
            min-height: 44px;
            max-width: 44vw;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 14px;
            border: 1px solid rgba(248, 214, 111, 0.9);
            border-radius: 12px;
            background: rgb(248, 214, 111);
            color: rgb(25, 28, 31);
            font-size: 13px;
            font-weight: 900;
            line-height: 1.1;
            text-align: center;
            text-decoration: none;
          }
        }
      `}</style>
    </>
  );
}
