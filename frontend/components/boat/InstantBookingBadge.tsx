import type { Lang } from "@/i18n";

type Props = {
  lang: Lang;
};

export function InstantBookingBadge({ lang }: Props) {
  const label =
    lang === "ru"
      ? "Мгновенное бронирование"
      : lang === "me"
        ? "Instantna rezervacija"
        : "Instant booking";

  return <span className="badge">⚡ {label}</span>;
}
