"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isLang, type Lang } from "@/i18n";

type RegisterResponse = {
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

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams<{ lang?: string }>();

  const lang: Lang = useMemo(() => {
    const raw = params?.lang ?? "en";
    return isLang(raw) ? raw : "en";
  }, [params]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    lang === "ru" ? "Регистрация" : lang === "me" ? "Registracija" : "Register";
  const subtitle =
    lang === "ru"
      ? "Создайте аккаунт владельца лодки."
      : lang === "me"
        ? "Napravite nalog vlasnika plovila."
        : "Create your owner account.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("https://api.sharmar.me/api/auth/local/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });

      const json = (await res.json()) as RegisterResponse;

      if (!res.ok || !json.jwt) {
        const msg =
          json?.error?.message ||
          (lang === "ru"
            ? "Не удалось зарегистрироваться."
            : lang === "me"
              ? "Registracija nije uspjela."
              : "Registration failed.");
        setError(msg);
        return;
      }

      localStorage.setItem("sharmar_jwt", json.jwt);
      localStorage.setItem("sharmar_user", JSON.stringify(json.user ?? null));

      router.push(`/${lang}/login`);
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
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10 rounded-md border border-black/[.12] px-3 text-sm dark:border-white/[.18] bg-transparent"
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                minLength={6}
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
                    ? "Отправка..."
                    : lang === "me"
                      ? "Slanje..."
                      : "Submitting..."
                  : title}
              </button>

              <Link className="button secondary" href={`/${lang}/login`}>
                {lang === "ru" ? "Уже есть аккаунт?" : lang === "me" ? "Već imate nalog?" : "Already have an account?"}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
