"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type VerifyState = "working" | "success" | "error";

function copy(lang: string) {
  if (lang === "ru") {
    return {
      title: "Подтверждение email",
      working: "Проверяем ссылку подтверждения...",
      success: "Email подтверждён. Теперь подтвердите WhatsApp в кабинете владельца.",
      error: "Ссылка недействительна или срок её действия истёк. Запросите новое письмо в кабинете владельца.",
      dashboard: "Открыть кабинет владельца",
      login: "Войти",
    };
  }
  if (lang === "me") {
    return {
      title: "Potvrda email adrese",
      working: "Provjeravamo link za potvrdu...",
      success: "Email je potvrđen. Sada potvrdite WhatsApp u panelu vlasnika.",
      error: "Link nije važeći ili je istekao. Zatražite novi email u panelu vlasnika.",
      dashboard: "Otvori panel vlasnika",
      login: "Prijava",
    };
  }
  return {
    title: "Email verification",
    working: "Checking your verification link...",
    success: "Email verified. Now verify WhatsApp in the owner dashboard.",
    error: "This link is invalid or expired. Request a new email in the owner dashboard.",
    dashboard: "Open owner dashboard",
    login: "Sign in",
  };
}

export default function OwnerVerifyEmailClient() {
  const params = useParams<{ lang?: string }>();
  const lang = params?.lang === "ru" || params?.lang === "me" ? params.lang : "en";
  const ui = copy(lang);
  const [state, setState] = useState<VerifyState>("working");

  useEffect(() => {
    let alive = true;

    async function verify() {
      const token = new URLSearchParams(window.location.search).get("token") || "";
      if (!token) {
        if (alive) setState("error");
        return;
      }

      try {
        const res = await fetch("/api/auth/owner-email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => null);
        if (alive) setState(res.ok && json?.ok === true ? "success" : "error");
      } catch {
        if (alive) setState("error");
      }
    }

    verify();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="card" style={{ padding: 24 }}>
          <h1 className="h1" style={{ marginTop: 0 }}>{ui.title}</h1>
          <p className="kicker" style={{ fontSize: 16 }}>
            {state === "working" ? ui.working : state === "success" ? ui.success : ui.error}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
            <Link className="button" href={`/${lang}/owner-dashboard`}>
              {ui.dashboard}
            </Link>
            <Link className="button secondary" href={`/${lang}/owner-login`}>
              {ui.login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
