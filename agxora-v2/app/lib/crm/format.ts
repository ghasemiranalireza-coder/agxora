import type {
  DocumentKind,
  OrderStatus,
  PipelineStage,
  TrackingStatus,
  IntegrationStatus,
} from "./types";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number, currency = "EUR"): string {
  if (currency === "EUR") return EUR.format(amount);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
