import { formatPaymentAmount, paymentSplitCopy, type PaymentSplitLang } from "@/lib/paymentSplit";

type PaymentBreakdownEmailFields = {
  ownerAmount?: number | string | null;
  marketplaceFeeAmount?: number | string | null;
  customerTotalAmount?: number | string | null;
  currency?: string | null;
};

type BookingEmail = {
  locale?: string | null;
  id: number;
  boatTitle: string;
  boatSlug: string;
  name: string;
  phone: string;
  email?: string;
  start: string;
  end: string;
  people: number;
  skipper: boolean;
  notes?: string;
} & PaymentBreakdownEmailFields;

type OwnerDecisionEmail = {
  locale?: string | null;
  boatTitle: string;
  boatSlug: string;
  ownerUrl: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  start: string;
  end: string;
  people: number;
  skipper: boolean;
  notes?: string;
} & PaymentBreakdownEmailFields;

type BookingCustomerRequestEmail = {
  locale?: string | null;
  boatTitle: string;
  customerName: string;
  start?: string | null;
  end?: string | null;
  publicToken?: string | null;
  supportNote?: string | null;
  supportEmail?: string | null;
} & PaymentBreakdownEmailFields;

type BookingCustomerDecisionEmail = {
  locale?: string | null;
  boatTitle: string;
  customerName: string;
  publicToken?: string | null;
  start?: string | null;
  end?: string | null;
  supportNote?: string | null;
  supportEmail?: string | null;
} & PaymentBreakdownEmailFields;

type OwnerPasswordResetEmail = {
  locale?: string | null;
  resetUrl: string;
  expiresMinutes: number;
};

export function bookingAdminEmail(p: BookingEmail) {
  const subject = `New booking request: ${p.boatTitle}`;

  const text = [
    `New booking request`,
    ``,
    `Boat: ${p.boatTitle}`,
    `Slug: ${p.boatSlug}`,
    `Request ID: ${p.id}`,
    ``,
    `Name: ${p.name}`,
    `Phone: ${p.phone}`,
    p.email ? `Email: ${p.email}` : null,
    ``,
    `From: ${p.start}`,
    `To: ${p.end}`,
    `People: ${p.people}`,
    `Skipper: ${p.skipper ? "yes" : "no"}`,
    ``,
    p.notes ? `Notes:\n${p.notes}` : null,
  ].filter(Boolean).join("\n");

  return { subject, text };
}

function normalizeLocale(value: string | null | undefined): PaymentSplitLang {
  return value === "ru" || value === "me" || value === "en" ? value : "en";
}

function hasPaymentBreakdown(p: PaymentBreakdownEmailFields): boolean {
  return (
    p.ownerAmount !== null &&
    p.ownerAmount !== undefined &&
    p.marketplaceFeeAmount !== null &&
    p.marketplaceFeeAmount !== undefined &&
    p.customerTotalAmount !== null &&
    p.customerTotalAmount !== undefined
  );
}

function paymentBreakdownText(p: PaymentBreakdownEmailFields, locale: PaymentSplitLang): string[] {
  if (!hasPaymentBreakdown(p)) return [];
  const copy = paymentSplitCopy[locale];
  const currency = p.currency || "EUR";

  return [
    `${copy.tripPrice}: ${formatPaymentAmount(p.ownerAmount, currency, locale)}`,
    `${copy.onlineBookingFee}: ${formatPaymentAmount(p.marketplaceFeeAmount, currency, locale)}`,
    `${copy.totalCost}: ${formatPaymentAmount(p.customerTotalAmount, currency, locale)}`,
    `${copy.payOnlineNow}: ${formatPaymentAmount(p.marketplaceFeeAmount, currency, locale)}`,
    `${copy.payOwnerDuringTrip}: ${formatPaymentAmount(p.ownerAmount, currency, locale)}`,
    copy.mainExplanation,
  ];
}

function paymentBreakdownHtml(p: PaymentBreakdownEmailFields, locale: PaymentSplitLang): string[] {
  if (!hasPaymentBreakdown(p)) return [];
  return paymentBreakdownText(p, locale).map((line) => `<p>${escapeHtml(line)}</p>`);
}

