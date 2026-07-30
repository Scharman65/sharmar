"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RegisterCopy = {
  title: string;
  subtitle: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: string;
  termsLink: string;
  register: string;
  registering: string;
  haveAccount: string;
  signIn: string;
  genericError: string;
  errors: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pageCopy(lang: string): RegisterCopy {
  if (lang === "ru") {
    return {
      title: "Регистрация владельца",
      subtitle: "Создайте доступ к кабинету владельца лодки",
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Email",
      whatsappNumber: "WhatsApp",
      password: "Пароль",
      confirmPassword: "Повторите пароль",
      acceptTerms: "Я принимаю условия сервиса",
      termsLink: "Условия",
      register: "Зарегистрироваться",
      registering: "Регистрация...",
      haveAccount: "Уже есть аккаунт?",
      signIn: "Войти",
      genericError: "Регистрация не удалась. Попробуйте ещё раз.",
      errors: {
        missing_required_fields: "Заполните все обязательные поля.",
        invalid_email: "Введите корректный email.",
        invalid_whatsapp_number: "Введите WhatsApp в международном формате, например +38268123456.",
        password_too_short: "Пароль должен содержать минимум 8 символов.",
        password_mismatch: "Пароли не совпадают.",
        terms_required: "Необходимо принять условия сервиса.",
        rate_limit_unavailable: "Сервис регистрации временно недоступен. Повторите попытку позже.",
        email_already_registered: "Этот email уже зарегистрирован.",
        owner_profile_create_failed: "Аккаунт создан, но профиль владельца не удалось подготовить. Свяжитесь с поддержкой.",
        server_token_missing: "Регистрация временно недоступна. Свяжитесь с поддержкой.",
        strapi_registration_failed: "Регистрация не удалась. Проверьте данные и попробуйте снова.",
      },
    };
  }

  if (lang === "me") {
    return {
      title: "Registracija vlasnika",
      subtitle: "Kreirajte pristup panelu vlasnika plovila",
      firstName: "Ime",
      lastName: "Prezime",
      email: "Email",
      whatsappNumber: "WhatsApp",
      password: "Lozinka",
      confirmPassword: "Potvrdite lozinku",
      acceptTerms: "Prihvatam uslove korišćenja",
      termsLink: "Uslovi",
      register: "Registracija",
      registering: "Registracija...",
      haveAccount: "Već imate nalog?",
      signIn: "Prijava",
      genericError: "Registracija nije uspjela. Pokušajte ponovo.",
      errors: {
        missing_required_fields: "Popunite sva obavezna polja.",
        invalid_email: "Unesite ispravan email.",
        invalid_whatsapp_number: "Unesite WhatsApp u međunarodnom formatu, na primjer +38268123456.",
        password_too_short: "Lozinka mora imati najmanje 8 karaktera.",
        password_mismatch: "Lozinke se ne poklapaju.",
        terms_required: "Morate prihvatiti uslove korišćenja.",
        rate_limit_unavailable: "Registracija je privremeno nedostupna. Pokušajte ponovo kasnije.",
        email_already_registered: "Ovaj email je već registrovan.",
        owner_profile_create_failed: "Nalog je kreiran, ali profil vlasnika nije pripremljen. Kontaktirajte podršku.",
        server_token_missing: "Registracija trenutno nije dostupna. Kontaktirajte podršku.",
        strapi_registration_failed: "Registracija nije uspjela. Provjerite podatke i pokušajte ponovo.",
      },
    };
  }

  return {
    title: "Owner registration",
    subtitle: "Create access to your boat owner dashboard",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    whatsappNumber: "WhatsApp",
    password: "Password",
    confirmPassword: "Confirm password",
    acceptTerms: "I accept the service terms",
    termsLink: "Terms",
    register: "Create account",
    registering: "Creating account...",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    genericError: "Registration failed. Please try again.",
    errors: {
      missing_required_fields: "Fill in all required fields.",
      invalid_email: "Enter a valid email address.",
      invalid_whatsapp_number: "Enter WhatsApp in international format, for example +38268123456.",
      password_too_short: "Password must be at least 8 characters.",
      password_mismatch: "Passwords do not match.",
      terms_required: "You must accept the service terms.",
      rate_limit_unavailable: "Registration is temporarily unavailable. Please try again later.",
      email_already_registered: "This email is already registered.",
      owner_profile_create_failed: "The account was created, but the owner profile could not be prepared. Contact support.",
      server_token_missing: "Registration is temporarily unavailable. Contact support.",
      strapi_registration_failed: "Registration failed. Check your details and try again.",
    },
  };
}

