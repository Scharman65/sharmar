"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { isLang, t, type Lang } from "@/i18n";
import { MARKETPLACE_FEE_RATE } from "@/lib/pricing";
import { formatPaymentAmount, paymentSplitCopy } from "@/lib/paymentSplit";

type ApiOk = { ok: true; id: number; token: string };
type ApiFail = { ok: false; error: string; fallbackMailto?: string };
type HoldOk = { ok: true; booking_id?: number | string; public_id?: string; expires_at?: string };
type HoldFail = { ok?: false; error?: string; code?: string };
type QuoteOk = {
  ok: true;
  routeId: number;
  routeDocumentId?: string | null;
  routeTitle?: string | null;
  durationHours: number;
  currency: string;
  ownerAmount: number;
  marketplaceFeeAmount: number;
  customerTotalAmount: number;
};
type QuoteFail = { ok?: false; error?: string };

type RequestPayload = {
  boatSlug: string;
  boatTitle: string;
  name: string;
  phone: string;
  email?: string;

  dateFrom: string;
  dateTo: string;

  timeFrom?: string;
  timeTo?: string;

  hours?: number;
  experienceId?: number;
  experienceDocumentId?: string;

  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;

  publicToken?: string;
  hp?: string;
  client_ts?: number;
};


function requestCopy(lang: Lang) {
  if (lang === "ru") {
    return {
      missingBoat: "Данные лодки отсутствуют в URL.",
      requiredFields: "Пожалуйста, заполните обязательные поля.",
      invalidDate: "Введите корректную дату в формате YYYY-MM-DD.",
      invalidTimeRange: "Выберите корректное время: время окончания должно быть позже времени начала.",
      minimumDuration: "Минимальная продолжительность аренды — {hours}.",
      requestNotCreated: "Заявка на бронирование не создана. Попробуйте ещё раз.",
      missingToken: "Токен бронирования отсутствует.",
      unknownError: "Неизвестная ошибка",
      chooseBoatFirst: "Сначала выберите лодку",
      chooseBoatFirstText: "Откройте каталог лодок и выберите подходящий вариант перед отправкой заявки.",
      browseBoats: "Выбрать лодку",
      selectedSlotUnavailable: "Выбранный слот больше недоступен",
      chooseAnotherSlot: "Пожалуйста, выберите другой слот.",
      quoteUnavailable: "Не удалось рассчитать цену выбранного маршрута. Вернитесь к лодке и выберите слот заново.",
      summaryBoat: "Лодка",
      summaryDate: "Дата",
      summaryTimeFrom: "Время с",
      summaryTimeTo: "Время до",
      summaryDuration: "Длительность",
      summaryPeople: "Гости",
      summarySkipper: "Шкипер",
      summarySkipperRequested: "Запрошен",
      reservationRequest: "Заявка на бронирование",
      bookingSummary: "Сводка бронирования",
      selectedTrip: "Выбранная поездка",
      boatReservation: "Бронирование лодки",
      estimatedTotal: "Общая стоимость",
      payOnlineNow: "Оплатить сейчас онлайн",
      payOwnerDuringTrip: "Оплатить владельцу во время поездки",
      splitPaymentText: "Сейчас онлайн оплачивается только комиссия Sharmar. Стоимость поездки оплачивается непосредственно владельцу во время поездки.",
      contactDetails: "Контактные данные",
      contactDetailsText: "Эти данные будут переданы владельцу после отправки заявки.",
      tripDetails: "Детали поездки",
      tripDetailsText: "Проверьте выбранный слот и при необходимости измените данные гостей.",
      timeFrom: "Время с",
      timeTo: "Время до",
      endAfterStart: "Время окончания должно быть позже времени начала.",
      skipperHelp: "Добавьте этот запрос, чтобы владелец подтвердил его.",
      pricingAndPayment: "Цена и оплата",
      priceEstimate: "Предварительный расчёт",
      priceEstimateText: "Расчёт обновляется по выбранному маршруту. Онлайн сейчас оплачивается только комиссия за бронирование.",
      boatRate: "Тариф лодки",
      fixedBoatRate: "Тариф за 8 часов",
      hour: "час",
      serviceFee: "Комиссия за онлайн-бронирование",
      reservationProtection: "Защита бронирования",
      secureAuthorization: "Безопасное онлайн-бронирование",
      secureAuthorizationText: "После отправки заявки откроется защищённая оплата только комиссии Sharmar.",
      ownerConfirms: "Владелец подтверждает перед финальным бронированием",
      ownerConfirmsText: "Владелец проверяет заявку до окончательного подтверждения бронирования.",
      captureAfterApproval: "Онлайн-подтверждение бронирования",
      captureAfterApprovalText: "Стоимость поездки не списывается онлайн и оплачивается владельцу во время поездки.",
      emailFallback: "Написать по email",
      preparing: "Подготовка безопасной оплаты...",
      continueAuthorization: "Отправить заявку и оплатить комиссию",
      dateAria: "Дата (YYYY-MM-DD)",
    };
  }

  if (lang === "me") {
    return {
      missingBoat: "Podaci o brodu nedostaju u URL-u.",
      requiredFields: "Molimo popunite obavezna polja.",
      invalidDate: "Unesite ispravan datum u formatu YYYY-MM-DD.",
      invalidTimeRange: "Izaberite ispravno vrijeme: vrijeme završetka mora biti poslije početka.",
      minimumDuration: "Minimalno trajanje najma je {hours}.",
      requestNotCreated: "Zahtjev za rezervaciju nije kreiran. Pokušajte ponovo.",
      missingToken: "Token rezervacije nedostaje.",
      unknownError: "Nepoznata greška",
      chooseBoatFirst: "Prvo izaberite plovilo",
      chooseBoatFirstText: "Otvorite katalog plovila i izaberite plovilo prije slanja upita.",
      browseBoats: "Izaberi plovilo",
      selectedSlotUnavailable: "Odabrani termin više nije dostupan",
      chooseAnotherSlot: "Molimo izaberite drugi termin.",
      quoteUnavailable: "Cijena odabrane rute nije izračunata. Vratite se na brod i ponovo izaberite termin.",
      summaryBoat: "Brod",
      summaryDate: "Datum",
      summaryTimeFrom: "Vrijeme od",
      summaryTimeTo: "Vrijeme do",
      summaryDuration: "Trajanje",
      summaryPeople: "Gosti",
      summarySkipper: "Skiper",
      summarySkipperRequested: "Zatražen",
      reservationRequest: "Zahtjev za rezervaciju",
      bookingSummary: "Sažetak rezervacije",
      selectedTrip: "Odabrano putovanje",
      boatReservation: "Rezervacija broda",
      estimatedTotal: "Ukupna cijena",
      payOnlineNow: "Platite sada online",
      payOwnerDuringTrip: "Platite vlasniku tokom vožnje",
      splitPaymentText: "Sada se online plaća samo Sharmar naknada. Cijena vožnje plaća se direktno vlasniku tokom vožnje.",
      contactDetails: "Kontakt podaci",
      contactDetailsText: "Ovi podaci se dijele sa vlasnikom nakon slanja zahtjeva.",
      tripDetails: "Detalji putovanja",
      tripDetailsText: "Provjerite odabrani termin i po potrebi prilagodite podatke o gostima.",
      timeFrom: "Vrijeme od",
      timeTo: "Vrijeme do",
      endAfterStart: "Vrijeme završetka mora biti poslije vremena početka.",
      skipperHelp: "Dodajte ovaj zahtjev kako bi ga vlasnik potvrdio.",
      pricingAndPayment: "Cijena i plaćanje",
      priceEstimate: "Procjena cijene",
      priceEstimateText: "Procjena se ažurira prema odabranoj ruti. Online se sada plaća samo naknada za rezervaciju.",
      boatRate: "Cijena broda",
      fixedBoatRate: "Cijena za 8 sati",
      hour: "sat",
      serviceFee: "Naknada za online rezervaciju",
      reservationProtection: "Zaštita rezervacije",
      secureAuthorization: "Sigurna online rezervacija",
      secureAuthorizationText: "Nakon slanja zahtjeva otvara se sigurna uplata samo Sharmar naknade.",
      ownerConfirms: "Vlasnik potvrđuje prije finalne rezervacije",
      ownerConfirmsText: "Vlasnik pregledava zahtjev prije konačne potvrde rezervacije.",
      captureAfterApproval: "Online potvrda rezervacije",
      captureAfterApprovalText: "Cijena vožnje se ne naplaćuje online i plaća se vlasniku tokom vožnje.",
      emailFallback: "Pošalji email",
      preparing: "Priprema sigurnog plaćanja...",
      continueAuthorization: "Pošalji zahtjev i plati naknadu",
      dateAria: "Datum (YYYY-MM-DD)",
    };
  }

  return {
    missingBoat: "Missing boat data in URL.",
    requiredFields: "Please fill required fields.",
    invalidDate: "Please enter a valid date in YYYY-MM-DD format.",
    invalidTimeRange: "Please choose a valid time range (end time must be after start time).",
    minimumDuration: "The minimum rental duration is {hours}.",
    requestNotCreated: "Booking request was not created. Please try again.",
    missingToken: "Missing booking token.",
    unknownError: "Unknown error",
    chooseBoatFirst: "Choose a boat first",
    chooseBoatFirstText: "Open the boat catalogue and choose a boat before sending a request.",
    browseBoats: "Choose a boat",
    selectedSlotUnavailable: "Selected slot is no longer available",
    chooseAnotherSlot: "Please choose another slot.",
    quoteUnavailable: "Could not calculate the selected route price. Go back to the boat and choose the slot again.",
    summaryBoat: "Boat",
    summaryDate: "Date",
    summaryTimeFrom: "Time from",
    summaryTimeTo: "Time to",
    summaryDuration: "Duration",
    summaryPeople: "People",
    summarySkipper: "Skipper",
    summarySkipperRequested: "Requested",
    reservationRequest: "Reservation request",
    bookingSummary: "Booking summary",
    selectedTrip: "Your selected trip",
    boatReservation: "Boat reservation",
    estimatedTotal: "Total cost",
    payOnlineNow: "Pay online now",
    payOwnerDuringTrip: "Pay the owner during the trip",
    splitPaymentText: "Only the Sharmar booking fee is paid online now. The trip price is paid directly to the owner during the trip.",
    contactDetails: "Contact details",
    contactDetailsText: "These details are shared with the owner after you submit the request.",
    tripDetails: "Trip details",
    tripDetailsText: "Review the selected slot and adjust passenger details if needed.",
    timeFrom: "Time from",
    timeTo: "Time to",
    endAfterStart: "End time must be after start time.",
    skipperHelp: "Add this request for the owner to confirm.",
    pricingAndPayment: "Pricing and payment",
    priceEstimate: "Price estimate",
    priceEstimateText: "The estimate updates from the selected route. Only the booking fee is paid online now.",
    boatRate: "Boat rate",
    fixedBoatRate: "8-hour boat rate",
    hour: "hour",
    serviceFee: "Online booking fee",
    reservationProtection: "Reservation protection",
    secureAuthorization: "Secure online booking",
    secureAuthorizationText: "After you submit the request, secure payment opens only for the Sharmar fee.",
    ownerConfirms: "Owner confirms before final booking",
    ownerConfirmsText: "The owner reviews the request before the booking is final.",
    captureAfterApproval: "Online booking confirmation",
    captureAfterApprovalText: "The trip price is not charged online and is paid to the owner during the trip.",
    emailFallback: "Email fallback",
    preparing: "Preparing secure payment...",
    continueAuthorization: "Send request and pay fee",
    dateAria: "Date (YYYY-MM-DD)",
  };
}

