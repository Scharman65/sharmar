import type { Metadata } from "next";
import { Suspense } from "react";

import { absoluteLocalizedUrl, languageAlternates, normalizeLang, type Lang } from "@/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

const REQUEST_SEO: Record<Lang, { title: string; description: string }> = {
  en: {
    title: "Booking request | Sharmar",
    description: "Send a structured yacht booking request through Sharmar for owner review and confirmation.",
  },
  ru: {
    title: "Заявка на бронирование | Sharmar",
    description: "Отправьте структурированную заявку на бронирование яхты через Sharmar для проверки и подтверждения владельцем.",
  },
  me: {
    title: "Zahtjev za rezervaciju | Sharmar",
    description: "Pošaljite strukturirani zahtjev za rezervaciju jahte preko Sharmar platforme na pregled i potvrdu vlasnika.",
  },
};

const REQUEST_LOADING: Record<Lang, { title: string; text: string }> = {
  en: {
    title: "Preparing booking request",
    text: "Loading the request form...",
  },
  ru: {
    title: "Подготовка заявки",
    text: "Загружаем форму заявки...",
  },
  me: {
    title: "Priprema zahtjeva",
    text: "Učitavamo formu zahtjeva...",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);
  const seo = REQUEST_SEO[lang];
  const canonical = absoluteLocalizedUrl(lang, "request");

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: languageAlternates("request"),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: "Sharmar",
      type: "website",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

function RequestFallback({ lang }: { lang: Lang }) {
  const copy = REQUEST_LOADING[lang];

  return (
    <div className="container request-container">
        <section
          aria-live="polite"
          aria-busy="true"
          style={{
            marginTop: 42,
            maxWidth: 720,
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 18,
            padding: 24,
            background: "rgba(255, 255, 255, 0.055)",
          }}
        >
          <p className="kicker request-eyebrow">{copy.title}</p>
          <h1 className="h1 request-title">{copy.text}</h1>
        </section>
    </div>
  );
}

export default async function RequestLayout({ children, params }: Props) {
  const { lang: raw } = await params;
  const lang = normalizeLang(raw);

  return <Suspense fallback={<RequestFallback lang={lang} />}>{children}</Suspense>;
}
