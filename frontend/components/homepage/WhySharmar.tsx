type Props = {
  lang: string;
};

const t = {
  en: {
    eyebrow: "Why Sharmar",
    title: "A safer way to book yachts online",
    items: [
      ["Verified owners", "Listings are reviewed before going public."],
      ["Booking protection", "Owner approval workflow before confirmation."],
      ["Mediterranean focus", "Built for marinas, yachts and sea experiences."],
      ["Fast owner tools", "Owners can add boats and manage listings online."],
    ],
  },
  ru: {
    eyebrow: "Почему Sharmar",
    title: "Более безопасный способ бронировать яхты онлайн",
    items: [
      ["Проверенные владельцы", "Объявления проверяются перед публикацией."],
      ["Защита бронирования", "Владелец подтверждает заявку до финального бронирования."],
      ["Фокус на Средиземноморье", "Платформа создана для марин, яхт и морских прогулок."],
      ["Удобные инструменты владельца", "Владельцы могут добавлять лодки и управлять объявлениями онлайн."],
    ],
  },
  me: {
    eyebrow: "Zašto Sharmar",
    title: "Sigurniji način za online rezervaciju jahti",
    items: [
      ["Provjereni vlasnici", "Oglasi se provjeravaju prije objave."],
      ["Zaštita rezervacije", "Vlasnik odobrava zahtjev prije konačne potvrde."],
      ["Fokus na Mediteran", "Platforma je napravljena za marine, jahte i morske ture."],
      ["Brzi alati za vlasnike", "Vlasnici mogu dodavati plovila i upravljati oglasima online."],
    ],
  },
};

export default function WhySharmar({ lang }: Props) {
  const ui = t[lang as keyof typeof t] || t.en;

  return (
    <section className="home-why">
      <p className="home-eyebrow">{ui.eyebrow}</p>
      <h2>{ui.title}</h2>
      <div className="home-why-grid">
        {ui.items.map(([title, text]) => (
          <div key={title} className="home-why-card">
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
