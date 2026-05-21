export type NotificationChannel = "email" | "whatsapp";

export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type NotificationProvider = "resend" | "whatsapp_cloud" | "internal" | "unknown";

export type NotificationRetryStatus = "not_needed" | "retry_pending" | "retrying" | "retry_exhausted";

export type NotificationQueueStatus = "queued" | "processing" | "delivered" | "failed" | "abandoned";

export type NotificationQueuePriority = "low" | "normal" | "high" | "critical";

export type NotificationReconciliationStatus = "matched" | "pending" | "mismatch" | "unknown";

export type WhatsAppOptInStatus = "unknown" | "opted_in" | "opted_out";

export type WhatsAppSendMode = "disabled" | "dry_run" | "live";

export type WhatsAppNotificationConfig = {
  mode: WhatsAppSendMode;
  provider: NotificationProvider;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  templateNamespace?: string | null;
  defaultLocale?: string | null;
};

export type WhatsAppTemplateName =
  | "booking_request_created"
  | "owner_action_required"
  | "booking_confirmed"
  | "booking_declined";

export type WhatsAppTemplatePayload = {
  template: WhatsAppTemplateName;
  locale: string;
  variables: Record<string, string>;
  publicToken: string | null;
  bookingId: number | string | null;
};

export type WhatsAppDryRunResult =
  | {
      ok: true;
      eventId: string;
      normalizedPhone: string;
      template: WhatsAppTemplatePayload;
      simulatedProvider: "whatsapp_cloud";
      created_at: string;
      auditEntry: NotificationAuditEntry;
      reason: null;
    }
  | {
      ok: false;
      eventId: string;
      normalizedPhone: string | null;
      template: WhatsAppTemplatePayload;
      simulatedProvider: "whatsapp_cloud";
      created_at: string;
      auditEntry: NotificationAuditEntry;
      reason: string;
    };

export type NotificationRecipient = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type BookingNotificationBase = {
  publicToken?: string | null;
  bookingId?: number | string | null;
  boatId?: number | string | null;
  boatSlug?: string | null;
  boatTitle?: string | null;
  slotStartUtc?: string | null;
  slotEndUtc?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  ownerWhatsApp?: string | null;
  ownerUrl?: string | null;
};

export type BookingRequestCreatedPayload = BookingNotificationBase & {
  customer: NotificationRecipient;
};

export type OwnerActionRequiredPayload = BookingNotificationBase & {
  owner: NotificationRecipient;
};

export type BookingConfirmedPayload = BookingNotificationBase & {
  confirmedAt?: string | null;
};

export type BookingDeclinedPayload = BookingNotificationBase & {
  declinedAt?: string | null;
  reason?: string | null;
};

export type NotificationEvent =
  | {
      type: "booking_request_created";
      channels: NotificationChannel[];
      payload: BookingRequestCreatedPayload;
    }
  | {
      type: "owner_action_required";
      channels: NotificationChannel[];
      payload: OwnerActionRequiredPayload;
    }
  | {
      type: "booking_confirmed";
      channels: NotificationChannel[];
      payload: BookingConfirmedPayload;
    }
  | {
      type: "booking_declined";
      channels: NotificationChannel[];
      payload: BookingDeclinedPayload;
    };

export type NotificationEventRecord = NotificationEvent & {
  id: string;
  created_at: string;
  publicToken?: string | null;
  bookingId?: number | string | null;
};

export type NotificationAuditEntry = {
  id: string;
  event_id: string;
  event_type: NotificationEvent["type"];
  channel: NotificationChannel;
  provider: NotificationProvider;
  created_at: string;
  delivered_at: string | null;
  status: NotificationDeliveryStatus;
  error: string | null;
  publicToken: string | null;
  bookingId: number | string | null;
};

export type NotificationDeliveryAttempt = {
  attempt: number;
  started_at: string;
  finished_at: string | null;
  status: NotificationDeliveryStatus;
  provider: NotificationProvider;
  error: string | null;
  duration_ms: number | null;
};

export type NotificationIdempotencyKey = {
  eventType: NotificationEvent["type"];
  publicToken: string | null;
  provider: NotificationProvider;
  channel: NotificationChannel;
};

export type NotificationReliabilityRecord = {
  idempotencyKey: string;
  retryStatus: NotificationRetryStatus;
  maxAttempts: number;
  currentAttempt: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  attempts: NotificationDeliveryAttempt[];
};

export type NotificationQueueRecord = {
  queueId: string;
  eventId: string;
  idempotencyKey: string;
  provider: NotificationProvider;
  channel: NotificationChannel;
  priority: NotificationQueuePriority;
  queueStatus: NotificationQueueStatus;
  createdAt: string;
  processingStartedAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  abandonedAt: string | null;
  reliability: NotificationReliabilityRecord;
  audit: NotificationAuditEntry;
  metadata: Record<string, unknown>;
};

