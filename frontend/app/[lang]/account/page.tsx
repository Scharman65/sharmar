"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { isLang, type Lang } from "@/i18n";

type StoredUser = {
  id?: number;
  username?: string;
  email?: string;
} | null;

export default function AccountPage() {
  const router = useRouter();
  const params = useParams<{ lang?: string }>();

  const lang: Lang = useMemo(() => {
    const raw = params?.lang ?? "en";
    return isLang(raw) ? raw : "en";
  }, [params]);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StoredUser>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("sharmar_jwt");
      const rawUser = localStorage.getItem("sharmar_user");

      if (!token) {
        router.replace(`/${lang}/login`);
        return;
      }

      setUser(rawUser ? JSON.parse(rawUser) : null);
      setReady(true);
    } catch {
      router.replace(`/${lang}/login`);
    }
  }, [lang, router]);

  if (!ready) {
    return (
      <main className="main">
        <div className="container">
          <p className="kicker">
            {lang === "ru" ? "Загрузка..." : lang === "me" ? "Učitavanje..." : "Loading..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-top">
          <h1 className="h1">
            {lang === "ru" ? "Кабинет" : lang === "me" ? "Nalog" : "My account"}
          </h1>
          <p className="kicker">
            {lang === "ru"
              ? "Первый слой аккаунта уже работает."
              : lang === "me"
                ? "Prvi sloj naloga već radi."
                : "The first account layer is now working."}
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="card-body" style={{ display: "grid", gap: 14 }}>
            <div>
              <strong>ID:</strong> {user?.id ?? "—"}
            </div>
            <div>
              <strong>Username:</strong> {user?.username ?? "—"}
            </div>
            <div>
              <strong>Email:</strong> {user?.email ?? "—"}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <Link className="button secondary" href={`/${lang}/add`}>
                {lang === "ru" ? "Добавить лодку" : lang === "me" ? "Dodajte plovilo" : "Add boat"}
              </Link>

              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  try {
                    localStorage.removeItem("sharmar_jwt");
                    localStorage.removeItem("sharmar_user");
                  } catch {}
                  window.location.href = `/${lang}`;
                }}
              >
                {lang === "ru" ? "Выйти" : lang === "me" ? "Odjava" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
