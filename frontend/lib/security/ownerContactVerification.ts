import crypto from "node:crypto";

export type OwnerVerificationLang = "en" | "ru" | "me";

export type OwnerContactVerificationProfile = {
  email_verified?: unknown;
  whatsapp_verified?: unknown;
  verification_status?: unknown;
};

type EmailVerificationPayload = {
  v: 1;
  userId: number;
  lang: OwnerVerificationLang;
  emailHash: string;
  expiresAt: number;
  nonce: string;
};

type TwilioVerifyResponse = {
  ok: boolean;
  status: string | null;
  providerCode?: string | null;
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}


export function hashOwnerVerificationEmail(value: unknown): string | null {
  const email = asString(value).toLowerCase();
  if (!email || !email.includes("@")) return null;
  return crypto.createHash("sha256").update(email).digest("hex");
}

export function normalizeOwnerVerificationLang(value: unknown): OwnerVerificationLang {
  return value === "ru" || value === "me" || value === "en" ? value : "en";
}

export function normalizeOwnerWhatsApp(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;

  let cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;
  if (!cleaned.startsWith("+")) return null;

  const digits = cleaned.slice(1);
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `+${digits}`;
}

export function configuredOwnerSiteOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = asString(env.SITE_URL || env.NEXT_PUBLIC_SITE_URL);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (env.NODE_ENV !== "production" && url.protocol !== "https:" && !isLocal) return null;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getOwnerContactVerificationSecret(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const secret = asString(env.OWNER_CONTACT_VERIFICATION_SECRET);
  return secret.length >= 32 ? secret : null;
}

