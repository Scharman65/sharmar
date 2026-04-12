import Link from "next/link";
import { isLang, t, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ payment?: string; token?: string }>;
};

export default async function ThanksPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  const sp = (await searchParams) ?? {};
  const paymentStatus = typeof sp.payment === "string" ? sp.payment.trim() : "";
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  const isPaymentSuccess = paymentStatus === "success";

  const title = isPaymentSuccess
    ? lang === "ru"
      ? "Оплата прошла успешно"
      : lang === "me"
        ? "Plaćanje je uspješno završeno"
        : "Payment completed successfully"
    : tr.booking.sentTitle;

  const text = isPaymentSuccess
    ? lang === "ru"
      ? "Ваш платёж был успешно подтверждён. Мы получили бронирование и свяжемся с вами для дальнейших деталей."
      : lang === "me"
        ? "Vaša uplata je uspješno potvrđena. Primili smo rezervaciju i kontaktiraćemo vas za dalje detalje."
        : "Your payment has been confirmed successfully. We have received the booking and will contact you with the next details."
    : tr.booking.sentText;

  const referenceLabel =
    lang === "ru"
      ? "Референс бронирования"
      : lang === "me"
        ? "Referenca rezervacije"
        : "Booking reference";

  return (
    <main className="main">
      <div className="container">
        <h1 className="h1">{title}</h1>

        <p className="kicker" style={{ marginTop: 12 }}>
          {text}
        </p>

        {isPaymentSuccess && token ? (
          <p className="kicker" style={{ marginTop: 12 }}>
            {referenceLabel}: <b>{token}</b>
          </p>
        ) : null}

        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="button" href={`/${lang}/boats`}>
            {tr.boat.back_to_list}
          </Link>
        </div>
      </div>
    </main>
  );
}
