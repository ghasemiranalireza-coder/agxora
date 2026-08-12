/**
 * Documents display formatters — delegate date/time/number to shared i18n Intl helpers.
 * Label helpers return documents.* i18n keys for t() at render time.
 */

import {
  formatDate as formatSharedDate,
  formatDateTime as formatSharedDateTime,
  formatNumber,
} from "../i18n/format";
import type {
  DocumentFileType,
  DocumentStatus,
  IntegrationStatus,
  KnowledgeKind,
  LinkedModuleKey,
  ShareScope,
} from "./types";

export type StatusTone = "default" | "positive" | "warning" | "critical" | "accent";

/** Raw byte string for callers that pass a translate fn; prefer formatBytesLocalized. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes, undefined, { maximumFractionDigits: 0 })} B`;
  if (bytes < 1024 * 1024) {
    return `${formatNumber(bytes / 1024, undefined, { maximumFractionDigits: 1 })} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024), undefined, { maximumFractionDigits: 1 })} MB`;
  }
  return `${formatNumber(bytes / (1024 * 1024 * 1024), undefined, { maximumFractionDigits: 2 })} GB`;
}

export function formatBytesLocalized(
  bytes: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (bytes < 1024) {
    return t("documents.bytes.b", {
      value: formatNumber(bytes, undefined, { maximumFractionDigits: 0 }),
    });
  }
  if (bytes < 1024 * 1024) {
    return t("documents.bytes.kb", {
      value: formatNumber(bytes / 1024, undefined, { maximumFractionDigits: 1 }),
    });
  }
  if (bytes < 1024 * 1024 * 1024) {
    return t("documents.bytes.mb", {
      value: formatNumber(bytes / (1024 * 1024), undefined, {
        maximumFractionDigits: 1,
      }),
    });
  }
  return t("documents.bytes.gb", {
    value: formatNumber(bytes / (1024 * 1024 * 1024), undefined, {
      maximumFractionDigits: 2,
    }),
  });
}

export function formatDateTime(iso: string): string {
  return formatSharedDateTime(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return formatSharedDate(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fileTypeLabel(type: DocumentFileType): string {
  return `documents.fileType.${type}`;
}

export function statusLabel(status: DocumentStatus): string {
  return `documents.status.${status}`;
}

export function statusTone(status: DocumentStatus): StatusTone {
  switch (status) {
    case "approved":
      return "positive";
    case "in_review":
      return "accent";
    case "rejected":
      return "critical";
    case "archived":
      return "default";
    default:
      return "warning";
  }
}

export function shareLabel(scope: ShareScope): string {
  return `documents.share.${scope}`;
}

export function moduleLabel(key: LinkedModuleKey): string {
  return `documents.module.${key}`;
}

export function knowledgeKindLabel(kind: KnowledgeKind): string {
  return `documents.knowledgeKind.${kind}`;
}

export function integrationLabel(status: IntegrationStatus): string {
  return `documents.integrationStatus.${status}`;
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
