import Link from "next/link";
import { isLang, t, type Lang } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function ThanksPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const tr = t(lang);

  return (
    <main className="main">
      <div className="container">
        <h1 className="h1">{tr.booking.sentTitle}</h1>

        <p className="kicker" style={{ marginTop: 12 }}>
          {tr.booking.sentText}
        </p>

        <div className="actions" style={{ marginTop: 24 }}>
          <Link className="button" href={`/${lang}/boats`}>
            {tr.boat.back_to_list}
          </Link>
        </div>
      </div>
    </main>
  );
}
