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
  const map: Record<PipelineStage, string> = {
    lead: "Lead",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    won: "Won",
    lost: "Lost",
  };
  return map[stage];
}

export function orderStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    in_fulfillment: "In fulfillment",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[status];
}

export function trackingLabel(status: TrackingStatus): string {
  const map: Record<TrackingStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    arrived: "Arrived",
    completed: "Completed",
    failed: "Failed",
  };
  return map[status];
}

export function documentKindLabel(kind: DocumentKind): string {
  const map: Record<DocumentKind, string> = {
    quote: "Quote",
    contract: "Contract",
    invoice: "Invoice",
    lieferschein: "Lieferschein",
    purchase_order: "Purchase Order",
    receipt: "Receipt",
  };
  return map[kind];
}

export function integrationLabel(status: IntegrationStatus): string {
  const map: Record<IntegrationStatus, string> = {
    planned: "Planned",
    ready: "Ready",
    connected: "Connected",
    disabled: "Disabled",
  };
  return map[status];
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
