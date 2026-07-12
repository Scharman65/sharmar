"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

function copy(lang: string) {
  if (lang === "ru") {
    return {
      title: "Новый пароль",
      password: "Новый пароль",
      confirm: "Повторите пароль",
      requirements: "Минимум 10 символов, строчные и заглавные буквы, цифра.",
      submit: "Сохранить пароль",
      saving: "Сохранение...",
      success: "Пароль изменён. Войдите заново.",
      login: "Перейти ко входу",
      expired: "Ссылка истекла или уже использована.",
      mismatch: "Пароли не совпадают.",
      tooMany: "Слишком много попыток. Попробуйте позже.",
      weak: "Пароль не соответствует требованиям.",
    };
  }
  if (lang === "me") {
    return {
      title: "Nova lozinka",
      password: "Nova lozinka",
      confirm: "Ponovite lozinku",
      requirements: "Najmanje 10 znakova, mala i velika slova i broj.",
      submit: "Sačuvaj lozinku",
      saving: "Čuvanje...",
      success: "Lozinka je promijenjena. Prijavite se ponovo.",
      login: "Idi na prijavu",
      expired: "Link je istekao ili je već iskorišćen.",
      mismatch: "Lozinke se ne poklapaju.",
      tooMany: "Previše pokušaja. Pokušajte kasnije.",
      weak: "Lozinka ne ispunjava uslove.",
    };
  }
  return {
    title: "New password",
    password: "New password",
    confirm: "Repeat password",
    requirements: "At least 10 characters, lowercase and uppercase letters, and a number.",
    submit: "Save password",
    saving: "Saving...",
    success: "Password changed. Sign in again.",
    login: "Go to login",
    expired: "The link has expired or was already used.",
    mismatch: "Passwords do not match.",
    tooMany: "Too many attempts. Try again later.",
    weak: "Password does not meet the requirements.",
  };
}

export default function OwnerResetPasswordForm() {
  const params = useParams<{ lang?: string }>();
  const searchParams = useSearchParams();
  const lang = typeof params?.lang === "string" ? params.lang : "en";
  const c = copy(lang);
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : c.expired);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/owner-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const code = json?.code;
        setError(code === "password_mismatch" ? c.mismatch : code === "too_many_attempts" ? c.tooMany : code?.startsWith("password_") ? c.weak : c.expired);
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError(c.expired);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-top">
          <h1 className="h1">{c.title}</h1>
          <p className="kicker">{c.requirements}</p>
        </div>
        <form className="card" style={{ padding: 20, display: "grid", gap: 14 }} onSubmit={submit}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{c.password}</span>
            <input className="w-full rounded-md border border-black/15 px-3 py-2 outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" disabled={success || !token} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{c.confirm}</span>
            <input className="w-full rounded-md border border-black/15 px-3 py-2 outline-none" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={success || !token} />
          </label>
          {success ? <p style={{ margin: 0, color: "#15803d" }}>{c.success}</p> : null}
          {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
          <button className="button" type="submit" disabled={busy || success || !token}>{busy ? c.saving : c.submit}</button>
          <Link href={`/${lang}/owner-login`} style={{ textDecoration: "underline" }}>{c.login}</Link>
        </form>
      </div>
    </main>
  );
}
