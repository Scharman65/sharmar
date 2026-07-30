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

export async function sendOwnerVerificationEmail(input: {
  userId: number;
  email: string;
  lang: OwnerVerificationLang;
  env?: NodeJS.ProcessEnv;
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

  if (!resend) return { sent: false, code: "email_unavailable" };

  try {
    const response = await resend.emails.send({
      from: BOOKING_FROM,
      to: input.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    const record = response as unknown as { error?: unknown };
    if (record?.error) return { sent: false, code: "verification_email_send_failed" };
    return { sent: true, code: "verification_email_sent" };
  } catch {
    return { sent: false, code: "verification_email_send_failed" };
  }
}
