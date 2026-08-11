/**
 * CRM display formatters — delegate to shared i18n Intl helpers.
 * Locale follows the active UI locale; currency stays an explicit ISO code.
 */

import {
  formatCurrency,
  formatDate as formatSharedDate,
  formatDateTime as formatSharedDateTime,
  resolveDisplayCurrency,
} from "../i18n/format";
import type {
  DocumentKind,
  OrderStatus,
  PipelineStage,
  TrackingStatus,
  IntegrationStatus,
} from "./types";

export function formatMoney(amount: number, currency?: string): string {
  return formatCurrency(amount, undefined, resolveDisplayCurrency(currency));
}

export function formatDate(iso: string): string {
  return formatSharedDate(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export function pipelineLabel(stage: PipelineStage): string {
  return `crm.pipeline.${stage}`;
}

export function orderStatusLabel(status: OrderStatus): string {
  return `crm.orderStatus.${status}`;
}

export function trackingLabel(status: TrackingStatus): string {
  return `crm.tracking.${status}`;
}

export function documentKindLabel(kind: DocumentKind): string {
  return `crm.documentKind.${kind}`;
}

export function documentStatusLabel(status: string): string {
  return `crm.documentStatus.${status}`;
}

export function integrationLabel(status: IntegrationStatus): string {
  return `crm.integration.${status}`;
}

export function orderTotal(lines: readonly {
  readonly qty: number;
  readonly unitPrice: number;
  readonly discountPct: number;
  readonly taxPct: number;
}[]): { readonly net: number; readonly tax: number; readonly gross: number } {
  let net = 0;
  let tax = 0;
  for (const line of lines) {
    const lineNet = line.qty * line.unitPrice * (1 - line.discountPct / 100);
    net += lineNet;
    tax += lineNet * (line.taxPct / 100);
  }
  return { net, tax, gross: net + tax };
}
