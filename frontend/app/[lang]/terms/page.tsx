import Link from "next/link";
import { isLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const copy = {
  en: {
    title: "Terms of service",
    intro:
      "These terms describe the general rules and responsibilities related to using the Sharmar marketplace platform.",
    sections: [
      {
        title: "Platform role",
        text:
          "Sharmar operates as a yacht discovery and booking request platform connecting guests with yacht owners and operators.",
      },
      {
        title: "Booking requests",
        text:
          "Submitting a booking request does not guarantee availability or confirmation. Reservations become active only after confirmation by the yacht owner or operator.",
      },
      {
        title: "Owner responsibility",
        text:
          "Yacht owners and operators are responsible for the accuracy of listings, availability, pricing, licenses, safety compliance, and the delivery of charter services.",
      },
      {
        title: "Guest responsibility",
        text:
          "Guests are responsible for providing accurate booking information, complying with local maritime rules, and following instructions provided by yacht owners or operators.",
      },
      {
        title: "Availability and pricing",
        text:
          "Availability, pricing, routes, schedules, and trip conditions may change depending on season, weather, technical conditions, and owner decisions.",
      },
      {
        title: "Payments and authorizations",
        text:
          "Some bookings may require payment authorization, deposits, or additional verification before final confirmation.",
      },
      {
        title: "Limitation of liability",
        text:
          "Sharmar provides the marketplace platform but does not directly operate yachts or provide maritime transportation services.",
      },
    ],
    note:
      "By using Sharmar, users agree to use the platform lawfully and responsibly.",
    back: "Back to homepage",
  },
  ru: {
    title: "Условия использования",
    intro:
      "Эти условия описывают основные правила и ответственность при использовании платформы Sharmar.",
    sections: [
      {
        title: "Роль платформы",
        text:
          "Sharmar является платформой для поиска яхт и отправки заявок на бронирование, соединяющей гостей с владельцами яхт и операторами.",
      },
      {
        title: "Заявки на бронирование",
        text:
          "Отправка заявки не гарантирует доступность или подтверждение бронирования. Бронирование становится активным только после подтверждения владельцем или оператором яхты.",
      },
      {
        title: "Ответственность владельца",
        text:
          "Владельцы яхт и операторы несут ответственность за точность объявлений, доступность, цены, лицензии, соблюдение требований безопасности и предоставление услуг.",
      },
      {
        title: "Ответственность гостя",
        text:
          "Гости обязаны предоставлять корректную информацию, соблюдать местные морские правила и следовать инструкциям владельцев или операторов.",
      },
      {
        title: "Доступность и цены",
        text:
          "Доступность, цены, маршруты, расписания и условия поездки могут изменяться в зависимости от сезона, погоды, технического состояния и решений владельца.",
      },
      {
        title: "Оплаты и авторизация",
        text:
          "Некоторые бронирования могут требовать авторизации оплаты, депозита или дополнительной проверки перед финальным подтверждением.",
      },
      {
        title: "Ограничение ответственности",
        text:
          "Sharmar предоставляет платформу marketplace, но не управляет яхтами напрямую и не оказывает морские транспортные услуги.",
      },
    ],
    note:
      "Используя Sharmar, пользователь соглашается использовать платформу законно и добросовестно.",
    back: "На главную",
  },
  me: {
    title: "Uslovi korišćenja",
    intro:
      "Ovi uslovi opisuju osnovna pravila i odgovornosti vezane za korišćenje Sharmar marketplace platforme.",
    sections: [
      {
        title: "Uloga platforme",
        text:
          "Sharmar funkcioniše kao platforma za pronalaženje jahti i slanje zahtjeva za rezervaciju koja povezuje goste sa vlasnicima jahti i operaterima.",
      },
      {
        title: "Zahtjevi za rezervaciju",
        text:
          "Slanje zahtjeva ne garantuje dostupnost ili potvrdu rezervacije. Rezervacija postaje aktivna tek nakon potvrde vlasnika ili operatera jahte.",
      },
      {
        title: "Odgovornost vlasnika",
        text:
          "Vlasnici jahti i operateri odgovorni su za tačnost oglasa, dostupnost, cijene, licence, bezbjednost i pružanje usluga.",
      },
      {
        title: "Odgovornost gosta",
        text:
          "Gosti su odgovorni za davanje tačnih informacija, poštovanje lokalnih pomorskih pravila i instrukcija vlasnika ili operatera.",
      },
      {
        title: "Dostupnost i cijene",
        text:
          "Dostupnost, cijene, rute, rasporedi i uslovi putovanja mogu se mijenjati zavisno od sezone, vremenskih uslova, tehničkog stanja i odluka vlasnika.",
      },
      {
        title: "Plaćanja i autorizacije",
        text:
          "Neke rezervacije mogu zahtijevati autorizaciju plaćanja, depozit ili dodatnu provjeru prije konačne potvrde.",
      },
      {
        title: "Ograničenje odgovornosti",
        text:
          "Sharmar pruža marketplace platformu, ali ne upravlja direktno jahtama niti pruža usluge pomorskog prevoza.",
      },
    ],
    note:
      "Korišćenjem Sharmar platforme korisnik pristaje da koristi platformu zakonito i odgovorno.",
    back: "Nazad na početnu",
  },
};

export default async function TermsPage({ params }: Props) {
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
              <h2 style={{ margin: 0, fontSize: 22 }}>
                {section.title}
              </h2>

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

        <p
          style={{
            marginTop: 28,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.68)",
          }}
        >
          {ui.note}
        </p>

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