function quoteErrorMessage(code: string | null, lang: Lang, fallback: string): string {
  if (!code) return fallback;

  const messages: Record<Lang, Record<string, string>> = {
    ru: {
      invalid_experience_identifier: "Идентификатор маршрута повреждён. Вернитесь к лодке и выберите маршрут заново.",
      experience_not_found: "Маршрут не найден или больше недоступен. Вернитесь к лодке и выберите маршрут заново.",
      experience_unpublished: "Маршрут пока не опубликован. Выберите другой маршрут.",
      experience_boat_mismatch: "Выбранный маршрут не относится к этой лодке. Вернитесь к лодке и выберите маршрут заново.",
      invalid_slot: "Выбранный слот недоступен. Вернитесь к лодке и выберите другое время.",
      route_duration_mismatch: "Время поездки не совпадает с длительностью маршрута. Выберите слот заново.",
      boat_not_found: "Лодка не найдена. Вернитесь в каталог и выберите лодку заново.",
    },
    me: {
      invalid_experience_identifier: "Identifikator rute je neispravan. Vratite se na plovilo i ponovo izaberite rutu.",
      experience_not_found: "Ruta nije pronađena ili više nije dostupna. Vratite se na plovilo i ponovo izaberite rutu.",
      experience_unpublished: "Ruta još nije objavljena. Izaberite drugu rutu.",
      experience_boat_mismatch: "Izabrana ruta ne pripada ovom plovilu. Vratite se na plovilo i ponovo izaberite rutu.",
      invalid_slot: "Izabrani termin nije dostupan. Vratite se na plovilo i izaberite drugo vrijeme.",
      route_duration_mismatch: "Vrijeme putovanja se ne poklapa sa trajanjem rute. Ponovo izaberite termin.",
      boat_not_found: "Plovilo nije pronađeno. Vratite se u katalog i ponovo izaberite plovilo.",
    },
    en: {
      invalid_experience_identifier: "The route identifier is invalid. Go back to the boat and choose the route again.",
      experience_not_found: "The route was not found or is no longer available. Go back to the boat and choose the route again.",
      experience_unpublished: "This route is not published yet. Choose another route.",
      experience_boat_mismatch: "The selected route does not belong to this boat. Go back to the boat and choose the route again.",
      invalid_slot: "The selected slot is not available. Go back to the boat and choose another time.",
      route_duration_mismatch: "The trip time no longer matches the route duration. Choose the slot again.",
      boat_not_found: "The boat was not found. Return to the catalogue and choose the boat again.",
    },
  };

  return messages[lang][code] ?? `${fallback} (${code})`;
}


