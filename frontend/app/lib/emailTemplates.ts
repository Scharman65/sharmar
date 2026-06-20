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
};

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
};

type BookingCustomerRequestEmail = {
  locale?: string | null;
  boatTitle: string;
  customerName: string;
  start?: string | null;
  end?: string | null;
  publicToken?: string | null;
  supportNote?: string | null;
  supportEmail?: string | null;
};

type BookingCustomerDecisionEmail = {
  locale?: string | null;
  boatTitle: string;
  customerName: string;
  publicToken?: string | null;
  start?: string | null;
  end?: string | null;
  supportNote?: string | null;
  supportEmail?: string | null;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function bookingCustomerRequestEmail(p: BookingCustomerRequestEmail) {
  const subject = `Booking request received: ${p.boatTitle}`;

  const text = [
    `Hello ${p.customerName},`,
    ``,
    `We received your booking request for ${p.boatTitle}.`,
    p.start ? `From: ${p.start}` : null,
    p.end ? `To: ${p.end}` : null,
    p.publicToken ? `Booking reference: ${p.publicToken}` : null,
    ``,
    `Your booking is not final until confirmed. Owner confirmation may be required before the booking is completed.`,
    `Any booking fee or payment status is handled through the Sharmar flow.`,
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `Support: ${p.supportEmail}` : null,
    ``,
    `Sharmar`,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>Hello ${escapeHtml(p.customerName)},</p>`,
    `<p>We received your booking request for <strong>${escapeHtml(p.boatTitle)}</strong>.</p>`,
    p.start ? `<p><strong>From:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>To:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>Booking reference:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    `<p>Your booking is not final until confirmed. Owner confirmation may be required before the booking is completed.</p>`,
    `<p>Any booking fee or payment status is handled through the Sharmar flow.</p>`,
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>Support: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>Sharmar</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function bookingConfirmedCustomerEmail(p: BookingCustomerDecisionEmail) {
  const subject = `Booking confirmed: ${p.boatTitle}`;

  const text = [
    `Hello ${p.customerName},`,
    ``,
    `Your booking request for ${p.boatTitle} has been confirmed.`,
    `The owner approved your request.`,
    p.start ? `From: ${p.start}` : null,
    p.end ? `To: ${p.end}` : null,
    p.publicToken ? `Booking reference: ${p.publicToken}` : null,
    ``,
    `Any remaining payment instructions are handled separately through the Sharmar flow or directly with the owner as applicable.`,
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `Support: ${p.supportEmail}` : null,
    ``,
    `Sharmar`,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>Hello ${escapeHtml(p.customerName)},</p>`,
    `<p>Your booking request for <strong>${escapeHtml(p.boatTitle)}</strong> has been confirmed.</p>`,
    `<p>The owner approved your request.</p>`,
    p.start ? `<p><strong>From:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>To:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>Booking reference:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    `<p>Any remaining payment instructions are handled separately through the Sharmar flow or directly with the owner as applicable.</p>`,
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>Support: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>Sharmar</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function bookingDeclinedCustomerEmail(p: BookingCustomerDecisionEmail) {
  const subject = `Booking request declined: ${p.boatTitle}`;

  const text = [
    `Hello ${p.customerName},`,
    ``,
    `Your booking request for ${p.boatTitle} was declined.`,
    p.start ? `From: ${p.start}` : null,
    p.end ? `To: ${p.end}` : null,
    p.publicToken ? `Booking reference: ${p.publicToken}` : null,
    ``,
    `If a booking fee or payment applies, payment or refund handling is managed through the Sharmar flow.`,
    ``,
    p.supportNote ? p.supportNote : null,
    p.supportEmail ? `Support: ${p.supportEmail}` : null,
    ``,
    `Sharmar`,
  ].filter(Boolean).join("\n");

  const rows = [
    `<p>Hello ${escapeHtml(p.customerName)},</p>`,
    `<p>Your booking request for <strong>${escapeHtml(p.boatTitle)}</strong> was declined.</p>`,
    p.start ? `<p><strong>From:</strong> ${escapeHtml(p.start)}</p>` : null,
    p.end ? `<p><strong>To:</strong> ${escapeHtml(p.end)}</p>` : null,
    p.publicToken ? `<p><strong>Booking reference:</strong> ${escapeHtml(p.publicToken)}</p>` : null,
    `<p>If a booking fee or payment applies, payment or refund handling is managed through the Sharmar flow.</p>`,
    p.supportNote ? `<p>${escapeHtml(p.supportNote)}</p>` : null,
    p.supportEmail ? `<p>Support: ${escapeHtml(p.supportEmail)}</p>` : null,
    `<p>Sharmar</p>`,
  ].filter(Boolean).join("\n");

  const html = `<div>${rows}</div>`;

  return { subject, text, html };
}

export function ownerDecisionEmail(p: OwnerDecisionEmail) {
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
    p.notes ? `Notes:\n${p.notes}` : null,
    ``,
    `Open owner page:`,
    p.ownerUrl,
  ].filter(Boolean).join("\n");

  return { subject, text };
}
