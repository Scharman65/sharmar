import Link from "next/link";

type Props = {
  lang: string;
};

const t = {
  en: {
    kicker: "For yacht owners",
    title: "Earn with your yacht on Sharmar",
    text: "Add your yacht, receive direct booking requests, approve reservations manually and manage your listings from a dedicated owner dashboard.",
    list: "List your yacht",
    login: "Owner login",
    stats: [
      ["Manual review", "Verified owners", "Every yacht listing is reviewed before publication."],
      ["Approval first", "Secure workflow", "Owners approve bookings before confirmation."],
      ["SEO visibility", "Mediterranean reach", "Your yacht appears in regional destination pages."],
    ],
  },
  ru: {
    kicker: "Для владельцев яхт",
    title: "Зарабатывайте на своей яхте с Sharmar",
    text: "Добавьте яхту, получайте прямые заявки, подтверждайте бронирования вручную и управляйте объявлениями из личного кабинета владельца.",
    list: "Разместить яхту",
    login: "Вход владельца",
    stats: [
      ["Ручная проверка", "Проверенные владельцы", "Каждое объявление проверяется перед публикацией."],
      ["Сначала подтверждение", "Безопасный процесс", "Владелец подтверждает бронирование до финального подтверждения."],
      ["SEO видимость", "Охват Средиземноморья", "Ваша яхта появляется на региональных страницах направлений."],
    ],
  },
  me: {
    kicker: "Za vlasnike jahti",
    title: "Zarađujte sa svojom jahtom na Sharmar",
    text: "Dodajte jahtu, primajte direktne zahtjeve za rezervaciju, ručno odobravajte rezervacije i upravljajte oglasima iz vlasničkog panela.",
    list: "Dodaj jahtu",
    login: "Prijava vlasnika",
    stats: [
      ["Ručna provjera", "Provjereni vlasnici", "Svaki oglas se provjerava prije objave."],
      ["Prvo odobrenje", "Siguran proces", "Vlasnici odobravaju rezervacije prije konačne potvrde."],
      ["SEO vidljivost", "Mediteranski doseg", "Vaša jahta se prikazuje na regionalnim stranicama destinacija."],
    ],
  },
};

export default function OwnerCTA({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <section className="owner-cta-section">
      <div className="owner-cta-shell">
        <div className="owner-cta-copy">
          <span className="owner-cta-kicker">{ui.kicker}</span>

          <h2>{ui.title}</h2>

          <p>{ui.text}</p>

          <div className="owner-cta-actions">
            <Link href={`/${lang}/list-your-boat`} className="owner-primary-button">
              {ui.list}
            </Link>

            <Link href={`/${lang}/owner-login`} className="owner-secondary-button">
              {ui.login}
            </Link>
          </div>
        </div>

        <div className="owner-cta-grid">
          {ui.stats.map(([value, title, description]) => (
            <div key={title} className="owner-cta-card">
              <span className="owner-cta-value">{value}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
