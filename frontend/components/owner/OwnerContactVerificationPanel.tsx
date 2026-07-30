"use client";

import { useState } from "react";

type Props = {
  lang: string;
  ownerEmail?: string | null;
  profile: {
    email_verified?: boolean | null;
    whatsapp_verified?: boolean | null;
    whatsapp_number?: string | null;
  };
  onVerified: () => Promise<void>;
};

function copy(lang: string) {
  if (lang === "ru") {
    return {
      required: "Для отправки лодки на проверку обязательно подтвердите email и WhatsApp.",
      email: "Email",
      whatsapp: "WhatsApp",
      verified: "подтверждён",
      pending: "ожидает подтверждения",
      sendEmail: "Отправить письмо",
      sending: "Отправка...",
      emailSent: "Письмо отправлено. Проверьте входящие и папку «Спам».",
      sendCode: "Получить код в WhatsApp",
      codeSent: "Код отправлен в WhatsApp.",
      codePlaceholder: "Код из WhatsApp",
      verifyCode: "Подтвердить код",
      verifying: "Проверка...",
      whatsappVerified: "WhatsApp подтверждён.",
      invalidCode: "Код неверный или истёк. Запросите новый код.",
      unavailable: "Сервис подтверждения временно недоступен.",
      genericError: "Не удалось выполнить подтверждение.",
    };
  }
  if (lang === "me") {
    return {
      required: "Prije slanja plovila na provjeru morate potvrditi email i WhatsApp.",
      email: "Email",
      whatsapp: "WhatsApp",
      verified: "potvrđen",
      pending: "čeka potvrdu",
      sendEmail: "Pošalji email",
      sending: "Slanje...",
      emailSent: "Email je poslat. Provjerite prijemno sanduče i Spam.",
      sendCode: "Pošalji kod na WhatsApp",
      codeSent: "Kod je poslat na WhatsApp.",
      codePlaceholder: "Kod iz WhatsApp-a",
      verifyCode: "Potvrdi kod",
      verifying: "Provjera...",
      whatsappVerified: "WhatsApp je potvrđen.",
      invalidCode: "Kod nije tačan ili je istekao. Zatražite novi kod.",
      unavailable: "Servis za potvrdu trenutno nije dostupan.",
      genericError: "Potvrda nije uspjela.",
    };
  }
  return {
    required: "Verify both email and WhatsApp before submitting a boat for review.",
    email: "Email",
    whatsapp: "WhatsApp",
    verified: "verified",
    pending: "verification pending",
    sendEmail: "Send verification email",
    sending: "Sending...",
    emailSent: "Email sent. Check your inbox and spam folder.",
    sendCode: "Send WhatsApp code",
    codeSent: "The code was sent to WhatsApp.",
    codePlaceholder: "WhatsApp code",
    verifyCode: "Verify code",
    verifying: "Verifying...",
    whatsappVerified: "WhatsApp verified.",
    invalidCode: "The code is incorrect or expired. Request a new code.",
    unavailable: "Verification service is temporarily unavailable.",
    genericError: "Verification failed.",
  };
}

function errorText(code: string, lang: string): string {
  const ui = copy(lang);
  if (
    code.includes("unavailable") ||
    code.includes("missing") ||
    code.includes("provider") ||
    code.includes("site_url")
  ) {
    return ui.unavailable;
  }
  if (code.includes("code_invalid") || code.includes("code_expired") || code.includes("invalid_verification_code")) {
    return ui.invalidCode;
  }
  if (code.includes("too_many_attempts")) {
    return lang === "ru"
      ? "Слишком много попыток. Повторите позже."
      : lang === "me"
        ? "Previše pokušaja. Pokušajte kasnije."
        : "Too many attempts. Try again later.";
  }
  return ui.genericError;
}

