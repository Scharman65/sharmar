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
