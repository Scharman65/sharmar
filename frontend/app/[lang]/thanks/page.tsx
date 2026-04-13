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
      ? "Платёж авторизован"
      : lang === "me"
        ? "Plaćanje je autorizovano"
        : "Payment authorized"
    : tr.booking.sentTitle;

  const text = isPaymentSuccess
    ? lang === "ru"
      ? "Средства на карте были авторизованы, но ещё не списаны окончательно. Мы отправили запрос владельцу лодки. После подтверждения владельцем бронирование будет подтверждено, а платёж завершён."
      : lang === "me"
        ? "Sredstva na kartici su autorizovana, ali još nijesu konačno naplaćena. Poslali smo zahtjev vlasniku broda. Nakon potvrde vlasnika, rezervacija će biti potvrđena, a plaćanje završeno."
        : "Your card has been authorized, but the payment has not been captured yet. We have sent the request to the boat owner. After the owner confirms, the booking will be confirmed and the payment will be completed."
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
