import Link from "next/link";
import { isLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const copy = {
  en: {
    title: "How Sharmar works",
    intro:
      "Sharmar is a yacht discovery and booking request platform. Guests can browse yachts, check available dates, send a reservation request, and wait for owner confirmation before a booking is finalized.",
    sections: [
      {
        title: "1. Browse yachts",
        text:
          "Guests explore available yachts by destination, marina, boat type, and listing details.",
      },
      {
        title: "2. Send a reservation request",
        text:
          "A guest selects a yacht and submits a booking request with trip details and contact information.",
      },
      {
        title: "3. Availability is checked",
        text:
          "Sharmar checks the selected time slot and helps prevent overlapping reservations for the same yacht.",
      },
      {
        title: "4. Owner confirmation",
        text:
          "The yacht owner reviews the request and confirms or declines availability.",
      },
      {
        title: "5. Booking completion",
        text:
          "After confirmation, the guest receives booking instructions and payment or authorization details where applicable.",
      },
    ],
    note:
      "Sharmar is a booking platform. Yacht availability, trip conditions, final confirmation, cancellation terms, and service delivery depend on the individual yacht owner or operator.",
    back: "Back to homepage",
  },
  ru: {
    title: "Как работает Sharmar",
    intro:
      "Sharmar — это платформа для поиска яхт и отправки заявок на бронирование. Гости могут смотреть яхты, проверять доступные даты, отправлять заявку и ждать подтверждения владельца.",
    sections: [
      {
        title: "1. Поиск яхты",
        text:
          "Гость выбирает яхту по направлению, марине, типу лодки и описанию объявления.",
      },
      {
        title: "2. Отправка заявки",
        text:
          "Гость выбирает яхту и отправляет заявку с деталями поездки и контактными данными.",
      },
      {
        title: "3. Проверка доступности",
        text:
          "Sharmar проверяет выбранный временной слот и помогает предотвращать двойное бронирование одной и той же яхты.",
      },
      {
        title: "4. Подтверждение владельцем",
        text:
          "Владелец яхты проверяет заявку и подтверждает или отклоняет доступность.",
      },
      {
        title: "5. Завершение бронирования",
        text:
          "После подтверждения гость получает инструкции по бронированию и, если применимо, детали оплаты или авторизации.",
      },
    ],
    note:
      "Sharmar является платформой бронирования. Доступность яхты, условия поездки, финальное подтверждение, правила отмены и оказание услуги зависят от конкретного владельца или оператора яхты.",
    back: "На главную",
  },
  me: {
    title: "Kako Sharmar funkcioniše",
    intro:
      "Sharmar je platforma za pronalaženje jahti i slanje zahtjeva za rezervaciju. Gosti mogu pregledati jahte, provjeriti dostupne datume, poslati zahtjev i sačekati potvrdu vlasnika.",
    sections: [
      {
        title: "1. Pregled jahti",
        text:
          "Gost bira jahtu prema destinaciji, marini, tipu plovila i detaljima oglasa.",
      },
      {
        title: "2. Slanje zahtjeva",
        text:
          "Gost bira jahtu i šalje zahtjev za rezervaciju sa detaljima putovanja i kontakt podacima.",
      },
      {
        title: "3. Provjera dostupnosti",
        text:
          "Sharmar provjerava izabrani termin i pomaže u sprečavanju duplih rezervacija za istu jahtu.",
      },
      {
        title: "4. Potvrda vlasnika",
        text:
          "Vlasnik jahte pregleda zahtjev i potvrđuje ili odbija dostupnost.",
      },
      {
        title: "5. Završetak rezervacije",
        text:
          "Nakon potvrde, gost dobija instrukcije za rezervaciju i, gdje je primjenljivo, detalje plaćanja ili autorizacije.",
      },
    ],
    note:
      "Sharmar je platforma za rezervacije. Dostupnost jahte, uslovi putovanja, konačna potvrda, pravila otkazivanja i pružanje usluge zavise od pojedinačnog vlasnika ili operatera jahte.",
    back: "Nazad na početnu",
  },
};

export default async function HowItWorksPage({ params }: Props) {
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
              <p style={{ marginBottom: 0, lineHeight: 1.7, color: "rgba(255,255,255,0.74)" }}>
                {section.text}
              </p>
            </section>
          ))}
        </div>

        <p style={{ marginTop: 28, lineHeight: 1.7, color: "rgba(255,255,255,0.68)" }}>
          {ui.note}
        </p>

        <Link className="button secondary" href={`/${lang}`} style={{ marginTop: 20 }}>
          {ui.back}
        </Link>
      </div>
    </main>
  );
}
