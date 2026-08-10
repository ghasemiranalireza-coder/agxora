/**
 * Documents display formatters — delegate date/time to shared i18n Intl helpers.
 */

import {
  formatDate as formatSharedDate,
  formatDateTime as formatSharedDateTime,
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
  switch (type) {
    case "pdf":
      return "PDF";
    case "word":
      return "Word";
    case "excel":
      return "Excel";
    case "powerpoint":
      return "PowerPoint";
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "markdown":
      return "Markdown";
    case "text":
      return "Text";
    case "json":
      return "JSON";
    case "csv":
      return "CSV";
    default:
      return "Other";
  }
}

export function statusLabel(status: DocumentStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "in_review":
      return "In Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
  }
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
  switch (scope) {
    case "private":
      return "Private";
    case "organization":
      return "Organization";
    case "department":
      return "Department";
    case "specific_users":
      return "Specific Users";
    case "public_link":
      return "Public Link";
  }
}

export function moduleLabel(key: LinkedModuleKey): string {
  switch (key) {
    case "crm":
      return "CRM";
    case "finance":
      return "Finance";
    case "automation":
      return "Automation";
    case "creator":
      return "Creator Studio";
    case "hr":
      return "Future HR";
    case "projects":
      return "Future Projects";
  }
}

export function knowledgeKindLabel(kind: KnowledgeKind): string {
  switch (kind) {
    case "article":
      return "Article";
    case "policy":
      return "Policy";
    case "process":
      return "Process";
    case "manual":
      return "Manual";
    case "faq":
      return "FAQ";
    case "wiki":
      return "Internal Wiki";
  }
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