function customerRequestCopy(locale: PaymentSplitLang, p: BookingCustomerRequestEmail) {
  if (locale === "ru") {
    return {
      subject: `Заявка получена: ${p.boatTitle}`,
      hello: `Здравствуйте, ${p.customerName},`,
      received: `Мы получили вашу заявку на бронирование: ${p.boatTitle}.`,
      from: "С",
      to: "До",
      reference: "Номер заявки",
      notFinal: "Бронирование ещё не финальное. Может потребоваться подтверждение владельца.",
      support: "Поддержка",
      sign: "Sharmar",
    };
  }

  if (locale === "me") {
    return {
      subject: `Zahtjev je primljen: ${p.boatTitle}`,
      hello: `Poštovani/a ${p.customerName},`,
      received: `Primili smo vaš zahtjev za rezervaciju: ${p.boatTitle}.`,
      from: "Od",
      to: "Do",
      reference: "Referenca zahtjeva",
      notFinal: "Rezervacija još nije konačna. Može biti potrebna potvrda vlasnika.",
      support: "Podrška",
      sign: "Sharmar",
    };
  }

  return {
    subject: `Booking request received: ${p.boatTitle}`,
    hello: `Hello ${p.customerName},`,
    received: `We received your booking request for ${p.boatTitle}.`,
    from: "From",
    to: "To",
    reference: "Booking reference",
    notFinal: "Your booking is not final until confirmed. Owner confirmation may be required before the booking is completed.",
    support: "Support",
    sign: "Sharmar",
  };
}