export type NotificationOperationalMetric = {
  sentCount: number;
  failedCount: number;
  retryCount: number;
  queueDepth: number;
  averageAttempts: number;
  reconciliationStatus: NotificationReconciliationStatus;
};

function randomIdPart(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 12);
}

export function createNotificationEventId(): string {
  return `notif_${Date.now()}_${randomIdPart()}`;
}

export function createNotificationQueueId(): string {
  return `notif_queue_${Date.now()}_${randomIdPart()}`;
}

export function createNotificationIdempotencyKey(args: NotificationIdempotencyKey): string {
  return [
    args.eventType,
    args.publicToken?.trim() || "no_public_token",
    args.provider,
    args.channel,
  ].join(":");
}

export function createNotificationAttempt(args: {
  attempt: number;
  status: NotificationDeliveryStatus;
  provider: NotificationProvider;
  started_at?: string;
  finished_at?: string | null;
  error?: string | null;
}): NotificationDeliveryAttempt {
  const startedAt = args.started_at ?? new Date().toISOString();
  const finishedAt = args.finished_at ?? null;
  const startedMs = Date.parse(startedAt);
  const finishedMs = finishedAt ? Date.parse(finishedAt) : NaN;
  const durationMs =
    Number.isFinite(startedMs) && Number.isFinite(finishedMs)
      ? Math.max(0, finishedMs - startedMs)
      : null;

  return {
    attempt: Math.max(1, Math.floor(args.attempt)),
    started_at: startedAt,
    finished_at: finishedAt,
    status: args.status,
    provider: args.provider,
    error: args.error ?? null,
    duration_ms: durationMs,
  };
}

export function calculateNextRetryDelay(args: {
  attempt: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}): number {
  const attempt = Math.max(1, Math.floor(args.attempt));
  const baseDelayMs = Math.max(1000, Math.floor(args.baseDelayMs ?? 60_000));
  const maxDelayMs = Math.max(baseDelayMs, Math.floor(args.maxDelayMs ?? 60 * 60_000));
  const delay = baseDelayMs * 2 ** Math.max(0, attempt - 1);

  return Math.min(delay, maxDelayMs);
}

export function shouldRetryNotification(args: {
  status: NotificationDeliveryStatus;
  currentAttempt?: number;
  maxAttempts?: number;
  error?: string | null;
}): boolean {
  if (args.status !== "failed") return false;

  const error = String(args.error || "").toLowerCase();
  if (
    error.includes("invalid_phone") ||
    error.includes("phone_invalid") ||
    error.includes("invalid phone") ||
    error.includes("opted_out") ||
    error.includes("not_opted_in")
  ) {
    return false;
  }

  const maxAttempts = Math.max(1, Math.floor(args.maxAttempts ?? 3));
  const currentAttempt = Math.max(0, Math.floor(args.currentAttempt ?? 0));

  return currentAttempt < maxAttempts;
}

export function createNotificationReliabilityRecord(args: {
  idempotencyKey: string | NotificationIdempotencyKey;
  retryStatus?: NotificationRetryStatus;
  maxAttempts?: number;
  currentAttempt?: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  attempts?: NotificationDeliveryAttempt[];
}): NotificationReliabilityRecord {
  const attempts = args.attempts ?? [];
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;
  const currentAttempt = args.currentAttempt ?? attempts.length;
  const maxAttempts = Math.max(1, Math.floor(args.maxAttempts ?? 3));

  return {
    idempotencyKey:
      typeof args.idempotencyKey === "string"
        ? args.idempotencyKey
        : createNotificationIdempotencyKey(args.idempotencyKey),
    retryStatus: args.retryStatus ?? "not_needed",
    maxAttempts,
    currentAttempt,
    lastAttemptAt: args.lastAttemptAt ?? lastAttempt?.finished_at ?? lastAttempt?.started_at ?? null,
    nextRetryAt: args.nextRetryAt ?? null,
    attempts,
  };
}

