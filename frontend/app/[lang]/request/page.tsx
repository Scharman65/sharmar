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
  peopleCount?: number;
  needSkipper?: boolean;
  message?: string;
};

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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [needSkipper, setNeedSkipper] = useState<boolean>(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fallbackMailto, setFallbackMailto] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFallbackMailto(null);

    if (!boatSlug || !boatTitle) {
      setError("Missing boat data in URL.");
      return;
    }
    if (!name.trim() || !phone.trim() || !dateFrom || !dateTo) {
      setError("Please fill required fields.");
      return;
    }

    const payload: RequestPayload = {
      boatSlug,
      boatTitle,
      name: name.trim(),
      phone: phone.trim(),
      dateFrom,
      dateTo,
      peopleCount: Number.isFinite(peopleCount) ? peopleCount : 1,
      needSkipper,
      message: message.trim() ? message.trim() : undefined,
      email: email.trim() ? email.trim() : undefined,
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

        <form onSubmit={onSubmit} style={{ marginTop: 18, maxWidth: 620 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="kicker">{tr.booking.name} *</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
              />
            </label>

            <label>
              <div className="kicker">{tr.booking.phone} *</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
              />
            </label>

            <label>
              <div className="kicker">{tr.booking.email}</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <div className="kicker">{tr.booking.dateFrom} *</div>
                <input
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  type="date"
                  required
                  style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
                />
              </label>

              <label>
                <div className="kicker">{tr.booking.dateTo} *</div>
                <input
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  type="date"
                  required
                  style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
                />
              </label>
            </div>

            <label>
              <div className="kicker">{tr.booking.peopleCount}</div>
              <input
                value={peopleCount}
                onChange={(e) => setPeopleCount(Number(e.target.value))}
                type="number"
                min={1}
                style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                checked={needSkipper}
                onChange={(e) => setNeedSkipper(e.target.checked)}
                type="checkbox"
              />
              <span className="kicker">{tr.booking.needSkipper}</span>
            </label>

            <label>
              <div className="kicker">{tr.booking.message}</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{ width: "100%", marginTop: 6, padding: "12px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "inherit" }}
              />
            </label>

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
              disabled={busy}
              style={{ cursor: busy ? "not-allowed" : "pointer" }}
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
    </main>
  );
}
