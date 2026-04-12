"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isLang, type Lang } from "@/i18n";

type LoginResponse = {
  jwt?: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  error?: {
    status?: number;
    name?: string;
    message?: string;
    details?: unknown;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ lang?: string }>();

  const lang: Lang = useMemo(() => {
    const raw = params?.lang ?? "en";
    return isLang(raw) ? raw : "en";
  }, [params]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    lang === "ru" ? "Вход" : lang === "me" ? "Prijava" : "Login";
  const subtitle =
    lang === "ru"
      ? "Войдите в аккаунт владельца."
      : lang === "me"
        ? "Prijavite se u nalog vlasnika."
        : "Sign in to your owner account.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("https://api.sharmar.me/api/auth/local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const json = (await res.json()) as LoginResponse;

      if (!res.ok || !json.jwt) {
        const msg =
          json?.error?.message ||
          (lang === "ru"
            ? "Не удалось войти."
            : lang === "me"
              ? "Prijava nije uspjela."
              : "Login failed.");
        setError(msg);
        return;
      }

      localStorage.setItem("sharmar_jwt", json.jwt);
      localStorage.setItem("sharmar_user", JSON.stringify(json.user ?? null));

      router.push(`/${lang}/add`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === "ru"
            ? "Ошибка сети."
            : lang === "me"
              ? "Greška mreže."
              : "Network error."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="page-top">
          <h1 className="h1">{title}</h1>
          <p className="kicker">{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="card" style={{ padding: 24 }}>
          <div className="card-body" style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span>{lang === "ru" ? "Email или username" : lang === "me" ? "Email ili username" : "Email or username"}</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="h-10 rounded-md border border-black/[.12] px-3 text-sm dark:border-white/[.18] bg-transparent"
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-md border border-black/[.12] px-3 text-sm dark:border-white/[.18] bg-transparent"
              />
            </label>

            {error ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(220,38,38,.35)",
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="button secondary" disabled={busy}>
                {busy
                  ? lang === "ru"
                    ? "Вход..."
                    : lang === "me"
                      ? "Prijava..."
                      : "Signing in..."
                  : title}
              </button>

              <Link className="button secondary" href={`/${lang}/register`}>
                {lang === "ru" ? "Создать аккаунт" : lang === "me" ? "Napravite nalog" : "Create account"}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
