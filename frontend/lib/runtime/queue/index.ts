import type { NotificationQueueRecord } from "@/lib/notifications";

export type QueueRuntimeProvider = "disabled" | "bullmq" | "postgres" | "managed" | "unknown";

export type QueueRuntimeMode = "disabled" | "dry_run" | "live";

export type QueueRuntimeConfig = {
  enabled: boolean;
  provider: QueueRuntimeProvider;
  mode: QueueRuntimeMode;
  monitoringEnabled: boolean;
};

export type QueueRuntimeResult = {
  ok: boolean;
  queueId: string | null;
  status: "disabled" | "queued" | "delivered" | "failed" | "unknown";
  reason: string | null;
};

export interface QueueRuntimeAdapter {
  enqueue(record: NotificationQueueRecord): Promise<QueueRuntimeResult>;
  getStatus(queueId: string): Promise<QueueRuntimeResult>;
  markDelivered(queueId: string): Promise<QueueRuntimeResult>;
  markFailed(queueId: string, error?: string | null): Promise<QueueRuntimeResult>;
}

function disabledResult(queueId: string | null = null): QueueRuntimeResult {
  return {
    ok: false,
    queueId,
    status: "disabled",
    reason: "queue_runtime_disabled",
  };
}

export function createQueueRuntimeConfig(
  config: Partial<QueueRuntimeConfig> = {}
): QueueRuntimeConfig {
  const enabled = config.enabled === true;

  return {
    enabled,
    provider: enabled ? config.provider ?? "unknown" : "disabled",
    mode: enabled ? config.mode ?? "dry_run" : "disabled",
    monitoringEnabled: enabled ? config.monitoringEnabled === true : false,
  };
}

export function createDisabledQueueRuntime(): QueueRuntimeAdapter {
  return {
    async enqueue(record) {
      return disabledResult(record.queueId);
    },
    async getStatus(queueId) {
      return disabledResult(queueId);
    },
    async markDelivered(queueId) {
      return disabledResult(queueId);
    },
    async markFailed(queueId) {
      return disabledResult(queueId);
    },
  };
}