export function createNotificationQueueRecord(args: {
  event: NotificationEvent | NotificationEventRecord;
  provider: NotificationProvider;
  channel: NotificationChannel;
  priority?: NotificationQueuePriority;
  queueStatus?: NotificationQueueStatus;
  idempotencyKey?: string;
  reliability?: NotificationReliabilityRecord;
  audit?: NotificationAuditEntry;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}): NotificationQueueRecord {
  const eventId = "id" in args.event ? args.event.id : createNotificationEventId();
  const idempotencyKey =
    args.idempotencyKey ??
    createNotificationIdempotencyKey({
      eventType: args.event.type,
      publicToken: args.event.payload.publicToken ?? null,
      provider: args.provider,
      channel: args.channel,
    });

  return {
    queueId: createNotificationQueueId(),
    eventId,
    idempotencyKey,
    provider: args.provider,
    channel: args.channel,
    priority: args.priority ?? "normal",
    queueStatus: args.queueStatus ?? "queued",
    createdAt: args.createdAt ?? new Date().toISOString(),
    processingStartedAt: null,
    deliveredAt: null,
    failedAt: null,
    abandonedAt: null,
    reliability:
      args.reliability ??
      createNotificationReliabilityRecord({
        idempotencyKey,
      }),
    audit:
      args.audit ??
      createNotificationAuditEntry({
        event: args.event,
        channel: args.channel,
        provider: args.provider,
        status: "pending",
      }),
    metadata: args.metadata ?? {},
  };
}

export function markNotificationQueueProcessing(
  record: NotificationQueueRecord,
  processingStartedAt: string = new Date().toISOString()
): NotificationQueueRecord {
  return {
    ...record,
    queueStatus: "processing",
    processingStartedAt,
  };
}

export function markNotificationQueueDelivered(
  record: NotificationQueueRecord,
  deliveredAt: string = new Date().toISOString()
): NotificationQueueRecord {
  return {
    ...record,
    queueStatus: "delivered",
    deliveredAt,
    audit: {
      ...record.audit,
      status: "sent",
      delivered_at: deliveredAt,
      error: null,
    },
  };
}

export function markNotificationQueueFailed(args: {
  record: NotificationQueueRecord;
  failedAt?: string;
  error?: string | null;
}): NotificationQueueRecord {
  const failedAt = args.failedAt ?? new Date().toISOString();

  return {
    ...args.record,
    queueStatus: "failed",
    failedAt,
    audit: {
      ...args.record.audit,
      status: "failed",
      error: args.error ?? args.record.audit.error,
    },
  };
}

export function markNotificationQueueAbandoned(args: {
  record: NotificationQueueRecord;
  abandonedAt?: string;
  error?: string | null;
}): NotificationQueueRecord {
  const abandonedAt = args.abandonedAt ?? new Date().toISOString();

  return {
    ...args.record,
    queueStatus: "abandoned",
    abandonedAt,
    audit: {
      ...args.record.audit,
      status: "skipped",
      error: args.error ?? args.record.audit.error,
    },
  };
}

export function createEmptyNotificationOperationalMetric(): NotificationOperationalMetric {
  return {
    sentCount: 0,
    failedCount: 0,
    retryCount: 0,
    queueDepth: 0,
    averageAttempts: 0,
    reconciliationStatus: "unknown",
  };
}

export function createNotificationOperationalMetric(
  metric: Partial<NotificationOperationalMetric> = {}
): NotificationOperationalMetric {
  return {
    sentCount: Math.max(0, Math.floor(metric.sentCount ?? 0)),
    failedCount: Math.max(0, Math.floor(metric.failedCount ?? 0)),
    retryCount: Math.max(0, Math.floor(metric.retryCount ?? 0)),
    queueDepth: Math.max(0, Math.floor(metric.queueDepth ?? 0)),
    averageAttempts: Math.max(0, metric.averageAttempts ?? 0),
    reconciliationStatus: metric.reconciliationStatus ?? "unknown",
  };
}

export function createNotificationAuditEntry(args: {
  event: NotificationEvent | NotificationEventRecord;
  channel: NotificationChannel;
  provider?: NotificationProvider;
  status?: NotificationDeliveryStatus;
  error?: string | null;
  delivered_at?: string | null;
  created_at?: string;
}): NotificationAuditEntry {
  const now = new Date().toISOString();
  const eventId = "id" in args.event ? args.event.id : createNotificationEventId();

  return {
    id: createNotificationEventId(),
    event_id: eventId,
    event_type: args.event.type,
    channel: args.channel,
    provider: args.provider ?? "unknown",
    created_at: args.created_at ?? now,
    delivered_at: args.delivered_at ?? null,
    status: args.status ?? "pending",
    error: args.error ?? null,
    publicToken: args.event.payload.publicToken ?? null,
    bookingId: args.event.payload.bookingId ?? null,
  };
}

export function normalizeWhatsAppPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[\s\-()]/g, "");
  if (!/^\+?\d+$/.test(normalized)) return null;

  const digits = normalized.replace(/^\+/, "");
  if (digits.length < 8 || digits.length > 15) return null;

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export function canSendWhatsAppNotification(args: {
  config: WhatsAppNotificationConfig;
  optInStatus: WhatsAppOptInStatus;
  phone: unknown;
}): { ok: true; phone: string } | { ok: false; reason: string } {
  if (args.config.mode !== "live" && args.config.mode !== "dry_run") {
    return { ok: false, reason: "whatsapp_send_mode_disabled" };
  }

  if (args.config.provider !== "whatsapp_cloud") {
    return { ok: false, reason: "whatsapp_provider_not_configured" };
  }

  if (args.optInStatus !== "opted_in") {
    return { ok: false, reason: "whatsapp_recipient_not_opted_in" };
  }

  const phone = normalizeWhatsAppPhone(args.phone);
  if (!phone) {
    return { ok: false, reason: "whatsapp_phone_invalid" };
  }

  return { ok: true, phone };
}

