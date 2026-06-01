"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";


type LoginCopy = {
  ownerLogin: string;
  ownerBoatAccess: string;
  email: string;
  password: string;
  signIn: string;
  signingIn: string;
  invalidCredentials: string;
  tryAgain: string;
};

function pageCopy(lang: string): LoginCopy {
  if (lang === "ru") {
    return {
      ownerLogin: "Вход владельца",
      ownerBoatAccess: "Вход для владельца лодки",
      email: "Email",
      password: "Пароль",
      signIn: "Войти",
      signingIn: "Вход...",
      invalidCredentials: "Не удалось войти. Проверьте email и пароль.",
      tryAgain: "Не удалось войти. Попробуйте ещё раз.",
    };
  }

  if (lang === "me") {
    return {
      ownerLogin: "Prijava vlasnika",
      ownerBoatAccess: "Pristup za vlasnika plovila",
      email: "Email",
      password: "Lozinka",
      signIn: "Prijava",
      signingIn: "Prijava...",
      invalidCredentials: "Prijava nije uspjela. Provjerite email i lozinku.",
      tryAgain: "Prijava nije uspjela. Pokušajte ponovo.",
    };
  }

  return {
    ownerLogin: "Owner login",
    ownerBoatAccess: "Boat owner access",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    invalidCredentials: "Unable to sign in. Check your email and password.",
    tryAgain: "Unable to sign in. Please try again.",
  };
}


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
        setError(pageCopy(lang).invalidCredentials);
        return;
      }

      await fetch("/api/auth/owner-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: json.jwt }),
      });
      router.push(`/${lang}/owner-dashboard`);
    } catch {
      setError(pageCopy(lang).tryAgain);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-top">
          <h1 className="h1">{pageCopy(lang).ownerLogin}</h1>
          <p className="kicker">{pageCopy(lang).ownerBoatAccess}</p>
        </div>

        <form className="card" style={{ padding: 20, display: "grid", gap: 14 }} onSubmit={onSubmit}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{pageCopy(lang).email}</span>
            <input className={inputBase()} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="email" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{pageCopy(lang).password}</span>
            <input className={inputBase()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>

          {error ? <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p> : null}

          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? pageCopy(lang).signingIn : pageCopy(lang).signIn}
          </button>
        </form>
      </div>
    </main>
  );
}
