export type MonitoringProvider = "disabled" | "sentry" | "logs" | "unknown";

export type MonitoringRuntimeConfig = {
  enabled: boolean;
  provider: MonitoringProvider;
  environment: string | null;
  release: string | null;
};

export function createDisabledMonitoringRuntime(): MonitoringRuntimeConfig {
  return {
    enabled: false,
    provider: "disabled",
    environment: null,
    release: null,
  };
}
