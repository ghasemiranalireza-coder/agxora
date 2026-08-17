import type { ContentFormat, MediaKind, PublishStatus, IntegrationStatus } from "./types";
import {
  formatDate as formatI18nDate,
  formatDateTime as formatI18nDateTime,
  getActiveFormatLocale,
} from "@/app/lib/i18n/format";

export function formatLabel(format: ContentFormat): string {
  return `creator.formats.${format}`;
}

export function publishStatusLabel(status: PublishStatus): string {
  return `creator.publishStatus.${status}`;
}

export function mediaKindLabel(kind: MediaKind): string {
  return `creator.mediaKind.${kind}`;
}

export function integrationLabel(status: IntegrationStatus): string {
  return `creator.integrationStatus.${status}`;
}

export function formatDate(iso: string): string {
  return formatI18nDate(iso, getActiveFormatLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return formatI18nDateTime(iso, getActiveFormatLocale(), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