function isValidIsoDate(v: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)) return false;
  const [ys, ms, ds] = v.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === (m - 1) && dt.getUTCDate() === d;
}

function diffHours(from: string, to: string): number {
  const [fh, fm] = from.split(":").map((x) => Number(x));
  const [th, tm] = to.split(":").map((x) => Number(x));

  if (!Number.isFinite(fh) || !Number.isFinite(fm) || !Number.isFinite(th) || !Number.isFinite(tm)) {
    return 0;
  }

  const fromMinutes = fh * 60 + fm;
  const toMinutes = th * 60 + tm;

  if (toMinutes <= fromMinutes) return 0;
  return (toMinutes - fromMinutes) / 60;
}

function formatHourCount(value: number, lang: Lang): string {
  if (lang === "ru") {
    const abs = Math.abs(value);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    const unit = mod10 === 1 && mod100 !== 11 ? "час" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "часа" : "часов";
    return `${value} ${unit}`;
  }

  if (lang === "me") {
    const abs = Math.abs(value);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    const unit = mod10 === 1 && mod100 !== 11 ? "sat" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "sata" : "sati";
    return `${value} ${unit}`;
  }

  return `${value} ${value === 1 ? "hour" : "hours"}`;
}

function formatMinuteCount(value: number, lang: Lang): string {
  if (lang === "ru") {
    const abs = Math.abs(value);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    const unit = mod10 === 1 && mod100 !== 11 ? "минута" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "минуты" : "минут";
    return `${value} ${unit}`;
  }

  if (lang === "me") {
    return `${value} min`;
  }

  return `${value} ${value === 1 ? "minute" : "minutes"}`;
}

