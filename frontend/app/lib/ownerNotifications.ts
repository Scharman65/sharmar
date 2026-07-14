import crypto from "node:crypto";

export type OwnerContact = {
  owner_email: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
  owner_viber?: string | null;
  notifications_allowed?: boolean;
  skipped_reason?: string | null;
};

export type OwnerNotificationRequest = {
  requestId: number;
  publicToken: string;
  locale: string;
  boatTitle: string;
  boatSlug: string;
  ownerUrl: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  start: string;
  end: string;
  people: number;
  skipper: boolean;
  notes?: string | null;
  ownerContact: OwnerContact | null;
};

export type NotificationResult = {
  channel: "email" | "whatsapp" | "sms";
  provider: string;
  attempted: boolean;
  accepted: boolean;
  providerMessageId?: string | null;
  skippedReason?: string | null;
  errorCode?: string | null;
};

type ClaimDelivery = (input: {
  deduplicationKey: string;
  requestId: number;
  publicToken: string;
  channel: NotificationResult["channel"];
  provider: string;
}) => Promise<{ claimed: boolean }>;

type RecordDelivery = (input: {
  deduplicationKey: string;
  result: NotificationResult;
}) => Promise<void>;

type EmailSender = {
  emails: {
    send(input: { from: string; to: string; subject: string; text: string; html?: string }): Promise<unknown>;
  };
};

type NotifyDeps = {
  resend: EmailSender | null;
  bookingFrom: string;
  claimDelivery: ClaimDelivery;
  recordDelivery: RecordDelivery;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
};

export function maskContact(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const [name, domain] = raw.split("@");
    return `${name.slice(0, 1)}***@${domain || "unknown"}`;
  }
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length <= 4) return "***";
  return `${digits.slice(0, 3)}***${digits.slice(-2)}`;
}

export function maskProviderMessageId(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length <= 8) return "***";
  return `${raw.slice(0, 6)}***${raw.slice(-4)}`;
}

export function hashProviderMessageId(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function normalizeE164(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;
  if (!cleaned.startsWith("+")) return null;
  const digits = cleaned.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export function ownerNotificationDeduplicationKey(
  requestId: number,
  publicToken: string,
  channel: NotificationResult["channel"]
): string {
  return `booking_request_owner:${requestId}:${publicToken}:${channel}`;
}

function localePrefix(locale: string): string {
  if (locale === "ru") return "Новая заявка";
  if (locale === "me") return "Novi zahtjev";
  return "New booking request";
}

export function renderShortOwnerMessage(input: OwnerNotificationRequest): string {
  return [
    `${localePrefix(input.locale)}: ${input.boatTitle}`,
    `From: ${input.start}`,
    `To: ${input.end}`,
    `People: ${input.people}`,
    `Skipper: ${input.skipper ? "yes" : "no"}`,
    `Open: ${input.ownerUrl}`,
  ].join("\n");
}

export function getWhatsAppProvider(env: NodeJS.ProcessEnv = process.env): {
  provider: string;
  ready: boolean;
  skippedReason?: string;
} {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) {
    return { provider: "twilio_whatsapp", ready: true };
  }
  if (env.META_WHATSAPP_TOKEN && env.META_WHATSAPP_PHONE_NUMBER_ID && env.META_WHATSAPP_TEMPLATE_NAME) {
    return { provider: "meta_whatsapp", ready: true };
  }
  return { provider: "none", ready: false, skippedReason: "PROVIDER_NOT_CONFIGURED" };
}

export function getSmsProvider(env: NodeJS.ProcessEnv = process.env): {
  provider: string;
  ready: boolean;
  skippedReason?: string;
} {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_SMS_FROM) {
    return { provider: "twilio_sms", ready: true };
  }
  if (env.VONAGE_API_KEY && env.VONAGE_API_SECRET && env.VONAGE_SMS_FROM) {
    return { provider: "vonage_sms", ready: true };
  }
  if ((env.MESSAGEBIRD_API_KEY || env.BIRD_API_KEY) && env.BIRD_SMS_FROM) {
    return { provider: "bird_sms", ready: true };
  }
  return { provider: "none", ready: false, skippedReason: "PROVIDER_NOT_CONFIGURED" };
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("notification_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractProviderId(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const rec = response as Record<string, unknown>;
  const id = rec.id || rec.sid || rec.messageId || rec.message_id;
  return typeof id === "string" ? id : null;
}

function ownerDecisionEmail(input: OwnerNotificationRequest): { subject: string; text: string } {
  const subject = `Owner decision required: ${input.boatTitle}`;
  const text = [
    "A booking request is waiting for your decision.",
    "",
    `Boat: ${input.boatTitle}`,
    `Slug: ${input.boatSlug}`,
    "",
    `Client: ${input.clientName}`,
    `Phone: ${input.clientPhone}`,
    input.clientEmail ? `Email: ${input.clientEmail}` : null,
    "",
    `From: ${input.start}`,
    `To: ${input.end}`,
    `People: ${input.people}`,
    `Skipper: ${input.skipper ? "yes" : "no"}`,
    "",
    input.notes ? `Notes:\n${input.notes}` : null,
    "",
    "Open owner page:",
    input.ownerUrl,
  ].filter(Boolean).join("\n");

  return { subject, text };
}

async function sendOwnerEmail(input: OwnerNotificationRequest, deps: NotifyDeps): Promise<NotificationResult> {
  const provider = "resend";
  const to = input.ownerContact?.owner_email?.trim();
  if (!deps.resend || !to) {
    return {
      channel: "email",
      provider,
      attempted: false,
      accepted: false,
      skippedReason: !to ? "MISSING_OWNER_EMAIL" : "PROVIDER_NOT_CONFIGURED",
    };
  }

  try {
    const mail = ownerDecisionEmail(input);
    const response = await withTimeout(
      deps.resend.emails.send({
        from: deps.bookingFrom,
        to,
        subject: mail.subject,
        text: mail.text,
      }),
      10_000
    );
    return {
      channel: "email",
      provider,
      attempted: true,
      accepted: true,
      providerMessageId: extractProviderId(response),
    };
  } catch (error) {
    return {
      channel: "email",
      provider,
      attempted: true,
      accepted: false,
      errorCode: error instanceof Error ? error.message : "EMAIL_SEND_FAILED",
    };
  }
}

async function postTwilioMessage(
  fetchImpl: typeof fetch,
  env: NodeJS.ProcessEnv,
  input: URLSearchParams
): Promise<string | null> {
  const sid = String(env.TWILIO_ACCOUNT_SID || "");
  const token = String(env.TWILIO_AUTH_TOKEN || "");
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const response = await withTimeout(
    fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: input,
    }),
    10_000
  );
  if (!response.ok) throw new Error(`TWILIO_${response.status}`);
  const json = (await response.json().catch(() => null)) as unknown;
  return extractProviderId(json);
}

