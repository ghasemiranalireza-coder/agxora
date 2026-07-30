import type { IntegrationStatus, RunStatus, TemplateDifficulty } from "./types";

export type StatusTone = "default" | "positive" | "warning" | "critical" | "accent";

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function integrationLabel(status: IntegrationStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "beta":
      return "Beta";
    case "coming_soon":
      return "Coming Soon";
    case "disabled":
      return "Disabled";
    default:
      return "Planned";
  }
}

export function integrationTone(status: IntegrationStatus): StatusTone {
  switch (status) {
    case "connected":
      return "positive";
    case "beta":
      return "accent";
    case "coming_soon":
      return "warning";
    case "disabled":
      return "default";
    default:
      return "warning";
  }
}

export function runStatusLabel(status: RunStatus): string {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "pending":
      return "Pending";
    case "retried":
      return "Retry";
    default:
      return status;
  }
}

export function runStatusTone(status: RunStatus): StatusTone {
  switch (status) {
    case "success":
      return "positive";
    case "failed":
      return "critical";
    case "pending":
      return "warning";
    case "retried":
    case "running":
      return "accent";
    default:
      return "default";
  }
}

export function difficultyLabel(value: TemplateDifficulty): string {
  switch (value) {
    case "starter":
      return "Starter";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
  }
}
