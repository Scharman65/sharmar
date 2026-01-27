import { Resend } from "resend";

const KEY = (process.env.RESEND_API_KEY ?? "").trim();

export const resend: Resend | null = KEY ? new Resend(KEY) : null;

export const BOOKING_TO = (process.env.BOOKING_NOTIFY_TO ?? "").trim() || null;
export const BOOKING_FROM =
  (process.env.BOOKING_NOTIFY_FROM ?? "").trim() || "Sharmar <no-reply@sharmar.me>";

if (!KEY) {
  console.warn("WARN: RESEND_API_KEY is not set. Email sending is disabled.");
}
