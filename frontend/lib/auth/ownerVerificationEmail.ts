import { appendFile } from "node:fs/promises";

import { BOOKING_FROM, resend } from "@/app/lib/email";
import {
  configuredOwnerSiteOrigin,
  createOwnerEmailVerificationToken,
  getOwnerContactVerificationSecret,
  normalizeOwnerVerificationLang,
  ownerEmailVerificationMessage,
  type OwnerVerificationLang,
} from "@/lib/security/ownerContactVerification";

type OwnerVerificationEmailClient = {
  emails: {
    send(input: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
    }): Promise<unknown>;
  };
};

export const OWNER_VERIFICATION_EMAIL_FROM_ENV = "OWNER_VERIFICATION_EMAIL_FROM";

function ownerVerificationEmailFrom(env: NodeJS.ProcessEnv): string {
  return String(env[OWNER_VERIFICATION_EMAIL_FROM_ENV] || "").trim() || BOOKING_FROM;
}

function providerErrorCode(value: unknown): string {
  if (!value || typeof value !== "object") return "unknown";
  const record = value as Record<string, unknown>;
  for (const key of ["name", "code", "statusCode", "status"]) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 80);
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  }
  return "unknown";
}

function logOwnerVerificationEmailFailure(stage: string, error: unknown) {
  console.error("OWNER_VERIFICATION_EMAIL_SEND_FAILED", {
    provider: "resend",
    stage,
    providerCode: providerErrorCode(error),
  });
}

export async function sendOwnerVerificationEmail(input: {
  userId: number;
  email: string;
  lang: OwnerVerificationLang;
  env?: NodeJS.ProcessEnv;
  emailClient?: OwnerVerificationEmailClient | null;
}): Promise<{ sent: boolean; code: string }> {
  const env = input.env || process.env;
  const secret = getOwnerContactVerificationSecret(env);
  const siteOrigin = configuredOwnerSiteOrigin(env);

  if (!secret) return { sent: false, code: "verification_secret_missing" };
  if (!siteOrigin) return { sent: false, code: "site_url_not_configured" };

  const lang = normalizeOwnerVerificationLang(input.lang);
  const token = createOwnerEmailVerificationToken({
    userId: input.userId,
    email: input.email,
    lang,
    secret,
  });
  const verificationUrl =
    `${siteOrigin}/${lang}/owner-verify-email?token=${encodeURIComponent(token)}`;
  const message = ownerEmailVerificationMessage({ lang, verificationUrl });

  const mockFile = String(env.OWNER_VERIFICATION_EMAIL_MOCK_FILE || "").trim();
  if (env.NODE_ENV === "test" && mockFile) {
    await appendFile(
      mockFile,
      `${JSON.stringify({
        to: input.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })}\n`,
      "utf8"
    );
    return { sent: true, code: "verification_email_sent" };
  }

  const emailClient = input.emailClient ?? resend;
  if (!emailClient) return { sent: false, code: "email_unavailable" };

  try {
    const response = await emailClient.emails.send({
      from: ownerVerificationEmailFrom(env),
      to: input.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    const record = response as unknown as { error?: unknown };
    if (record?.error) {
      logOwnerVerificationEmailFailure("provider_response", record.error);
      return { sent: false, code: "verification_email_send_failed" };
    }
    return { sent: true, code: "verification_email_sent" };
  } catch (error) {
    logOwnerVerificationEmailFailure("provider_exception", error);
    return { sent: false, code: "verification_email_send_failed" };
  }
}