export function OwnerContactVerificationPanel({
  lang,
  ownerEmail,
  profile,
  onVerified,
}: Props) {
  const ui = copy(lang);
  const [emailBusy, setEmailBusy] = useState(false);
  const [whatsappSendBusy, setWhatsappSendBusy] = useState(false);
  const [whatsappCheckBusy, setWhatsappCheckBusy] = useState(false);
  const [code, setCode] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  async function sendEmail() {
    setEmailBusy(true);
    setEmailMessage(null);
    setEmailError(null);
    try {
      const res = await fetch("/api/auth/owner-email-verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok !== true) {
        throw new Error(typeof json?.code === "string" ? json.code : "verification_email_send_failed");
      }
      setEmailMessage(ui.emailSent);
    } catch (error) {
      setEmailError(errorText(error instanceof Error ? error.message : "verification_email_send_failed", lang));
    } finally {
      setEmailBusy(false);
    }
  }

  async function sendWhatsAppCode() {
    setWhatsappSendBusy(true);
    setWhatsappMessage(null);
    setWhatsappError(null);
    try {
      const res = await fetch("/api/auth/owner-whatsapp-verification/send", {
        method: "POST",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok !== true) {
        throw new Error(typeof json?.code === "string" ? json.code : "whatsapp_verification_send_failed");
      }
      setWhatsappMessage(ui.codeSent);
    } catch (error) {
      setWhatsappError(errorText(error instanceof Error ? error.message : "whatsapp_verification_send_failed", lang));
    } finally {
      setWhatsappSendBusy(false);
    }
  }

  async function verifyWhatsAppCode() {
    setWhatsappCheckBusy(true);
    setWhatsappMessage(null);
    setWhatsappError(null);
    try {
      const res = await fetch("/api/auth/owner-whatsapp-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok !== true) {
        throw new Error(typeof json?.code === "string" ? json.code : "whatsapp_code_invalid");
      }
      setWhatsappMessage(ui.whatsappVerified);
      setCode("");
      await onVerified();
    } catch (error) {
      setWhatsappError(errorText(error instanceof Error ? error.message : "whatsapp_code_invalid", lang));
    } finally {
      setWhatsappCheckBusy(false);
    }
  }

  const emailVerified = profile.email_verified === true;
  const whatsappVerified = profile.whatsapp_verified === true;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 10,
        border: emailVerified && whatsappVerified
          ? "1px solid rgba(22,163,74,0.35)"
          : "1px solid rgba(234,179,8,0.45)",
        background: emailVerified && whatsappVerified
          ? "rgba(22,163,74,0.08)"
          : "rgba(234,179,8,0.08)",
      }}
    >
      {!emailVerified || !whatsappVerified ? (
        <p style={{ margin: "0 0 12px", fontWeight: 700 }}>{ui.required}</p>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            {ui.email}: {emailVerified ? `✅ ${ui.verified}` : `⏳ ${ui.pending}`}
            {ownerEmail ? ` · ${ownerEmail}` : ""}
          </div>
          {!emailVerified ? (
            <button
              className="button secondary"
              type="button"
              disabled={emailBusy}
              onClick={sendEmail}
              style={{ marginTop: 8, opacity: 1 }}
            >
              {emailBusy ? ui.sending : ui.sendEmail}
            </button>
          ) : null}
          {emailMessage ? <p className="kicker" style={{ margin: "8px 0 0", color: "#15803d" }}>{emailMessage}</p> : null}
          {emailError ? <p className="kicker" style={{ margin: "8px 0 0", color: "#b91c1c" }}>{emailError}</p> : null}
        </div>

        <div>
          <div style={{ fontWeight: 700 }}>
            {ui.whatsapp}: {whatsappVerified ? `✅ ${ui.verified}` : `⏳ ${ui.pending}`}
            {profile.whatsapp_number ? ` · ${profile.whatsapp_number}` : ""}
          </div>
          {!whatsappVerified ? (
            <>
              <button
                className="button secondary"
                type="button"
                disabled={whatsappSendBusy}
                onClick={sendWhatsAppCode}
                style={{ marginTop: 8, opacity: 1 }}
              >
                {whatsappSendBusy ? ui.sending : ui.sendCode}
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={ui.codePlaceholder}
                  aria-label={ui.codePlaceholder}
                  style={{ maxWidth: 220 }}
                />
                <button
                  className="button"
                  type="button"
                  disabled={whatsappCheckBusy || code.length < 4}
                  onClick={verifyWhatsAppCode}
                  style={{
                    background: whatsappCheckBusy || code.length < 4 ? "#475569" : "#0f766e",
                    color: "#ffffff",
                    opacity: 1,
                    fontWeight: 800,
                  }}
                >
                  {whatsappCheckBusy ? ui.verifying : ui.verifyCode}
                </button>
              </div>
            </>
          ) : null}
          {whatsappMessage ? <p className="kicker" style={{ margin: "8px 0 0", color: "#15803d" }}>{whatsappMessage}</p> : null}
          {whatsappError ? <p className="kicker" style={{ margin: "8px 0 0", color: "#b91c1c" }}>{whatsappError}</p> : null}
        </div>
      </div>
    </div>
  );
}