function normalizeLang(value: unknown): "ru" | "me" | "en" {
  return value === "ru" || value === "me" || value === "en" ? value : "en";
}

function inputBase() {
  return "w-full rounded-md border border-black/15 px-3 py-2 outline-none";
}

function errorMessage(copy: RegisterCopy, code: string | null) {
  if (!code) return null;
  return copy.errors[code] || copy.genericError;
}

function safeNextPath(value: string | null, lang: string): string {
  if (!value || !value.startsWith(`/${lang}/`) || value.startsWith("//")) {
    return `/${lang}/owner-dashboard`;
  }

  return value;
}

export default function OwnerRegisterForm() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const lang = normalizeLang(params?.lang);
  const copy = pageCopy(lang);
  const [nextPath, setNextPath] = useState(`/${lang}/owner-dashboard`);
  const nextQuery = encodeURIComponent(nextPath);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setNextPath(safeNextPath(new URLSearchParams(window.location.search).get("next"), lang));
  }, [lang]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !whatsappNumber.trim() || !password || !confirmPassword) {
      setErrorCode("missing_required_fields");
      return;
    }

    if (!EMAIL_RE.test(email.trim())) {
      setErrorCode("invalid_email");
      return;
    }

    if (password.length < 8) {
      setErrorCode("password_too_short");
      return;
    }

    if (password !== confirmPassword) {
      setErrorCode("password_mismatch");
      return;
    }

    if (!acceptTerms) {
      setErrorCode("terms_required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/owner-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          whatsapp_number: whatsappNumber,
          password,
          confirm_password: confirmPassword,
          preferred_language: lang,
          accept_terms: acceptTerms,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok !== true) {
        setErrorCode(typeof json?.code === "string" ? json.code : "strapi_registration_failed");
        return;
      }

      router.push(nextPath);
    } catch {
      setErrorCode("strapi_registration_failed");
    } finally {
      setIsLoading(false);
    }
  }

  const formError = errorMessage(copy, errorCode);

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="page-top">
          <h1 className="h1">{copy.title}</h1>
          <p className="kicker">{copy.subtitle}</p>
        </div>

        <form className="card" style={{ padding: 20, display: "grid", gap: 14 }} onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.firstName}</span>
              <input className={inputBase()} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>{copy.lastName}</span>
              <input className={inputBase()} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{copy.email}</span>
            <input className={inputBase()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{copy.whatsappNumber}</span>
            <input className={inputBase()} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} autoComplete="tel" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{copy.password}</span>
            <input className={inputBase()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>{copy.confirmPassword}</span>
            <input className={inputBase()} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </label>

          <label style={{ alignItems: "center", display: "flex", gap: 10 }}>
            <input checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} type="checkbox" />
            <span>
              {copy.acceptTerms}{" "}
              <Link href={`/${lang}/terms`} style={{ textDecoration: "underline" }}>
                {copy.termsLink}
              </Link>
            </span>
          </label>

          {formError ? <p style={{ color: "#b91c1c", margin: 0 }}>{formError}</p> : null}

          <button
            className="button"
            type="submit"
            disabled={isLoading}
            style={{
              background: isLoading ? "#475569" : "#0f766e",
              border: "1px solid #0f766e",
              color: "#ffffff",
              fontWeight: 800,
              opacity: 1,
            }}
          >
            {isLoading ? copy.registering : copy.register}
          </button>

          <p style={{ margin: 0 }}>
            {copy.haveAccount}{" "}
            <Link href={`/${lang}/owner-login?next=${nextQuery}`} style={{ textDecoration: "underline" }}>
              {copy.signIn}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
