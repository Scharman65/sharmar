export type ResendSendResult = {
  data?: { id?: unknown } | null;
  error?: unknown;
};

export function resendSendSucceeded(result: ResendSendResult): boolean {
  return (
    !result.error &&
    typeof result.data?.id === "string" &&
    result.data.id.trim().length > 0
  );
}

export function resendProviderErrorCode(value: unknown): string {
  if (!value || typeof value !== "object") return "unknown";

  const record = value as Record<string, unknown>;

  for (const key of ["name", "code", "statusCode", "status"]) {
    const raw = record[key];

    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().slice(0, 80);
    }

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw);
    }
  }

  return "unknown";
}
