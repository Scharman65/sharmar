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

  return (
    <main className="main">
      <div className="container">
        <div className="detail-top">
          <h1 className="h1">{tr.booking.title}</h1>
          <Link className="backlink" href={`/${lang}/boats/${encodeURIComponent(boatSlug || "")}`}>
            ← {tr.boat.back_to_list}
          </Link>
        </div>

        <p className="kicker" style={{ marginTop: 6 }}>
          {boatTitle ? boatTitle : boatSlug}
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 18, maxWidth: 720 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="kicker">{tr.booking.name} *</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                }}
              />
            </label>

            <label>
              <div className="kicker">{tr.booking.phone} *</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                }}
              />
            </label>

            <label>
              <div className="kicker">{tr.booking.email}</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <label>
                <div className="kicker">{tr.booking.dateFrom} *</div>
                <input
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
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                  }}
                />
              </label>

              <label>
                <div className="kicker">Time from *</div>
                <input
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  type="time"
                  step={1800}
                  required
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: timeOk ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,120,120,0.8)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                  }}
                />
              </label>

              <label>
                <div className="kicker">Time to *</div>
                <input
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  type="time"
                  step={1800}
                  required
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: timeOk ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,120,120,0.8)",
                    background: "rgba(255,255,255,0.06)",
                    color: "inherit",
                  }}
                />
              </label>
            </div>

            {!timeOk ? (
              <div className="kicker" style={{ opacity: 0.9 }}>
                End time must be after start time.
              </div>
            ) : null}

            <label>
              <div className="kicker">{tr.booking.peopleCount}</div>
              <input
                value={peopleCount}
                onChange={(e) => setPeopleCount(Number(e.target.value))}
                type="number"
                min={1}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input checked={needSkipper} onChange={(e) => setNeedSkipper(e.target.checked)} type="checkbox" />
              <span className="kicker">{tr.booking.needSkipper}</span>
            </label>

            <label>
              <div className="kicker">{tr.booking.message}</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                }}
              />
            </label>

            <div
              style={{
                marginTop: 6,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Pricing</div>

              <div className="kicker" style={{ display: "grid", gap: 6 }}>
                <div>
                  Owner price per hour: <b>{money(PRICE_PER_HOUR, currency)}</b>
                </div>
                <div>
                  Hours: <b>{hours ? hours.toFixed(1) : "—"}</b>
                </div>
                <div>
                  Customer total: <b>{customerTotalAmount ? money(customerTotalAmount, currency) : "—"}</b>
                </div>
                <div>
                  Sharmar booking fee ({Math.round(MARKETPLACE_FEE_RATE * 100)}%): <b>{marketplaceFeeAmount ? money(marketplaceFeeAmount, currency) : "—"}</b>
                </div>
              </div>

              <div className="kicker" style={{ marginTop: 10, opacity: 0.85 }}>
                Prepayment is charged now. The remaining amount is paid later.
              </div>
            </div>

            {error ? (
              <div style={{ marginTop: 6 }}>
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

            <button
              className="button"
              type="submit"
              disabled={!canSubmit}
              style={{ cursor: canSubmit ? "pointer" : "not-allowed" }}
            >
              {busy ? "..." : tr.booking.send}
            </button>

            <div style={{ marginTop: 6 }}>
              <Link className="backlink" href={`/${lang}/boats`}>
                ← {tr.boat.back_to_list}
              </Link>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .container form > div > div[style*="grid-template-columns: 1fr 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
