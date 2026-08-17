import type { IntegrationStatus, RunStatus, TemplateDifficulty } from "./types";
import {
  formatDateTime as formatI18nDateTime,
  getActiveFormatLocale,
} from "@/app/lib/i18n/format";

export type StatusTone = "default" | "positive" | "warning" | "critical" | "accent";

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(iso: string): string {
  return formatI18nDateTime(iso, getActiveFormatLocale(), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function integrationLabel(status: IntegrationStatus): string {
  switch (status) {
    case "connected":
      return "automation.status.connected";
    case "beta":
      return "automation.status.beta";
    case "coming_soon":
      return "automation.status.comingSoon";
    case "disabled":
      return "automation.status.disabled";
    default:
      return "automation.status.planned";
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
      return "automation.status.success";
    case "failed":
      return "automation.status.failed";
    case "running":
      return "automation.status.running";
    case "pending":
      return "automation.status.pending";
    case "retried":
      return "automation.status.retried";
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
      return "automation.difficulty.starter";
    case "intermediate":
      return "automation.difficulty.intermediate";
    case "advanced":
      return "automation.difficulty.advanced";
  }
}