async function sendOwnerWhatsApp(input: OwnerNotificationRequest, deps: NotifyDeps): Promise<NotificationResult> {
  const env = deps.env || process.env;
  const readiness = getWhatsAppProvider(env);
  if (!readiness.ready) {
    return { channel: "whatsapp", provider: readiness.provider, attempted: false, accepted: false, skippedReason: readiness.skippedReason };
  }
  const to = normalizeE164(input.ownerContact?.owner_whatsapp || input.ownerContact?.owner_phone);
  if (!to) return { channel: "whatsapp", provider: readiness.provider, attempted: false, accepted: false, skippedReason: "MISSING_OWNER_WHATSAPP" };

  try {
    if (readiness.provider === "twilio_whatsapp") {
      const body = new URLSearchParams({
        From: `whatsapp:${env.TWILIO_WHATSAPP_FROM}`,
        To: `whatsapp:${to}`,
        Body: renderShortOwnerMessage(input),
      });
      const id = await postTwilioMessage(deps.fetchImpl || fetch, env, body);
      return { channel: "whatsapp", provider: readiness.provider, attempted: true, accepted: true, providerMessageId: id };
    }
    return { channel: "whatsapp", provider: readiness.provider, attempted: false, accepted: false, skippedReason: "PROVIDER_TEMPLATE_NOT_IMPLEMENTED" };
  } catch (error) {
    return { channel: "whatsapp", provider: readiness.provider, attempted: true, accepted: false, errorCode: error instanceof Error ? error.message : "WHATSAPP_SEND_FAILED" };
  }
}

async function sendOwnerSms(input: OwnerNotificationRequest, deps: NotifyDeps): Promise<NotificationResult> {
  const env = deps.env || process.env;
  const readiness = getSmsProvider(env);
  if (!readiness.ready) {
    return { channel: "sms", provider: readiness.provider, attempted: false, accepted: false, skippedReason: readiness.skippedReason };
  }
  const to = normalizeE164(input.ownerContact?.owner_phone);
  if (!to) return { channel: "sms", provider: readiness.provider, attempted: false, accepted: false, skippedReason: "MISSING_OWNER_PHONE" };

  try {
    if (readiness.provider === "twilio_sms") {
      const body = new URLSearchParams({
        From: String(env.TWILIO_SMS_FROM || ""),
        To: to,
        Body: renderShortOwnerMessage(input),
      });
      const id = await postTwilioMessage(deps.fetchImpl || fetch, env, body);
      return { channel: "sms", provider: readiness.provider, attempted: true, accepted: true, providerMessageId: id };
    }
    return { channel: "sms", provider: readiness.provider, attempted: false, accepted: false, skippedReason: "PROVIDER_NOT_IMPLEMENTED" };
  } catch (error) {
    return { channel: "sms", provider: readiness.provider, attempted: true, accepted: false, errorCode: error instanceof Error ? error.message : "SMS_SEND_FAILED" };
  }
}

async function runChannel(
  input: OwnerNotificationRequest,
  deps: NotifyDeps,
  channel: NotificationResult["channel"],
  send: () => Promise<NotificationResult>
): Promise<NotificationResult> {
  const provider =
    channel === "email" ? "resend" :
      channel === "whatsapp" ? getWhatsAppProvider(deps.env).provider :
        getSmsProvider(deps.env).provider;
  const deduplicationKey = ownerNotificationDeduplicationKey(input.requestId, input.publicToken, channel);

  const claim = await deps.claimDelivery({
    deduplicationKey,
    requestId: input.requestId,
    publicToken: input.publicToken,
    channel,
    provider,
  }).catch(() => ({ claimed: true }));

  if (!claim.claimed) {
    return { channel, provider, attempted: false, accepted: false, skippedReason: "DUPLICATE_NOTIFICATION" };
  }

  const result = await send();
  await deps.recordDelivery({ deduplicationKey, result }).catch(() => undefined);
  return {
    ...result,
    providerMessageId: maskProviderMessageId(result.providerMessageId),
  };
}

export async function notifyOwnerOfBookingRequest(
  input: OwnerNotificationRequest,
  deps: NotifyDeps
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  results.push(await runChannel(input, deps, "email", () => sendOwnerEmail(input, deps)));
  results.push(await runChannel(input, deps, "whatsapp", () => sendOwnerWhatsApp(input, deps)));
  results.push(await runChannel(input, deps, "sms", () => sendOwnerSms(input, deps)));

  return results;
}
