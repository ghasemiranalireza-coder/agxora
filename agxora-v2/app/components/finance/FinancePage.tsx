"use client";

import { useCallback, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AI_INSIGHTS,
  BANK_ACCOUNTS,
  BANK_TRANSACTIONS,
  DATEV_EXPORTS,
  FINANCE_INVOICES,
  FINANCE_OVERVIEW,
  SMART_SEARCH_EXAMPLES,
  TAX_DEADLINES,
  UPLOAD_JOBS,
  VAT_SUMMARIES,
} from "../../lib/finance";
import { AiInsights } from "./AiInsights";
import { AiInvoiceProcessing } from "./AiInvoiceProcessing";
import { BankingPanel } from "./BankingPanel";
import { DatevIntegration } from "./DatevIntegration";
import { FinanceOverview } from "./FinanceOverview";
import { FinanceSection } from "./FinancePrimitives";
import { InvoiceCenter } from "./InvoiceCenter";
import { SmartSearch } from "./SmartSearch";
import { TaxCenter } from "./TaxCenter";

export function FinancePage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [invoiceSeed, setInvoiceSeed] = useState(0);

  const onSmartQuery = useCallback((query: string) => {
    const q = query.toLowerCase();
    if (q.includes("unpaid") || q.includes("amazon") || q.includes("july")) {
      setInvoiceSeed((n) => n + 1);
      document.getElementById("invoice-center")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (q.includes("vat") || q.includes("export")) {
      document.getElementById("datev-integration")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="agx-ui-module-page agx-page-enter">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="agx-ui-section-title">AGXORA Finance OS</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          Finance & Tax
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Accounting, banking, tax, and financial intelligence — previewed with
          sample data until live ledgers connect.
        </p>
        <div
          role="status"
          className="mt-3 max-w-2xl rounded-xl border px-3 py-2 text-xs leading-relaxed"
          style={{
            borderColor:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
            background:
              "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
            color: "var(--agx-text, #f8fafc)",
          }}
        >
          Sample dataset — figures and export history are illustrative. DATEV /
          file export and live bank feeds are not connected.
        </div>
      </motion.header>

      <FinanceSection id="finance-overview" title="Finance Overview" delay={0.05}>
        <FinanceOverview metrics={FINANCE_OVERVIEW} />
      </FinanceSection>

      <FinanceSection
        id="invoice-center"
        title="Invoice Center"
        subtitle="Search, filter, and sort the enterprise invoice ledger with AI confidence scoring."
        delay={0.08}
      >
        <InvoiceCenter key={invoiceSeed} invoices={FINANCE_INVOICES} />
      </FinanceSection>

      <FinanceSection
        id="ai-invoice-processing"
        title="AI Invoice Processing"
        subtitle="OCR, extraction, categorization, and duplicate detection for inbound documents."
        delay={0.1}
      >
        <AiInvoiceProcessing jobs={UPLOAD_JOBS} />
      </FinanceSection>

      <FinanceSection
        id="banking"
        title="Banking"
        subtitle="Connected accounts, auto matching, payment reconciliation, and bank feed adapters."
        delay={0.12}
      >
        <BankingPanel accounts={BANK_ACCOUNTS} transactions={BANK_TRANSACTIONS} />
      </FinanceSection>

      <FinanceSection
        id="datev-integration"
        title="DATEV Integration"
        subtitle="Export packages for Steuerberater — DATEV, CSV, PDF, and XML."
        delay={0.14}
      >
        <DatevIntegration history={DATEV_EXPORTS} />
      </FinanceSection>

      <FinanceSection
        id="tax-center"
        title="Tax Center"
        subtitle="VAT summaries, deadlines, and upcoming payments."
        delay={0.16}
      >
        <TaxCenter vatSummaries={VAT_SUMMARIES} deadlines={TAX_DEADLINES} />
      </FinanceSection>

      <FinanceSection
        id="ai-insights"
        title="AI Insights"
        subtitle="AI detects unusual expenses, duplicates, missing invoices, late payments, cashflow, and tax opportunities."
        delay={0.18}
      >
        <AiInsights insights={AI_INSIGHTS} />
      </FinanceSection>

      <FinanceSection
        id="smart-search"
        title="Smart Search"
        subtitle="Natural language queries across invoices, expenses, VAT, and exports."
        delay={0.2}
      >
        <SmartSearch examples={SMART_SEARCH_EXAMPLES} onQuery={onSmartQuery} />
      </FinanceSection>
    </div>
  );
}
