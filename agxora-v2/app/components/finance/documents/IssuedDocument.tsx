"use client";

import { useEffect, useState, type JSX } from "react";
import type { DeliveryNoteView, InvoiceView } from "../../../lib/finance/core/types";
import {
  emptyBranding,
  type FinanceDocumentSettingsView,
  type FinanceDocumentSnapshot,
  type FinanceDocumentTemplate,
} from "../../../lib/finance/documents/types";
import { DocumentRenderer } from "./DocumentRenderer";
import type { FinanceDocumentModel } from "./sampleData";

function modelFromInvoice(
  invoice: InvoiceView,
  snapshot: FinanceDocumentSnapshot | null,
  live: FinanceDocumentSettingsView | null,
): { readonly model: FinanceDocumentModel; readonly template: FinanceDocumentTemplate } {
  const branding = snapshot?.branding ?? live?.branding ?? emptyBranding(invoice.customerCompanyName);
  const customer = snapshot?.customer ?? {
    companyName: invoice.customerCompanyName,
    address: "",
    city: "",
    country: "",
    taxNumber: "",
  };
  return {
    template: snapshot?.template ?? live?.invoiceTemplate ?? "CLASSIC",
    model: {
      kind: "INVOICE",
      number: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      currency: invoice.currency,
      netTotal: invoice.netTotal,
      taxTotal: invoice.taxTotal,
      grossTotal: invoice.grossTotal,
      branding,
      customer,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        taxRate: item.taxRate,
        lineTotalNet: item.lineTotalNet,
      })),
    },
  };
}

function modelFromDeliveryNote(
  note: DeliveryNoteView,
  snapshot: FinanceDocumentSnapshot | null,
  live: FinanceDocumentSettingsView | null,
  preferLive: boolean,
): { readonly model: FinanceDocumentModel; readonly template: FinanceDocumentTemplate } {
  const branding = preferLive
    ? (live?.branding ?? snapshot?.branding ?? emptyBranding(note.customerCompanyName))
    : (snapshot?.branding ?? live?.branding ?? emptyBranding(note.customerCompanyName));
  const customer = snapshot?.customer ?? {
    companyName: note.customerCompanyName,
    address: "",
    city: "",
    country: "",
    taxNumber: "",
  };
  const template = preferLive
    ? (live?.deliveryNoteTemplate ?? snapshot?.template ?? "CLASSIC")
    : (snapshot?.template ?? live?.deliveryNoteTemplate ?? "CLASSIC");
  return {
    template,
    model: {
      kind: "DELIVERY_NOTE",
      number: note.number,
      date: note.date,
      orderNumber: note.orderNumber,
      notes: note.notes,
      currency: note.currency,
      netTotal: note.netTotal,
      taxTotal: note.taxTotal,
      grossTotal: note.grossTotal,
      branding,
      customer,
      items: note.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        taxRate: item.taxRate,
        lineTotalNet: item.lineTotalNet,
      })),
    },
  };
}

export function IssuedInvoiceDocument({ invoice }: { readonly invoice: InvoiceView }): JSX.Element {
  return (
    <IssuedDocument
      freeze
      snapshot={invoice.documentSnapshot}
      factory={(live) => modelFromInvoice(invoice, invoice.documentSnapshot, live)}
    />
  );
}

export function IssuedDeliveryNoteDocument({ note }: { readonly note: DeliveryNoteView }): JSX.Element {
  const freeze = note.status === "ABGERECHNET" || note.status === "CANCELLED";
  return (
    <IssuedDocument
      freeze={freeze}
      snapshot={note.documentSnapshot}
      factory={(live) => modelFromDeliveryNote(note, note.documentSnapshot, live, !freeze)}
    />
  );
}

function IssuedDocument({
  freeze,
  snapshot,
  factory,
}: {
  readonly freeze: boolean;
  readonly snapshot: FinanceDocumentSnapshot | null;
  readonly factory: (live: FinanceDocumentSettingsView | null) => {
    readonly model: FinanceDocumentModel;
    readonly template: FinanceDocumentTemplate;
  };
}): JSX.Element {
  const [live, setLive] = useState<FinanceDocumentSettingsView | null>(null);

  useEffect(() => {
    if (freeze && snapshot) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/v1/finance/document-settings", { credentials: "include" });
        const body = (await response.json()) as { settings?: FinanceDocumentSettingsView };
        if (!cancelled && body.settings) setLive(body.settings);
      } catch {
        /* live defaults stay empty branding */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [freeze, snapshot]);

  const resolved = factory(live);
  return <DocumentRenderer model={resolved.model} template={resolved.template} />;
}
