type BookingEmail = {
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
