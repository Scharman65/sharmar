"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

function copy(lang: string) {
  if (lang === "ru") {
    return {
      title: "Восстановление пароля",
      intro: "Введите email аккаунта владельца. Если адрес зарегистрирован, мы отправим инструкцию.",
      email: "Email",
      submit: "Отправить инструкцию",
      sending: "Отправка...",
      neutral: "Если такой адрес зарегистрирован, мы отправили инструкцию.",
      unavailable: "Сервис email сейчас недоступен. Попробуйте позже.",
      tooMany: "Слишком много попыток. Попробуйте позже.",
      login: "Вернуться ко входу",
    };
  }
  if (lang === "me") {
    return {
      title: "Reset lozinke",
      intro: "Unesite email naloga vlasnika. Ako je adresa registrovana, poslaćemo instrukcije.",
      email: "Email",
      submit: "Pošalji instrukcije",
      sending: "Slanje...",
      neutral: "Ako je adresa registrovana, poslali smo instrukcije.",
      unavailable: "Email servis trenutno nije dostupan. Pokušajte kasnije.",
      tooMany: "Previše pokušaja. Pokušajte kasnije.",
      login: "Nazad na prijavu",
    };
  }
  return {
    title: "Forgot password",
    intro: "Enter your owner account email. If the address is registered, we will send instructions.",
    email: "Email",
    submit: "Send instructions",
    sending: "Sending...",
    neutral: "If the address is registered, we sent instructions.",
    unavailable: "Email service is currently unavailable. Try again later.",
    tooMany: "Too many attempts. Try again later.",
    login: "Back to login",
  };
}

export default function OwnerForgotPasswordForm() {
  const params = useParams<{ lang?: string }>();
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  const c = copy(lang);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/owner-forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.code === "too_many_attempts" ? c.tooMany : c.unavailable);
        return;
      }
      setMessage(c.neutral);
    } catch {
      setError(c.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-top">
          <h1 className="h1">{c.title}</h1>
          <p className="kicker">{c.intro}</p>
        </div>
        <form className="card" style={{ padding: 20, display: "grid", gap: 14 }} onSubmit={submit}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{c.email}</span>
            <input className="w-full rounded-md border border-black/15 px-3 py-2 outline-none" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          {message ? <p style={{ margin: 0, color: "#15803d" }}>{message}</p> : null}
          {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
          <button className="button" type="submit" disabled={busy}>{busy ? c.sending : c.submit}</button>
          <Link href={`/${lang}/owner-login`} style={{ textDecoration: "underline" }}>{c.login}</Link>
        </form>
      </div>
    </main>
  );
}
