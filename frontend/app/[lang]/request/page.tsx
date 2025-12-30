"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { isLang, t, type Lang } from "@/i18n";

type ApiOk = { ok: true; id: number };
type ApiFail = { ok: false; error: string; fallbackMailto?: string };

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
  prepaymentAmount?: number;
  currency?: string;

  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;
};

const DEPOSIT_RATE = 0.2;

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

  const [date, setDate] = useState("");
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("14:00");

  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [needSkipper, setNeedSkipper] = useState<boolean>(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fallbackMailto, setFallbackMailto] = useState<string | null>(null);

  const hours = useMemo(() => {
    if (!timeFrom || !timeTo) return 0;
    return diffHours(timeFrom, timeTo);
  }, [timeFrom, timeTo]);

  const totalPrice = useMemo(() => {
    if (!hours) return 0;
    return hours * PRICE_PER_HOUR;
  }, [hours, PRICE_PER_HOUR]);

  const prepaymentAmount = useMemo(() => {
    if (!totalPrice) return 0;
    return totalPrice * DEPOSIT_RATE;
  }, [totalPrice]);

  const timeOk = hours > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFallbackMailto(null);

    if (!boatSlug || !boatTitle) {
      setError("Missing boat data in URL.");
      return;
    }

    if (!name.trim() || !phone.trim() || !date) {
      setError("Please fill required fields.");
      return;
    }

    if (!timeFrom || !timeTo || !timeOk) {
      setError("Please choose a valid time range (end time must be after start time).");
      return;
    }

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
      prepaymentAmount,
      currency,

      peopleCount: Number.isFinite(peopleCount) ? peopleCount : 1,
      needSkipper,
      message: message.trim() ? message.trim() : undefined,
    };

    setBusy(true);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiOk | ApiFail;

      if (json && "ok" in json && json.ok) {
        router.push(`/${lang}/thanks`);
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
                  onChange={(e) => setDate(e.target.value)}
                  type="date"
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
                  Price per hour: <b>{money(PRICE_PER_HOUR, currency)}</b>
                </div>
                <div>
                  Hours: <b>{hours ? hours.toFixed(1) : "—"}</b>
                </div>
                <div>
                  Total: <b>{totalPrice ? money(totalPrice, currency) : "—"}</b>
                </div>
                <div>
                  Prepayment (20%): <b>{prepaymentAmount ? money(prepaymentAmount, currency) : "—"}</b>
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
