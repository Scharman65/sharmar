"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { isLang, t, type Lang } from "@/i18n";
import { MARKETPLACE_FEE_RATE } from "@/lib/pricing";

type ApiOk = { ok: true; id: number; token: string };
type ApiFail = { ok: false; error: string; fallbackMailto?: string };
type HoldOk = { ok: true; booking_id?: number | string; public_id?: string; expires_at?: string };
type HoldFail = { ok?: false; error?: string; code?: string };

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
  pricePerHour?: number;
  totalPrice?: number;
  ownerAmount?: number;
  marketplaceFeeAmount?: number;
  customerTotalAmount?: number;
  currency?: string;

  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;

  publicToken?: string;
  hp?: string;
  client_ts?: number;
};

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

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatDuration(hours: number): string {
  if (!hours) return "—";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) return `${wholeHours} ${wholeHours === 1 ? "hour" : "hours"}`;
  if (wholeHours === 0) return `${minutes} minutes`;
  return `${wholeHours}h ${minutes}m`;
}

function lsDraftKey(boatSlug: string, date: string, timeFrom: string, timeTo: string): string {
  return `sharmar:booking_request:public_token:v1:${boatSlug}:${date}:${timeFrom}:${timeTo}`;
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

  const boatSlug = sp.get("slug") ?? "";
  const boatTitle = sp.get("title") ?? boatSlug;

  const currency = sp.get("currency") ?? "EUR";
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

  const pricePerHourFromUrl = Number(sp.get("pph"));
  const pricePerHourFromEnv = Number(process.env.NEXT_PUBLIC_PRICE_PER_HOUR);
  const PRICE_PER_HOUR =
    Number.isFinite(pricePerHourFromUrl) && pricePerHourFromUrl > 0
      ? pricePerHourFromUrl
      : Number.isFinite(pricePerHourFromEnv) && pricePerHourFromEnv > 0
        ? pricePerHourFromEnv
        : 100;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [date, setDate] = useState(slotParts?.date ?? "");
  const [timeFrom, setTimeFrom] = useState(slotParts?.timeFrom ?? "10:00");
  const [timeTo, setTimeTo] = useState(slotParts?.timeTo ?? "14:00");

  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [needSkipper, setNeedSkipper] = useState<boolean>(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const formOpenedAtRef = useRef<number>(Date.now());
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMailto, setFallbackMailto] = useState<string | null>(null);

  const hours = useMemo(() => {
    if (!timeFrom || !timeTo) return 0;
    return diffHours(timeFrom, timeTo);
  }, [timeFrom, timeTo]);

  const ownerAmount = useMemo(() => {
    if (!hours) return 0;
    return hours * PRICE_PER_HOUR;
  }, [hours, PRICE_PER_HOUR]);

  const marketplaceFeeAmount = useMemo(() => {
    if (!ownerAmount) return 0;
    return ownerAmount * MARKETPLACE_FEE_RATE;
  }, [ownerAmount]);

  const customerTotalAmount = useMemo(() => {
    return ownerAmount + marketplaceFeeAmount;
  }, [ownerAmount, marketplaceFeeAmount]);

  const totalPrice = customerTotalAmount;

  const timeOk = hours > 0;

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
      return fail("Missing boat data in URL.");
    }

    if (!name.trim() || !phone.trim() || !date) {
      return fail("Please fill required fields.");
    }

    if (!isValidIsoDate(date)) {
      return fail("Please enter a valid date in YYYY-MM-DD format.");
    }

    if (!timeFrom || !timeTo || !timeOk) {
      setError("Please choose a valid time range (end time must be after start time).");
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
      pricePerHour: PRICE_PER_HOUR,
      totalPrice,
      ownerAmount,
      marketplaceFeeAmount,
      customerTotalAmount,
      currency,

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
          setError(`Selected slot is no longer available (${holdError}). Please choose another slot.`);
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
          setError("Booking request was not created. Please try again.");
          inFlight.current = false;
          setBusy(false);
          return;
        }

        if (!token) {
          setError("Missing booking token.");
          inFlight.current = false;
          setBusy(false);
          return;
        }

        router.push(`/${lang}/payments/${encodeURIComponent(token)}`);
        return;
      }

      const msg = json && "error" in json ? json.error : "Unknown error";
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
    timeOk;

  const summaryRows = [
    { label: "Boat", value: boatTitle || boatSlug || "—" },
    { label: "Date", value: date || "—" },
    { label: "Time from", value: timeFrom || "—" },
    { label: "Time to", value: timeTo || "—" },
    { label: "Duration", value: hours ? formatDuration(hours) : "—" },
    { label: "People", value: Number.isFinite(peopleCount) && peopleCount > 0 ? String(peopleCount) : "—" },
    ...(needSkipper ? [{ label: "Skipper", value: "Requested" }] : []),
  ];

  return (
    <main className="main">
      <div className="container request-container">
        <div className="detail-top request-top">
          <div>
            <p className="kicker request-eyebrow">Reservation request</p>
            <h1 className="h1 request-title">{tr.booking.title}</h1>
          </div>
          <Link className="backlink" href={`/${lang}/boats/${encodeURIComponent(boatSlug || "")}`}>
            ← {tr.boat.back_to_list}
          </Link>
        </div>

        <section className="request-summary" aria-label="Booking summary">
          <div className="summary-head">
            <div>
              <div className="kicker">Your selected trip</div>
              <h2>{boatTitle || boatSlug || "Boat reservation"}</h2>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{customerTotalAmount ? money(customerTotalAmount, currency) : "—"}</b>
            </div>
          </div>

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
                <h2>Contact details</h2>
                <p>These details are shared with the owner after you submit the request.</p>
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
                <h2>Trip details</h2>
                <p>Review the selected slot and adjust passenger details if needed.</p>
              </div>

              <div className="trip-grid">
                <label>
                  <div className="kicker">{tr.booking.dateFrom} *</div>
                  <input
                    className="request-input"
                    value={date}
                    onChange={(e) => {
                      const v = e.target.value;
                      const cleaned = v.replace(/[^\d-]/g, "").slice(0, 10);
                      setDate(cleaned);
                    }}
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    aria-label="Date (YYYY-MM-DD)"
                    title="YYYY-MM-DD"
                    pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                    required
                  />
                </label>

                <label>
                  <div className="kicker">Time from *</div>
                  <input
                    className={`request-input ${timeOk ? "" : "request-input-error"}`}
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    type="time"
                    step={1800}
                    required
                  />
                </label>

                <label>
                  <div className="kicker">Time to *</div>
                  <input
                    className={`request-input ${timeOk ? "" : "request-input-error"}`}
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    type="time"
                    step={1800}
                    required
                  />
                </label>
              </div>

              {!timeOk ? (
                <div className="kicker field-note">
                  End time must be after start time.
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
                    <small>Add this request for the owner to confirm.</small>
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

            <section className="request-card pricing-card" aria-label="Pricing and payment">
              <div className="section-heading">
                <h2>Price estimate</h2>
                <p>The estimate updates from the selected time range. Final capture happens only after owner approval.</p>
              </div>

              <div className="price-lines">
                <div>
                  <span>Boat rate</span>
                  <b>{money(PRICE_PER_HOUR, currency)} / hour</b>
                </div>
                <div>
                  <span>Duration</span>
                  <b>{hours ? formatDuration(hours) : "—"}</b>
                </div>
                <div>
                  <span>Sharmar service fee ({Math.round(MARKETPLACE_FEE_RATE * 100)}%)</span>
                  <b>{marketplaceFeeAmount ? money(marketplaceFeeAmount, currency) : "—"}</b>
                </div>
                <div className="price-total">
                  <span>Estimated total</span>
                  <b>{customerTotalAmount ? money(customerTotalAmount, currency) : "—"}</b>
                </div>
              </div>
            </section>

            <section className="trust-card" aria-label="Reservation protection">
              <div>
                <b>Secure Stripe authorization</b>
                <span>Your card authorization is handled securely with Stripe after you submit this request.</span>
              </div>
              <div>
                <b>Owner confirms before final booking</b>
                <span>The owner reviews the request before the booking is final.</span>
              </div>
              <div>
                <b>Capture only after owner approval</b>
                <span>If the owner declines, the authorization is released by your card issuer timing.</span>
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
                    Email fallback
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="submit-row">
              <button
                className="button request-submit"
                type="submit"
                disabled={!canSubmit}
                style={{ cursor: canSubmit ? "pointer" : "not-allowed" }}
              >
                {busy ? "Preparing secure authorization..." : "Continue to secure authorization"}
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
          padding-left: 18px;
          padding-right: 18px;
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
