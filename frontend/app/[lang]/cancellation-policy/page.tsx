import Link from "next/link";
import { isLang, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

const copy = {
  en: {
    title: "Cancellation and refund policy",
    intro:
      "This page explains how cancellation and refund handling works on Sharmar. Final conditions may vary depending on the yacht owner, operator, route, season, and booking type.",
    sections: [
      {
        title: "Reservation requests",
        text:
          "Submitting a request does not automatically guarantee a confirmed booking. A booking becomes active only after owner confirmation and, where applicable, payment authorization or payment completion.",
      },
      {
        title: "Owner confirmation",
        text:
          "If the yacht owner or operator cannot confirm the selected date or trip details, the request may be declined or adjusted before payment is finalized.",
      },
      {
        title: "Guest cancellations",
        text:
          "If a guest needs to cancel, the guest should contact Sharmar support as early as possible. Refund eligibility depends on the timing of cancellation and the cancellation terms of the individual yacht owner or operator.",
      },
      {
        title: "Owner cancellations",
        text:
          "If an owner or operator cancels a confirmed trip, Sharmar will help the guest find an alternative option where possible or provide guidance on the applicable refund process.",
      },
      {
        title: "Weather and safety",
        text:
          "Trips may be rescheduled or cancelled due to unsafe weather, maritime restrictions, technical issues, or safety reasons. In such cases, the owner or operator may offer a new date or refund according to the applicable booking terms.",
      },
      {
        title: "Refund processing",
        text:
          "Approved refunds are processed back to the original payment method where possible. Processing times may depend on the payment provider, card network, and issuing bank.",
      },
    ],
    note:
      "Sharmar is a booking request platform and does not directly operate yachts. Specific cancellation and refund terms may be shown during the booking process or confirmed by the yacht owner or operator.",
    back: "Back to homepage",
  },
  ru: {
    title: "Политика отмены и возврата",
    intro:
      "На этой странице объясняется, как на Sharmar работают отмена бронирования и возвраты. Финальные условия могут зависеть от владельца яхты, оператора, маршрута, сезона и типа бронирования.",
    sections: [
      {
        title: "Заявки на бронирование",
        text:
          "Отправка заявки не означает автоматическое подтверждение бронирования. Бронирование становится активным только после подтверждения владельцем и, если применимо, после авторизации или завершения оплаты.",
      },
      {
        title: "Подтверждение владельцем",
        text:
          "Если владелец или оператор яхты не может подтвердить выбранную дату или детали поездки, заявка может быть отклонена или изменена до финального оформления оплаты.",
      },
      {
        title: "Отмена со стороны гостя",
        text:
          "Если гостю нужно отменить поездку, необходимо как можно раньше связаться с поддержкой Sharmar. Возможность возврата зависит от сроков отмены и условий конкретного владельца или оператора яхты.",
      },
      {
        title: "Отмена со стороны владельца",
        text:
          "Если владелец или оператор отменяет подтверждённую поездку, Sharmar поможет гостю найти альтернативный вариант, если это возможно, или подскажет порядок возврата.",
      },
      {
        title: "Погода и безопасность",
        text:
          "Поездка может быть перенесена или отменена из-за небезопасной погоды, морских ограничений, технических проблем или вопросов безопасности. В таких случаях владелец или оператор может предложить новую дату или возврат согласно условиям бронирования.",
      },
      {
        title: "Обработка возврата",
        text:
          "Одобренные возвраты по возможности отправляются на исходный способ оплаты. Сроки обработки могут зависеть от платёжного провайдера, карточной сети и банка-эмитента.",
      },
    ],
    note:
      "Sharmar является платформой заявок на бронирование и не управляет яхтами напрямую. Конкретные условия отмены и возврата могут быть показаны во время бронирования или подтверждены владельцем либо оператором яхты.",
    back: "На главную",
  },
  me: {
    title: "Politika otkazivanja i povraćaja novca",
    intro:
      "Ova stranica objašnjava kako otkazivanje i povraćaj novca funkcionišu na Sharmar platformi. Konačni uslovi mogu zavisiti od vlasnika jahte, operatera, rute, sezone i tipa rezervacije.",
    sections: [
      {
        title: "Zahtjevi za rezervaciju",
        text:
          "Slanje zahtjeva ne znači automatski potvrđenu rezervaciju. Rezervacija postaje aktivna tek nakon potvrde vlasnika i, gdje je primjenljivo, autorizacije ili završetka plaćanja.",
      },
      {
        title: "Potvrda vlasnika",
        text:
          "Ako vlasnik ili operater jahte ne može potvrditi izabrani datum ili detalje putovanja, zahtjev može biti odbijen ili prilagođen prije završetka plaćanja.",
      },
      {
        title: "Otkazivanje od strane gosta",
        text:
          "Ako gost mora otkazati putovanje, treba što ranije kontaktirati Sharmar podršku. Pravo na povraćaj zavisi od vremena otkazivanja i uslova pojedinačnog vlasnika ili operatera jahte.",
      },
      {
        title: "Otkazivanje od strane vlasnika",
        text:
          "Ako vlasnik ili operater otkaže potvrđeno putovanje, Sharmar će pomoći gostu da pronađe alternativu gdje je moguće ili će dati instrukcije za odgovarajući proces povraćaja.",
      },
      {
        title: "Vrijeme i bezbjednost",
        text:
          "Putovanja mogu biti pomjerena ili otkazana zbog nepovoljnih vremenskih uslova, pomorskih ograničenja, tehničkih problema ili bezbjednosnih razloga. U tim slučajevima vlasnik ili operater može ponuditi novi datum ili povraćaj prema važećim uslovima rezervacije.",
      },
      {
        title: "Obrada povraćaja",
        text:
          "Odobreni povraćaji se, gdje je moguće, vraćaju na originalni način plaćanja. Vrijeme obrade može zavisiti od platnog provajdera, kartične mreže i banke izdavaoca.",
      },
    ],
    note:
      "Sharmar je platforma za zahtjeve za rezervaciju i ne upravlja jahtama direktno. Konkretni uslovi otkazivanja i povraćaja mogu biti prikazani tokom procesa rezervacije ili potvrđeni od strane vlasnika odnosno operatera jahte.",
    back: "Nazad na početnu",
  },
};

export default async function CancellationPolicyPage({ params }: Props) {
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