function customerDecisionCopy(locale: PaymentSplitLang, p: BookingCustomerDecisionEmail, status: "confirmed" | "declined") {
  if (locale === "ru") {
    return {
      subject: status === "confirmed" ? `Бронирование подтверждено: ${p.boatTitle}` : `Заявка отклонена: ${p.boatTitle}`,
      hello: `Здравствуйте, ${p.customerName},`,
      decision: status === "confirmed"
        ? `Ваша заявка на бронирование ${p.boatTitle} подтверждена.`
        : `Ваша заявка на бронирование ${p.boatTitle} отклонена.`,
      ownerApproved: "Владелец подтвердил вашу заявку.",
      from: "С",
      to: "До",
      reference: "Номер заявки",
      support: "Поддержка",
      sign: "Sharmar",
    };
  }

  if (locale === "me") {
    return {
      subject: status === "confirmed" ? `Rezervacija potvrđena: ${p.boatTitle}` : `Zahtjev odbijen: ${p.boatTitle}`,
      hello: `Poštovani/a ${p.customerName},`,
      decision: status === "confirmed"
        ? `Vaš zahtjev za rezervaciju ${p.boatTitle} je potvrđen.`
        : `Vaš zahtjev za rezervaciju ${p.boatTitle} je odbijen.`,
      ownerApproved: "Vlasnik je potvrdio vaš zahtjev.",
      from: "Od",
      to: "Do",
      reference: "Referenca zahtjeva",
      support: "Podrška",
      sign: "Sharmar",
    };
  }

  return {
    subject: status === "confirmed" ? `Booking confirmed: ${p.boatTitle}` : `Booking request declined: ${p.boatTitle}`,
    hello: `Hello ${p.customerName},`,
    decision: status === "confirmed"
      ? `Your booking request for ${p.boatTitle} has been confirmed.`
      : `Your booking request for ${p.boatTitle} was declined.`,
    ownerApproved: "The owner approved your request.",
    from: "From",
    to: "To",
    reference: "Booking reference",
    support: "Support",
    sign: "Sharmar",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bookingCustomerRequestEmail(p: BookingCustomerRequestEmail) {
  const locale = normalizeLocale(p.locale);
  const copy = customerRequestCopy(locale, p);
  const subject = copy.subject;

  const text = [
    copy.hello,
    ``,
    copy.received,
    p.start ? `${copy.from}: ${p.start}` : null,
    p.end ? `${copy.to}: ${p.end}` : null,
    p.publicToken ? `${copy.reference}: ${p.publicToken}` : null,
    ``,
    copy.notFinal,
    ...paymentBreakdownText(p, locale),
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `${copy.support}: ${p.supportEmail}` : null,
    ``,
    copy.sign,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>${escapeHtml(copy.hello)}</p>`,
    `<p>${escapeHtml(copy.received)}</p>`,
    p.start ? `<p><strong>${escapeHtml(copy.from)}:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>${escapeHtml(copy.to)}:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>${escapeHtml(copy.reference)}:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    `<p>${escapeHtml(copy.notFinal)}</p>`,
    ...paymentBreakdownHtml(p, locale),
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>${escapeHtml(copy.support)}: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>${escapeHtml(copy.sign)}</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function bookingConfirmedCustomerEmail(p: BookingCustomerDecisionEmail) {
  const locale = normalizeLocale(p.locale);
  const copy = customerDecisionCopy(locale, p, "confirmed");
  const subject = copy.subject;

  const text = [
    copy.hello,
    ``,
    copy.decision,
    copy.ownerApproved,
    p.start ? `${copy.from}: ${p.start}` : null,
    p.end ? `${copy.to}: ${p.end}` : null,
    p.publicToken ? `${copy.reference}: ${p.publicToken}` : null,
    ``,
    ...paymentBreakdownText(p, locale),
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `${copy.support}: ${p.supportEmail}` : null,
    ``,
    copy.sign,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>${escapeHtml(copy.hello)}</p>`,
    `<p>${escapeHtml(copy.decision)}</p>`,
    `<p>${escapeHtml(copy.ownerApproved)}</p>`,
    p.start ? `<p><strong>${escapeHtml(copy.from)}:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>${escapeHtml(copy.to)}:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>${escapeHtml(copy.reference)}:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    ...paymentBreakdownHtml(p, locale),
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>${escapeHtml(copy.support)}: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>${escapeHtml(copy.sign)}</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function bookingDeclinedCustomerEmail(p: BookingCustomerDecisionEmail) {
  const locale = normalizeLocale(p.locale);
  const copy = customerDecisionCopy(locale, p, "declined");
  const subject = copy.subject;

  const text = [
    copy.hello,
    ``,
    copy.decision,
    p.start ? `${copy.from}: ${p.start}` : null,
    p.end ? `${copy.to}: ${p.end}` : null,
    p.publicToken ? `${copy.reference}: ${p.publicToken}` : null,
    ``,
    ...paymentBreakdownText(p, locale),
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `${copy.support}: ${p.supportEmail}` : null,
    ``,
    copy.sign,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>${escapeHtml(copy.hello)}</p>`,
    `<p>${escapeHtml(copy.decision)}</p>`,
    p.start ? `<p><strong>${escapeHtml(copy.from)}:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>${escapeHtml(copy.to)}:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>${escapeHtml(copy.reference)}:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    ...paymentBreakdownHtml(p, locale),
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>${escapeHtml(copy.support)}: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>${escapeHtml(copy.sign)}</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function ownerDecisionEmail(p: OwnerDecisionEmail) {
  const locale = normalizeLocale(p.locale);
  const subject = `Owner decision required: ${p.boatTitle}`;

  const text = [
    `A booking request is waiting for your decision.`,
    ``,
    `Boat: ${p.boatTitle}`,
    `Slug: ${p.boatSlug}`,
    ``,
    `Client: ${p.clientName}`,
    `Phone: ${p.clientPhone}`,
    p.clientEmail ? `Email: ${p.clientEmail}` : null,
    ``,
    `From: ${p.start}`,
    `To: ${p.end}`,
    `People: ${p.people}`,
    `Skipper: ${p.skipper ? "yes" : "no"}`,
    ``,
    ...paymentBreakdownText(p, locale),
    ``,
    p.notes ? `Notes:\n${p.notes}` : null,
    ``,
    `Open owner page:`,
    p.ownerUrl,
  ].filter(Boolean).join("\n");

  return { subject, text };
}

export function ownerPasswordResetEmail(p: OwnerPasswordResetEmail) {
  const locale = p.locale === "ru" || p.locale === "me" || p.locale === "en" ? p.locale : "en";

  const copy = {
    en: {
      subject: "Reset your Sharmar owner password",
      heading: "Reset your Sharmar password",
      intro: "We received a request to reset the password for your Sharmar owner account.",
      action: "Open this one-time link to set a new password:",
      expires: `This link expires in ${p.expiresMinutes} minutes.`,
      ignore: "If you did not request this, ignore this email. Your password will not change.",
    },
    ru: {
      subject: "Сброс пароля владельца Sharmar",
      heading: "Сброс пароля Sharmar",
      intro: "Мы получили запрос на сброс пароля для аккаунта владельца Sharmar.",
      action: "Откройте эту одноразовую ссылку, чтобы задать новый пароль:",
      expires: `Ссылка действует ${p.expiresMinutes} минут.`,
      ignore: "Если вы не запрашивали сброс, просто проигнорируйте письмо. Пароль не изменится.",
    },
    me: {
      subject: "Reset lozinke vlasnika Sharmar",
      heading: "Reset lozinke za Sharmar",
      intro: "Primili smo zahtjev za reset lozinke za vaš Sharmar nalog vlasnika.",
      action: "Otvorite ovaj jednokratni link da postavite novu lozinku:",
      expires: `Link važi ${p.expiresMinutes} minuta.`,
      ignore: "Ako nijeste tražili reset, ignorišite ovu poruku. Lozinka se neće promijeniti.",
    },
  }[locale];

  const text = [
    copy.heading,
    "",
    copy.intro,
    copy.action,
    p.resetUrl,
    "",
    copy.expires,
    copy.ignore,
    "",
    "Sharmar",
  ].join("\n");

  const html = `<div>
    <h1>${escapeHtml(copy.heading)}</h1>
    <p>${escapeHtml(copy.intro)}</p>
    <p>${escapeHtml(copy.action)}</p>
    <p><a href="${escapeHtml(p.resetUrl)}">${escapeHtml(p.resetUrl)}</a></p>
    <p>${escapeHtml(copy.expires)}</p>
    <p>${escapeHtml(copy.ignore)}</p>
    <p>Sharmar</p>
  </div>`;

  return { subject: copy.subject, text, html };
}
