"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/i18n";

export default function HeaderAuthNav({ lang }: { lang: Lang }) {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("sharmar_jwt");
      setIsAuthed(Boolean(token));
    } catch {
      setIsAuthed(false);
    }
  }, []);

  if (!isAuthed) {
    return (
      <>
        <Link href={`/${lang}/login`} className="nav-button">
          {lang === "ru" ? "Вход" : lang === "me" ? "Prijava" : "Login"}
        </Link>

        <Link href={`/${lang}/register`} className="nav-button">
          {lang === "ru" ? "Регистрация" : lang === "me" ? "Registracija" : "Register"}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={`/${lang}/account`} className="nav-button">
        {lang === "ru" ? "Кабинет" : lang === "me" ? "Nalog" : "My account"}
      </Link>

      <button
        type="button"
        className="nav-button"
        onClick={() => {
          try {
            localStorage.removeItem("sharmar_jwt");
            localStorage.removeItem("sharmar_user");
          } catch {}
          window.location.href = `/${lang}`;
        }}
      >
        {lang === "ru" ? "Выход" : lang === "me" ? "Odjava" : "Logout"}
      </button>
    </>
  );
}
