"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

function inputBase() {
  return "w-full rounded-md border border-black/15 px-3 py-2 outline-none";
}

export default function OwnerLoginForm() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const lang = typeof params?.lang === "string" ? params.lang : "en";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || "https://api.sharmar.me"}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.jwt) {
        setError("Не удалось войти. Проверьте email и пароль.");
        return;
      }

      await fetch("/api/auth/owner-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: json.jwt }),
      });
      router.push(`/${lang}/owner-dashboard`);
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-top">
          <h1 className="h1">Owner login</h1>
          <p className="kicker">Вход для владельца лодки</p>
        </div>

        <form className="card" style={{ padding: 20, display: "grid", gap: 14 }} onSubmit={onSubmit}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input className={inputBase()} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="email" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input className={inputBase()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>

          {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