export function createWhatsAppAuditEntry(args: {
  event: NotificationEvent | NotificationEventRecord;
  status?: NotificationDeliveryStatus;
  error?: string | null;
  delivered_at?: string | null;
  created_at?: string;
}): NotificationAuditEntry {
  return createNotificationAuditEntry({
    event: args.event,
    channel: "whatsapp",
    provider: "whatsapp_cloud",
    status: args.status ?? "pending",
    error: args.error ?? null,
    delivered_at: args.delivered_at ?? null,
    created_at: args.created_at,
  });
}

export function createWhatsAppProviderConfig(
  config: Partial<WhatsAppNotificationConfig> = {}
): WhatsAppNotificationConfig {
  return {
    mode: config.mode ?? "disabled",
    provider: "whatsapp_cloud",
    phoneNumberId: config.phoneNumberId ?? null,
    businessAccountId: config.businessAccountId ?? null,
    templateNamespace: config.templateNamespace ?? null,
    defaultLocale: config.defaultLocale ?? "en",
  };
}

export function createWhatsAppTemplatePayload(args: {
  template: WhatsAppTemplateName;
  locale?: string | null;
  variables?: Record<string, string | number | null | undefined>;
  publicToken?: string | null;
  bookingId?: number | string | null;
}): WhatsAppTemplatePayload {
  const variables = Object.fromEntries(
    Object.entries(args.variables ?? {}).map(([key, value]) => [key, value == null ? "" : String(value)])
  );

  return {
    template: args.template,
    locale: args.locale?.trim() || "en",
    variables,
    publicToken: args.publicToken ?? null,
    bookingId: args.bookingId ?? null,
  };
}

export function simulateWhatsAppSend(args: {
  event: NotificationEvent | NotificationEventRecord;
  config: WhatsAppNotificationConfig;
  optInStatus: WhatsAppOptInStatus;
  phone: unknown;
  template: WhatsAppTemplatePayload;
}): WhatsAppDryRunResult {
  const createdAt = new Date().toISOString();
  const eventId = "id" in args.event ? args.event.id : createNotificationEventId();
  const eventRecord: NotificationEventRecord =
    "id" in args.event
      ? args.event
      : {
          ...args.event,
          id: eventId,
          created_at: createdAt,
          publicToken: args.event.payload.publicToken ?? null,
          bookingId: args.event.payload.bookingId ?? null,
        };

  const eligibility = canSendWhatsAppNotification({
    config: args.config,
    optInStatus: args.optInStatus,
    phone: args.phone,
  });

  if (!eligibility.ok) {
    return {
      ok: false,
      eventId,
      normalizedPhone: normalizeWhatsAppPhone(args.phone),
      template: args.template,
      simulatedProvider: "whatsapp_cloud",
      created_at: createdAt,
      auditEntry: createWhatsAppAuditEntry({
        event: eventRecord,
        status: args.config.mode === "disabled" ? "skipped" : "failed",
        error: eligibility.reason,
        created_at: createdAt,
      }),
      reason: eligibility.reason,
    };
  }

  return {
    ok: true,
    eventId,
    normalizedPhone: eligibility.phone,
    template: args.template,
    simulatedProvider: "whatsapp_cloud",
    created_at: createdAt,
    auditEntry: createWhatsAppAuditEntry({
      event: eventRecord,
      status: "pending",
      created_at: createdAt,
    }),
    reason: null,
  };
}

export function bookingRequestCreated(
  payload: BookingRequestCreatedPayload,
  channels: NotificationChannel[] = ["email"]
): NotificationEvent {
  return { type: "booking_request_created", channels, payload };
}

export function ownerActionRequired(
  payload: OwnerActionRequiredPayload,
  channels: NotificationChannel[] = ["email"]
): NotificationEvent {
  return { type: "owner_action_required", channels, payload };
}

export function bookingConfirmed(
  payload: BookingConfirmedPayload,
  channels: NotificationChannel[] = ["email"]
): NotificationEvent {
  return { type: "booking_confirmed", channels, payload };
}

export function bookingDeclined(
  payload: BookingDeclinedPayload,
  channels: NotificationChannel[] = ["email"]
): NotificationEvent {
  return { type: "booking_declined", channels, payload };
}
