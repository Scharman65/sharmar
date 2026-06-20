import Link from "next/link";
import { isLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const copy = {
  en: {
    title: "Support and contact",
    intro:
      "If you need assistance with booking requests, yacht listings, availability, cancellations, or general platform questions, the Sharmar support team is available to help.",
    sections: [
      {
        title: "Booking assistance",
        text:
          "Support is available for reservation requests, availability clarification, owner communication, and booking-related questions.",
      },
      {
        title: "Owner support",
        text:
          "Yacht owners and operators can contact Sharmar regarding listings, calendar availability, booking management, and account assistance.",
      },
      {
        title: "Technical support",
        text:
          "If you experience technical issues while using the platform, please contact support with a description of the problem and screenshots where possible.",
      },
    ],
    company: "Company",
    companyValue: "ORNOVA WELLNESS DOO",
    email: "Support email",
    emailValue: "support@sharmar.me",
    response: "Typical response time",
    responseValue: "Usually within 24–48 hours",
    back: "Back to homepage",
  },
  ru: {
    title: "Поддержка и контакты",
    intro:
      "Если вам нужна помощь с бронированием, объявлениями яхт, доступностью дат, отменой поездки или общими вопросами по платформе, служба поддержки Sharmar готова помочь.",
    sections: [
      {
        title: "Помощь с бронированием",
        text:
          "Поддержка доступна по вопросам заявок на бронирование, уточнения доступности, связи с владельцами и другим вопросам, связанным с поездкой.",
      },
      {
        title: "Поддержка владельцев",
        text:
          "Владельцы яхт и операторы могут обращаться в Sharmar по вопросам объявлений, календаря, управления бронированиями и аккаунта.",
      },
      {
        title: "Техническая поддержка",
        text:
          "Если у вас возникли технические проблемы при использовании платформы, свяжитесь с поддержкой и по возможности приложите описание проблемы и скриншоты.",
      },
    ],
    company: "Компания",
    companyValue: "ORNOVA WELLNESS DOO",
    email: "Email поддержки",
    emailValue: "support@sharmar.me",
    response: "Среднее время ответа",
    responseValue: "Обычно в течение 24–48 часов",
    back: "На главную",
  },
  me: {
    title: "Podrška i kontakt",
    intro:
      "Ako vam je potrebna pomoć oko rezervacija, oglasa za jahte, dostupnosti termina, otkazivanja ili opštih pitanja o platformi, Sharmar podrška vam stoji na raspolaganju.",
    sections: [
      {
        title: "Pomoć oko rezervacija",
        text:
          "Podrška je dostupna za zahtjeve za rezervaciju, provjeru dostupnosti, komunikaciju sa vlasnicima i pitanja vezana za rezervaciju.",
      },
      {
        title: "Podrška za vlasnike",
        text:
          "Vlasnici jahti i operateri mogu kontaktirati Sharmar u vezi oglasa, kalendara dostupnosti, upravljanja rezervacijama i pomoći oko naloga.",
      },
      {
        title: "Tehnička podrška",
        text:
          "Ako imate tehničkih problema tokom korišćenja platforme, kontaktirajte podršku uz opis problema i screenshotove gdje je moguće.",
      },
    ],
    company: "Kompanija",
    companyValue: "ORNOVA WELLNESS DOO",
    email: "Email podrške",
    emailValue: "support@sharmar.me",
    response: "Tipično vrijeme odgovora",
    responseValue: "Obično u roku od 24–48 sati",
    back: "Nazad na početnu",
  },
};

export default async function SupportPage({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : "en";
  const ui = copy[lang];

  return (
    <main className="main">
      <div className="container" style={{ maxWidth: 900 }}>
        <p className="kicker">Sharmar Marketplace</p>
        <h1 className="h1">{ui.title}</h1>

        <p style={{ lineHeight: 1.75, color: "rgba(255,255,255,0.78)" }}>
          {ui.intro}
        </p>

        <div style={{ display: "grid", gap: 16, marginTop: 28 }}>
          {ui.sections.map((section) => (
            <section
              key={section.title}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 18,
                background: "rgba(255,255,255,0.045)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 22 }}>{section.title}</h2>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.74)",
                }}
              >
                {section.text}
              </p>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 20,
            background: "rgba(255,255,255,0.045)",
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <strong>{ui.company}:</strong> {ui.companyValue}
          </div>

          <div>
            <strong>{ui.email}:</strong>{" "}
            <a href="mailto:support@sharmar.me">
              {ui.emailValue}
            </a>
          </div>

          <div>
            <strong>{ui.response}:</strong> {ui.responseValue}
          </div>
        </div>

        <Link
          className="button secondary"
          href={`/${lang}`}
          style={{ marginTop: 20 }}
        >
          {ui.back}
        </Link>
      </div>
    </main>
  );
}