function formatDuration(hours: number, lang: Lang): string {
  if (!hours) return "—";
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return formatHourCount(wholeHours, lang);
  if (wholeHours === 0) return formatMinuteCount(minutes, lang);
  return `${formatHourCount(wholeHours, lang)} ${formatMinuteCount(minutes, lang)}`;
}

function genPublicToken(): string {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 10);
  return `pt_live_${ts}_${rnd}`;
}

function isIsoUtcTimestamp(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(v);
}

function getSlotLocalParts(slotStartUtc: string, slotEndUtc: string) {
  if (!isIsoUtcTimestamp(slotStartUtc) || !isIsoUtcTimestamp(slotEndUtc)) return null;

  const start = new Date(slotStartUtc);
  const end = new Date(slotEndUtc);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;

  const timeZone = "Europe/Podgorica";
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(start);
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const get = (type: string) => dateParts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const timeFrom = timeFmt.format(start);
  const timeTo = timeFmt.format(end);

  if (!isValidIsoDate(date) || !timeFrom || !timeTo) return null;
  return { date, timeFrom, timeTo };
}

export default function RequestPage() {
  const router = useRouter();
  const params = useParams<{ lang?: string }>();
  const sp = useSearchParams();

  const lang: Lang = useMemo(() => {
    const raw = params?.lang ?? "en";
    return isLang(raw) ? raw : "en";
  }, [params]);

  const tr = t(lang);
  const copy = requestCopy(lang);

  const boatSlug = sp.get("slug") ?? "";
  const boatTitle = sp.get("title") ?? boatSlug;
  const boatDocumentId = sp.get("boatDocumentId") ?? sp.get("documentId") ?? "";

  const experienceIdFromUrl = Number(sp.get("experienceId"));
  const experienceDocumentId = sp.get("experienceDocumentId") ?? "";
  const experienceTitle = sp.get("experienceTitle") ?? "";
  const hasNumericExperienceId =
    Number.isSafeInteger(experienceIdFromUrl) &&
    experienceIdFromUrl > 0;
  const hasExperienceDocumentId = /^[A-Za-z0-9_-]{8,80}$/.test(experienceDocumentId.trim());
  const hasExperience = hasExperienceDocumentId || hasNumericExperienceId;

  const boatIdFromUrl = Number(sp.get("boatId"));
  const slotStartUtc = sp.get("slot_start_utc") ?? "";
  const slotEndUtc = sp.get("slot_end_utc") ?? "";
  const slotParts = useMemo(
    () => getSlotLocalParts(slotStartUtc, slotEndUtc),
    [slotStartUtc, slotEndUtc]
  );
  const hasHoldSlot =
    Number.isFinite(boatIdFromUrl) &&
    boatIdFromUrl > 0 &&
    isIsoUtcTimestamp(slotStartUtc) &&
    isIsoUtcTimestamp(slotEndUtc);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [date, setDate] = useState(slotParts?.date ?? "");
  const [timeFrom, setTimeFrom] = useState(slotParts?.timeFrom ?? "10:00");
  const [timeTo, setTimeTo] = useState(slotParts?.timeTo ?? "18:00");

  const guestsFromUrl = Number(sp.get("guests"));
  const [peopleCount, setPeopleCount] = useState<number>(
    Number.isFinite(guestsFromUrl) && guestsFromUrl > 0
      ? Math.floor(guestsFromUrl)
      : 1
  );
  const [needSkipper, setNeedSkipper] = useState<boolean>(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const formOpenedAtRef = useRef<number>(Date.now());
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMailto, setFallbackMailto] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteOk | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    if (!boatSlug || !hasExperience || !hasHoldSlot) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const qs = new URLSearchParams({
      boatSlug,
      locale: lang === "me" ? "sr-Latn-ME" : lang,
      slot_start_utc: slotStartUtc,
      slot_end_utc: slotEndUtc,
    });

    if (boatDocumentId) qs.set("boatDocumentId", boatDocumentId);
    if (hasExperienceDocumentId) qs.set("experienceDocumentId", experienceDocumentId.trim());
    if (hasNumericExperienceId) qs.set("experienceId", String(experienceIdFromUrl));

    setQuote(null);
    setQuoteError(null);
    setQuoteLoading(true);

    fetch(`/api/request/quote?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as QuoteOk | QuoteFail | null;
        if (!res.ok || !json || json.ok !== true) {
          const fail = json as QuoteFail | null;
          throw new Error(fail?.error || "quote_failed");
        }
        setQuote(json);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setQuoteError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoteLoading(false);
      });

    return () => controller.abort();
  }, [
    boatSlug,
    boatDocumentId,
    experienceIdFromUrl,
    experienceDocumentId,
    hasExperience,
    hasExperienceDocumentId,
    hasNumericExperienceId,
    hasHoldSlot,
    lang,
    slotEndUtc,
    slotStartUtc,
  ]);

  const hours = useMemo(() => {
    if (quote?.durationHours && Number.isFinite(quote.durationHours)) {
      return quote.durationHours;
    }

    if (!timeFrom || !timeTo) return 0;
    return diffHours(timeFrom, timeTo);
  }, [quote, timeFrom, timeTo]);

  const ownerAmount = quote?.ownerAmount ?? 0;
  const marketplaceFeeAmount = quote?.marketplaceFeeAmount ?? 0;
  const customerTotalAmount = quote?.customerTotalAmount ?? 0;
  const currency = quote?.currency ?? "EUR";
  const splitCopy = paymentSplitCopy[lang];
  const quoteErrorText = quoteErrorMessage(quoteError, lang, copy.quoteUnavailable);

  const timeOk =
    hasExperience &&
    hasHoldSlot &&
    Boolean(quote) &&
    hours > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setFallbackMailto(null);

    const fail = (msg: string) => {
      setError(msg);
      inFlight.current = false;
      return;
    };

    if (!boatSlug || !boatTitle) {
      return fail(copy.missingBoat);
    }

    if (!name.trim() || !phone.trim() || !date) {
      return fail(copy.requiredFields);
    }

    if (!isValidIsoDate(date)) {
      return fail(copy.invalidDate);
    }

    if (!timeFrom || !timeTo || hours <= 0) {
      setError(copy.invalidTimeRange);
      inFlight.current = false;
      return;
    }

    if (!quote) {
      setError(quoteErrorText);
      inFlight.current = false;
      return;
    }

    const publicToken = genPublicToken();

    const payload: RequestPayload = {
      boatSlug,
      boatTitle,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() ? email.trim() : undefined,

      dateFrom: date,
      dateTo: date,

      timeFrom,
      timeTo,

      hours,
      experienceId: quote?.routeId ?? (hasNumericExperienceId ? experienceIdFromUrl : undefined),
      experienceDocumentId: quote?.routeDocumentId ?? (hasExperienceDocumentId ? experienceDocumentId.trim() : undefined),

      peopleCount: Number.isFinite(peopleCount) ? peopleCount : 1,
      needSkipper,
      message: message.trim() ? message.trim() : undefined,

      publicToken: publicToken ?? undefined,
      hp: "",
      client_ts: formOpenedAtRef.current,
    };

    setBusy(true);
    try {
      if (hasHoldSlot) {
        const holdRes = await fetch("/api/hold", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": `hold:${publicToken}`,
          },
          body: JSON.stringify({
            boatId: boatIdFromUrl,
            slot_start_utc: slotStartUtc,
            slot_end_utc: slotEndUtc,
          }),
        });

        const holdJson = (await holdRes.json().catch(() => null)) as HoldOk | HoldFail | null;
        if (!holdRes.ok || !holdJson || holdJson.ok !== true) {
          const holdFailure = holdJson as HoldFail | null;
          const holdError =
            holdFailure && typeof holdFailure === "object"
              ? String(holdFailure.code || holdFailure.error || "slot_not_available")
              : "slot_not_available";
          setError(`${copy.selectedSlotUnavailable} (${holdError}). ${copy.chooseAnotherSlot}`);
          return;
        }
      }

      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiOk | ApiFail;

      if (json && "ok" in json && json.ok) {
        const token = typeof json.token === "string" ? json.token.trim() : "";
        const createdId = typeof json.id === "number" ? json.id : 0;

        if (createdId <= 0) {
          setError(copy.requestNotCreated);
          inFlight.current = false;
          setBusy(false);
          return;
        }

        if (!token) {
          setError(copy.missingToken);
          inFlight.current = false;
          setBusy(false);
          return;
        }

        router.push(`/${lang}/payments/${encodeURIComponent(token)}`);
        return;
      }

      const msg = json && "error" in json ? json.error : copy.unknownError;
      setError(msg);
      const fm = json && "fallbackMailto" in json ? json.fallbackMailto : undefined;
      setFallbackMailto(fm ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  const canSubmit =
    !busy &&
    Boolean(boatSlug) &&
    Boolean(name.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(date) &&
    Boolean(timeFrom) &&
    Boolean(timeTo) &&
    timeOk &&
    !quoteLoading &&
    !quoteError &&
    ownerAmount > 0 &&
    marketplaceFeeAmount > 0 &&
    customerTotalAmount > 0;

  const summaryRows = [
    { label: copy.summaryBoat, value: boatTitle || boatSlug || "—" },
    ...(hasExperience ? [{ label: lang === "ru" ? "Маршрут" : lang === "me" ? "Ruta" : "Route", value: quote?.routeTitle || experienceTitle || experienceDocumentId || `#${experienceIdFromUrl}` }] : []),
    { label: copy.summaryDate, value: date || "—" },
    { label: copy.summaryTimeFrom, value: timeFrom || "—" },
    { label: copy.summaryTimeTo, value: timeTo || "—" },
    { label: copy.summaryDuration, value: hours ? formatDuration(hours, lang) : "—" },
    { label: copy.summaryPeople, value: Number.isFinite(peopleCount) && peopleCount > 0 ? String(peopleCount) : "—" },
    ...(needSkipper ? [{ label: copy.summarySkipper, value: copy.summarySkipperRequested }] : []),
  ];

  if (!boatSlug.trim()) {
    return (
      <main className="main">
        <div className="container request-container">
          <section
            aria-labelledby="request-empty-title"
            style={{
              marginTop: 42,
              maxWidth: 720,
              border: "1px solid rgba(255, 255, 255, 0.14)",
              borderRadius: 18,
              padding: 24,
              background: "rgba(255, 255, 255, 0.055)",
            }}
          >
            <p className="kicker request-eyebrow">{copy.reservationRequest}</p>
            <h1 id="request-empty-title" className="h1 request-title">
              {copy.chooseBoatFirst}
            </h1>
            <p style={{ margin: "12px 0 0", color: "rgba(255, 255, 255, 0.74)", lineHeight: 1.6 }}>
              {copy.chooseBoatFirstText}
            </p>
            <div className="actions" style={{ marginTop: 22 }}>
              <Link className="button" href={`/${lang}/boats`}>
                {copy.browseBoats}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container request-container">
        <div className="detail-top request-top">
          <div>
            <p className="kicker request-eyebrow">{copy.reservationRequest}</p>
            <h1 className="h1 request-title">{tr.booking.title}</h1>
          </div>
          <Link className="backlink" href={`/${lang}/boats/${encodeURIComponent(boatSlug || "")}`}>
            ← {tr.boat.back_to_list}
          </Link>
        </div>

        <section className="request-summary" aria-label={copy.bookingSummary}>
          <div className="summary-head">
            <div>
              <div className="kicker">{copy.selectedTrip}</div>
              <h2>{boatTitle || boatSlug || copy.boatReservation}</h2>
            </div>
            <div className="summary-total">
              <span>{copy.estimatedTotal}</span>
              <b>{customerTotalAmount ? formatPaymentAmount(customerTotalAmount, currency, lang) : "—"}</b>
            </div>
          </div>

          <div className="summary-payment-split">
            <div>
              <span>{copy.payOnlineNow}</span>
              <b>{marketplaceFeeAmount ? formatPaymentAmount(marketplaceFeeAmount, currency, lang) : "—"}</b>
            </div>
            <div>
              <span>{copy.payOwnerDuringTrip}</span>
              <b>{ownerAmount ? formatPaymentAmount(ownerAmount, currency, lang) : "—"}</b>
            </div>
          </div>

          <p className="summary-split-note">{copy.splitPaymentText}</p>

          <div className="summary-grid">
            {summaryRows.map((row) => (
              <div className="summary-item" key={row.label}>
                <span>{row.label}</span>
                <b>{row.value}</b>
              </div>
            ))}
          </div>
        </section>

        <form className="request-form" onSubmit={onSubmit}>
          <div className="request-layout">
            <section className="request-card">
              <div className="section-heading">
                <h2>{copy.contactDetails}</h2>
                <p>{copy.contactDetailsText}</p>
              </div>

              <div className="field-grid">
                <label>
                  <div className="kicker">{tr.booking.name} *</div>
                  <input className="request-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>

                <label>
                  <div className="kicker">{tr.booking.phone} *</div>
                  <input className="request-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </label>

                <label className="field-full">
                  <div className="kicker">{tr.booking.email}</div>
                  <input
                    className="request-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                  />
                </label>
              </div>
            </section>

            <section className="request-card">
              <div className="section-heading">
                <h2>{copy.tripDetails}</h2>
                <p>{copy.tripDetailsText}</p>
              </div>

              <div className="trip-grid">
                <label>
                  <div className="kicker">{tr.booking.dateFrom} *</div>
                  <input
                    className="request-input"
                    value={date}
                    onChange={(e) => {
                      if (hasHoldSlot) return;
                      const v = e.target.value;
                      const cleaned = v.replace(/[^\d-]/g, "").slice(0, 10);
                      setDate(cleaned);
                    }}
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    aria-label={copy.dateAria}
                    title="YYYY-MM-DD"
                    pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                    readOnly={hasHoldSlot}
                    required
                  />
                </label>

                <label>
                  <div className="kicker">{copy.timeFrom} *</div>
                  <input
                    className={`request-input ${timeOk ? "" : "request-input-error"}`}
                    value={timeFrom}
                    onChange={(e) => {
                      if (hasHoldSlot) return;
                      setTimeFrom(e.target.value);
                    }}
                    type="time"
                    step={1800}
                    readOnly={hasHoldSlot}
                    required
                  />
                </label>

                <label>
                  <div className="kicker">{copy.timeTo} *</div>
                  <input
                    className={`request-input ${timeOk ? "" : "request-input-error"}`}
                    value={timeTo}
                    onChange={(e) => {
                      if (hasHoldSlot) return;
                      setTimeTo(e.target.value);
                    }}
                    type="time"
                    step={1800}
                    readOnly={hasHoldSlot}
                    required
                  />
                </label>
              </div>

              {!timeOk ? (
                <div className="kicker field-note">
                  {quoteLoading
                    ? copy.preparing
                    : quoteError
                      ? quoteErrorText
                      : copy.endAfterStart}
                </div>
              ) : null}

              <div className="guest-row">
                <label>
                  <div className="kicker">{tr.booking.peopleCount}</div>
                  <input
                    className="request-input"
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    type="number"
                    min={1}
                  />
                </label>

                <label className="checkbox-card">
                  <input checked={needSkipper} onChange={(e) => setNeedSkipper(e.target.checked)} type="checkbox" />
                  <span>
                    <b>{tr.booking.needSkipper}</b>
                    <small>{copy.skipperHelp}</small>
                  </span>
                </label>
              </div>

              <label>
                <div className="kicker">{tr.booking.message}</div>
                <textarea
                  className="request-input request-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </label>
            </section>

            <section className="request-card pricing-card" aria-label={copy.pricingAndPayment}>
              <div className="section-heading">
                <h2>{copy.priceEstimate}</h2>
                <p>{copy.priceEstimateText}</p>
              </div>

	              <div className="price-lines">
	                <div>
	                  <span>{splitCopy.tripPrice}</span>
	                  <b>{ownerAmount ? formatPaymentAmount(ownerAmount, currency, lang) : "—"}</b>
	                </div>
	                <div>
	                  <span>{copy.summaryDuration}</span>
	                  <b>{hours ? formatDuration(hours, lang) : "—"}</b>
	                </div>
	                <div>
	                  <span>{copy.serviceFee} ({Math.round(MARKETPLACE_FEE_RATE * 100)}%)</span>
	                  <b>{marketplaceFeeAmount ? formatPaymentAmount(marketplaceFeeAmount, currency, lang) : "—"}</b>
	                </div>
	                <div className="price-total">
	                  <span>{copy.estimatedTotal}</span>
	                  <b>{customerTotalAmount ? formatPaymentAmount(customerTotalAmount, currency, lang) : "—"}</b>
	                </div>
	                <div className="pay-now-line">
	                  <span>{copy.payOnlineNow}</span>
	                  <b>{marketplaceFeeAmount ? formatPaymentAmount(marketplaceFeeAmount, currency, lang) : "—"}</b>
	                </div>
	                <div>
	                  <span>{copy.payOwnerDuringTrip}</span>
	                  <b>{ownerAmount ? formatPaymentAmount(ownerAmount, currency, lang) : "—"}</b>
	                </div>
	              </div>
            </section>

            <section className="trust-card" aria-label={copy.reservationProtection}>
              <div>
                <b>{copy.secureAuthorization}</b>
                <span>{copy.secureAuthorizationText}</span>
              </div>
              <div>
                <b>{copy.ownerConfirms}</b>
                <span>{copy.ownerConfirmsText}</span>
              </div>
              <div>
                <b>{copy.captureAfterApproval}</b>
                <span>{copy.captureAfterApprovalText}</span>
              </div>
            </section>

            {error ? (
              <div className="request-card error-card">
                <div style={{ fontWeight: 800 }}>{tr.booking.errorTitle}</div>
                <div className="kicker" style={{ marginTop: 6 }}>
                  {tr.booking.errorText}
                </div>
                <div className="kicker" style={{ marginTop: 6 }}>{error}</div>
                {fallbackMailto ? (
                  <a className="button secondary" style={{ marginTop: 10 }} href={fallbackMailto}>
                    {copy.emailFallback}
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="submit-row">
              <button
                className={`request-submit ${canSubmit ? "is-active" : "is-disabled"}`}
                type="submit"
                disabled={!canSubmit}
                aria-label={canSubmit ? copy.continueAuthorization : (quoteError ? quoteErrorText : copy.requiredFields)}
              >
                {busy ? copy.preparing : copy.continueAuthorization}
              </button>

              <Link className="backlink" href={`/${lang}/boats`}>
                ← {tr.boat.back_to_list}
              </Link>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        .request-container {
          padding-bottom: 48px;
        }

        .request-top {
          align-items: flex-start;
          gap: 18px;
        }

        .request-eyebrow {
          margin: 0 0 6px;
          letter-spacing: 0;
        }

        .request-title {
          margin: 0;
        }

        .request-summary,
        .request-card,
        .trust-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.045);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        }

        .request-summary {
          margin-top: 18px;
          max-width: 960px;
          border-radius: 18px;
          padding: 18px;
        }

        .summary-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
        }

        .summary-head h2,
        .section-heading h2 {
          margin: 4px 0 0;
          font-size: 22px;
          line-height: 1.15;
        }

        .summary-total {
          min-width: 170px;
          text-align: right;
        }

        .summary-total span,
        .summary-item span,
        .price-lines span,
        .section-heading p,
        .trust-card span,
        .checkbox-card small {
          color: rgba(255, 255, 255, 0.68);
        }

        .summary-total span,
        .summary-item span,
        .price-lines span {
          display: block;
          font-size: 13px;
        }

        .summary-total b {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          line-height: 1.1;
        }

	        .summary-grid {
	          display: grid;
	          grid-template-columns: repeat(4, minmax(0, 1fr));
	          gap: 12px;
	          padding-top: 16px;
	        }

	        .summary-payment-split {
	          display: grid;
	          grid-template-columns: repeat(2, minmax(0, 1fr));
	          gap: 12px;
	          padding-top: 16px;
	        }

	        .summary-payment-split > div {
	          border: 1px solid rgba(248, 214, 111, 0.28);
	          border-radius: 10px;
	          background: rgba(248, 214, 111, 0.10);
	          padding: 14px;
	        }

	        .summary-payment-split span,
	        .summary-split-note {
	          color: rgba(255, 255, 255, 0.72);
	        }

	        .summary-payment-split span {
	          display: block;
	          font-size: 13px;
	        }

	        .summary-payment-split b {
	          display: block;
	          margin-top: 5px;
	          font-size: 20px;
	          line-height: 1.2;
	          overflow-wrap: anywhere;
	        }

	        .summary-split-note {
	          margin: 12px 0 0;
	          line-height: 1.45;
	        }

        .summary-item {
          min-width: 0;
        }

        .summary-item b {
          display: block;
          margin-top: 5px;
          overflow-wrap: anywhere;
        }

        .request-form {
          margin-top: 18px;
          max-width: 960px;
        }

        .request-layout {
          display: grid;
          gap: 14px;
        }

        .request-card {
          border-radius: 16px;
          padding: 18px;
        }

        .section-heading {
          margin-bottom: 16px;
        }

        .section-heading h2 {
          font-size: 18px;
        }

        .section-heading p {
          margin: 6px 0 0;
          line-height: 1.45;
        }

        .field-grid,
        .trip-grid,
        .guest-row {
          display: grid;
          gap: 12px;
        }

        .field-grid {
          grid-template-columns: 1fr 1fr;
        }

        .field-full {
          grid-column: 1 / -1;
        }

        .trip-grid {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .guest-row {
          grid-template-columns: minmax(160px, 0.5fr) minmax(220px, 1fr);
          align-items: end;
          margin: 12px 0;
        }

        .request-input {
          width: 100%;
          margin-top: 6px;
          padding: 12px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
          color: inherit;
        }

        .request-input:focus {
          outline: 2px solid rgba(255, 255, 255, 0.34);
          outline-offset: 2px;
        }

        .request-input-error {
          border-color: rgba(255, 120, 120, 0.8);
        }

        .request-textarea {
          min-height: 116px;
          resize: vertical;
        }

        .field-note {
          margin-top: 10px;
          opacity: 0.9;
        }

        .checkbox-card {
          display: flex;
          gap: 10px;
          align-items: center;
          min-height: 49px;
          padding: 11px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
        }

        .checkbox-card input {
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
        }

        .checkbox-card span,
        .checkbox-card small {
          display: block;
        }

        .checkbox-card b {
          font-size: 14px;
        }

        .checkbox-card small {
          margin-top: 2px;
          line-height: 1.3;
        }

        .price-lines {
          display: grid;
          gap: 10px;
        }

        .price-lines > div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 4px 0;
        }

        .price-lines b {
          text-align: right;
        }

	        .price-total {
	          margin-top: 4px;
	          padding-top: 14px !important;
	          border-top: 1px solid rgba(255, 255, 255, 0.12);
	        }

	        .pay-now-line {
	          margin-top: 4px;
	          padding-top: 14px !important;
	          border-top: 1px solid rgba(248, 214, 111, 0.26);
	        }

        .price-total span,
        .price-total b {
          font-size: 18px;
          color: inherit;
        }

        .trust-card {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.10);
        }

        .trust-card > div {
          padding: 16px;
          background: rgba(255, 255, 255, 0.045);
        }

        .trust-card b,
        .trust-card span {
          display: block;
        }

        .trust-card span {
          margin-top: 6px;
          line-height: 1.4;
        }

        .error-card {
          border-color: rgba(255, 120, 120, 0.45);
        }

        .submit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .request-submit {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding-left: 18px;
          padding-right: 18px;
          border-radius: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .request-submit.is-active {
          border: 1px solid rgba(248, 214, 111, 0.9);
          background: rgb(248, 214, 111);
          color: rgb(25, 28, 31);
          box-shadow: 0 12px 28px rgba(248, 214, 111, 0.18);
          cursor: pointer;
        }

        .request-submit.is-disabled {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.58);
          box-shadow: none;
          cursor: not-allowed;
        }

        @media (max-width: 820px) {
          .request-container {
            padding-bottom: 34px;
          }

          .request-top {
            display: grid;
          }

          .request-summary,
          .request-card {
            border-radius: 14px;
            padding: 14px;
          }

          .summary-head {
            display: grid;
            gap: 12px;
          }

          .summary-total {
            min-width: 0;
            text-align: left;
          }

	          .summary-grid {
	            grid-template-columns: 1fr 1fr;
	            gap: 14px 12px;
	          }

	          .summary-payment-split {
	            grid-template-columns: 1fr;
	          }

          .field-grid,
          .trip-grid,
          .guest-row,
          .trust-card {
            grid-template-columns: 1fr;
          }

          .section-heading {
            margin-bottom: 14px;
          }

          .price-lines > div {
            align-items: flex-start;
          }

          .submit-row {
            display: grid;
          }

          .request-submit {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .summary-head h2 {
            font-size: 20px;
          }

          .summary-total b {
            font-size: 22px;
          }
        }
      `}</style>
    </main>
  );
}
