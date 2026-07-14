import assert from "node:assert/strict";
import test from "node:test";

import {
  getSmsProvider,
  getWhatsAppProvider,
  maskContact,
  maskProviderMessageId,
  normalizeE164,
  notifyOwnerOfBookingRequest,
  ownerNotificationDeduplicationKey,
  renderShortOwnerMessage,
} from "./ownerNotifications.ts";

const baseRequest = {
  requestId: 123,
  publicToken: "token-123",
  locale: "en",
  boatTitle: "Bali 4.2",
  boatSlug: "bali-4-2",
  ownerUrl: "https://sharmar.me/en/owner/token-123",
  clientName: "Client",
  clientPhone: "+38220000000",
  clientEmail: "client@example.test",
  start: "2026-08-01T10:00:00.000Z",
  end: "2026-08-01T14:00:00.000Z",
  people: 2,
  skipper: false,
  notes: "SHARMAR-NOTIFY-QA-test",
  ownerContact: {
    owner_email: "owner@example.test",
    owner_phone: "+38267111222",
    owner_whatsapp: "+38267111222",
  },
};

function deps(overrides = {}) {
  const claims = new Set<string>();
  const records: unknown[] = [];
  return {
    records,
    deps: {
      resend: {
        emails: {
          async send() {
            return { id: "email_message_123456789" };
          },
        },
      },
      bookingFrom: "Sharmar <no-reply@sharmar.me>",
      async claimDelivery(input: { deduplicationKey: string }) {
        if (claims.has(input.deduplicationKey)) return { claimed: false };
        claims.add(input.deduplicationKey);
        return { claimed: true };
      },
      async recordDelivery(input: unknown) {
        records.push(input);
      },
      env: {},
      ...overrides,
    },
  };
}

test("provider readiness detects configured and unconfigured channels", () => {
  assert.deepEqual(getWhatsAppProvider({}), {
    provider: "none",
    ready: false,
    skippedReason: "PROVIDER_NOT_CONFIGURED",
  });
  assert.deepEqual(getSmsProvider({}), {
    provider: "none",
    ready: false,
    skippedReason: "PROVIDER_NOT_CONFIGURED",
  });
  assert.equal(getWhatsAppProvider({
    TWILIO_ACCOUNT_SID: "sid",
    TWILIO_AUTH_TOKEN: "token",
    TWILIO_WHATSAPP_FROM: "+10000000000",
  }).ready, true);
  assert.equal(getSmsProvider({
    TWILIO_ACCOUNT_SID: "sid",
    TWILIO_AUTH_TOKEN: "token",
    TWILIO_SMS_FROM: "+10000000000",
  }).ready, true);
});

test("normalization and redaction are deterministic", () => {
  assert.equal(normalizeE164("+382 67 111 222"), "+38267111222");
  assert.equal(normalizeE164("067111222"), null);
  assert.equal(maskContact("owner@example.test"), "o***@example.test");
  assert.equal(maskContact("+38267111222"), "+38***22");
  assert.equal(maskProviderMessageId("SMabcdef123456"), "SMabcd***3456");
});

test("notification deduplication key is stable per request and channel", () => {
  assert.equal(
    ownerNotificationDeduplicationKey(1, "token", "email"),
    ownerNotificationDeduplicationKey(1, "token", "email")
  );
  assert.notEqual(
    ownerNotificationDeduplicationKey(1, "token", "email"),
    ownerNotificationDeduplicationKey(1, "token", "sms")
  );
});

test("unconfigured WhatsApp and SMS are skipped without blocking email", async () => {
  const d = deps();
  const results = await notifyOwnerOfBookingRequest(baseRequest, d.deps);
  assert.equal(results.length, 3);
  assert.equal(results.find((r) => r.channel === "email")?.accepted, true);
  assert.equal(results.find((r) => r.channel === "whatsapp")?.skippedReason, "PROVIDER_NOT_CONFIGURED");
  assert.equal(results.find((r) => r.channel === "sms")?.skippedReason, "PROVIDER_NOT_CONFIGURED");
  assert.equal(d.records.length, 3);
});

test("one channel failure does not cancel the remaining channels", async () => {
  const d = deps({
    resend: {
      emails: {
        async send() {
          throw new Error("resend_down");
        },
      },
    },
  });
  const results = await notifyOwnerOfBookingRequest(baseRequest, d.deps);
  assert.equal(results.find((r) => r.channel === "email")?.accepted, false);
  assert.equal(results.find((r) => r.channel === "whatsapp")?.skippedReason, "PROVIDER_NOT_CONFIGURED");
  assert.equal(results.find((r) => r.channel === "sms")?.skippedReason, "PROVIDER_NOT_CONFIGURED");
});

test("duplicate event does not resend notifications", async () => {
  let sendCount = 0;
  const d = deps({
    resend: {
      emails: {
        async send() {
          sendCount += 1;
          return { id: "email_message_123456789" };
        },
      },
    },
  });

  await notifyOwnerOfBookingRequest(baseRequest, d.deps);
  const second = await notifyOwnerOfBookingRequest(baseRequest, d.deps);

  assert.equal(sendCount, 1);
  assert.equal(second.every((r) => r.skippedReason === "DUPLICATE_NOTIFICATION"), true);
});

test("short owner messages include required request details", () => {
  const text = renderShortOwnerMessage({ ...baseRequest, locale: "me" });
  assert.match(text, /Bali 4\.2/);
  assert.match(text, /People: 2/);
  assert.match(text, /Open: https:\/\/sharmar\.me/);
});