export function createOwnerEmailVerificationToken(input: {
  userId: number;
  email: string;
  lang: OwnerVerificationLang;
  secret: string;
  nowMs?: number;
  ttlMs?: number;
  nonce?: string;
}): string {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error("invalid_owner_user_id");
  }
  if (input.secret.length < 32) {
    throw new Error("verification_secret_too_short");
  }

  const emailHash = hashOwnerVerificationEmail(input.email);
  if (!emailHash) throw new Error("invalid_owner_email");

  const nowMs = input.nowMs ?? Date.now();
  const payload: EmailVerificationPayload = {
    v: 1,
    userId: input.userId,
    lang: normalizeOwnerVerificationLang(input.lang),
    emailHash,
    expiresAt: nowMs + (input.ttlMs ?? EMAIL_VERIFICATION_TTL_MS),
    nonce: input.nonce || crypto.randomBytes(18).toString("base64url"),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${signPayload(encoded, input.secret)}`;
}

export function verifyOwnerEmailVerificationToken(input: {
  token: string;
  secret: string;
  nowMs?: number;
}): EmailVerificationPayload | null {
  if (input.secret.length < 32) return null;

  const [encoded, signature, extra] = asString(input.token).split(".");
  if (!encoded || !signature || extra) return null;

  const expected = signPayload(encoded, input.secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as Partial<EmailVerificationPayload>;
    const nowMs = input.nowMs ?? Date.now();
    if (
      payload.v !== 1 ||
      !Number.isInteger(payload.userId) ||
      Number(payload.userId) <= 0 ||
      typeof payload.emailHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(payload.emailHash) ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= nowMs ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 12
    ) {
      return null;
    }

    return {
      v: 1,
      userId: Number(payload.userId),
      lang: normalizeOwnerVerificationLang(payload.lang),
      emailHash: payload.emailHash,
      expiresAt: payload.expiresAt,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

export function ownerEmailVerificationMessage(input: {
  lang: OwnerVerificationLang;
  verificationUrl: string;
}): { subject: string; text: string; html: string } {
  const lang = normalizeOwnerVerificationLang(input.lang);
  if (lang === "ru") {
    return {
      subject: "Подтвердите email владельца Sharmar",
      text: `Подтвердите email владельца Sharmar по ссылке:\n${input.verificationUrl}\n\nСсылка действует 24 часа.`,
      html: `<p>Подтвердите email владельца Sharmar:</p><p><a href="${input.verificationUrl}">Подтвердить email</a></p><p>Ссылка действует 24 часа.</p>`,
    };
  }
  if (lang === "me") {
    return {
      subject: "Potvrdite email vlasnika na Sharmar-u",
      text: `Potvrdite email vlasnika putem linka:\n${input.verificationUrl}\n\nLink važi 24 sata.`,
      html: `<p>Potvrdite email vlasnika na Sharmar-u:</p><p><a href="${input.verificationUrl}">Potvrdi email</a></p><p>Link važi 24 sata.</p>`,
    };
  }
  return {
    subject: "Verify your Sharmar owner email",
    text: `Verify your Sharmar owner email using this link:\n${input.verificationUrl}\n\nThe link is valid for 24 hours.`,
    html: `<p>Verify your Sharmar owner email:</p><p><a href="${input.verificationUrl}">Verify email</a></p><p>The link is valid for 24 hours.</p>`,
  };
}

export function contactVerificationComplete(profile: OwnerContactVerificationProfile | null | undefined): boolean {
  return profile?.email_verified === true && profile?.whatsapp_verified === true;
}

export function nextOwnerContactVerificationStatus(input: {
  currentStatus: unknown;
  emailVerified: boolean;
  whatsappVerified: boolean;
}): string {
  const current = asString(input.currentStatus) || "new";
  if (["documents_uploaded", "under_review", "approved", "rejected", "blocked"].includes(current)) {
    return current;
  }
  if (input.emailVerified && input.whatsappVerified) return "whatsapp_verified";
  if (input.emailVerified) return "email_verified";
  return "new";
}

function twilioVerifyConfig(env: NodeJS.ProcessEnv): {
  accountSid: string;
  authToken: string;
  serviceSid: string;
} | null {
  const accountSid = asString(env.TWILIO_ACCOUNT_SID);
  const authToken = asString(env.TWILIO_AUTH_TOKEN);
  const serviceSid = asString(env.TWILIO_VERIFY_SERVICE_SID);
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) return null;
  if (!authToken) return null;
  if (!/^VA[0-9a-fA-F]{32}$/.test(serviceSid)) return null;
  return { accountSid, authToken, serviceSid };
}

export function ownerWhatsAppVerificationReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return twilioVerifyConfig(env) !== null;
}

async function twilioVerifyRequest(input: {
  path: "Verifications" | "VerificationCheck";
  body: URLSearchParams;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<TwilioVerifyResponse> {
  const config = twilioVerifyConfig(input.env);
  if (!config) return { ok: false, status: null, providerCode: "provider_not_configured" };

  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
  const fetchImpl = input.fetchImpl || fetch;
  const response = await fetchImpl(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.serviceSid)}/${input.path}`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: input.body,
    }
  );

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const status = typeof json?.status === "string" ? json.status : null;
  const providerCode =
    typeof json?.code === "number" || typeof json?.code === "string"
      ? String(json.code)
      : null;

  return {
    ok: response.ok,
    status,
    providerCode,
  };
}

export async function startOwnerWhatsAppVerification(input: {
  to: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<TwilioVerifyResponse> {
  const to = normalizeOwnerWhatsApp(input.to);
  if (!to) return { ok: false, status: null, providerCode: "invalid_whatsapp_number" };

  return twilioVerifyRequest({
    path: "Verifications",
    body: new URLSearchParams({ To: to, Channel: "whatsapp" }),
    env: input.env || process.env,
    fetchImpl: input.fetchImpl,
  });
}

export async function checkOwnerWhatsAppVerification(input: {
  to: string;
  code: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<TwilioVerifyResponse> {
  const to = normalizeOwnerWhatsApp(input.to);
  const code = asString(input.code);
  if (!to) return { ok: false, status: null, providerCode: "invalid_whatsapp_number" };
  if (!/^\d{4,10}$/.test(code)) return { ok: false, status: null, providerCode: "invalid_verification_code" };

  return twilioVerifyRequest({
    path: "VerificationCheck",
    body: new URLSearchParams({ To: to, Code: code }),
    env: input.env || process.env,
    fetchImpl: input.fetchImpl,
  });
}
