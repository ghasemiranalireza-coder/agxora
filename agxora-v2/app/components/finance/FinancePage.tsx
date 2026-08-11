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
  TAX_DEADLINES,
  UPLOAD_JOBS,
  VAT_SUMMARIES,
} from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
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
  const { t } = useLocale();

  const onSmartQuery = useCallback((query: string, intent?: string) => {
    const q = query.toLowerCase();
    const resolved = intent ?? "";
    if (
      resolved === "unpaid_invoices" ||
      resolved === "amazon" ||
      resolved === "july_expenses" ||
      q.includes("unpaid") ||
      q.includes("amazon") ||
      q.includes("july") ||
      q.includes("offen") ||
      q.includes("پرداخت")
    ) {
      setInvoiceSeed((n) => n + 1);
      document
        .getElementById("invoice-center")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (
      resolved === "vat_export" ||
      q.includes("vat") ||
      q.includes("export") ||
      q.includes("ust") ||
      q.includes("datev") ||
      q.includes("مالیات") ||
      q.includes("خروجی")
    ) {
      document
        .getElementById("datev-integration")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <p className="agx-ui-section-title">{t("finance.page.brand")}</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          {t("finance.page.title")}
        </h1>
        <p
          className="max-w-2xl text-sm sm:text-base"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("finance.page.subtitle")}
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
          {t("finance.page.sampleNotice")}
        </div>
      </motion.header>

      <FinanceSection
        id="finance-overview"
        title={t("finance.sections.overview.title")}
        delay={0.05}
      >
        <FinanceOverview metrics={FINANCE_OVERVIEW} />
      </FinanceSection>

      <FinanceSection
        id="invoice-center"
        title={t("finance.sections.invoiceCenter.title")}
        subtitle={t("finance.sections.invoiceCenter.subtitle")}
        delay={0.08}
      >
        <InvoiceCenter key={invoiceSeed} invoices={FINANCE_INVOICES} />
      </FinanceSection>

      <FinanceSection
        id="ai-invoice-processing"
        title={t("finance.sections.aiInvoiceProcessing.title")}
        subtitle={t("finance.sections.aiInvoiceProcessing.subtitle")}
        delay={0.1}
      >
        <AiInvoiceProcessing jobs={UPLOAD_JOBS} />
      </FinanceSection>

      <FinanceSection
        id="banking"
        title={t("finance.sections.banking.title")}
        subtitle={t("finance.sections.banking.subtitle")}
        delay={0.12}
      >
        <BankingPanel accounts={BANK_ACCOUNTS} transactions={BANK_TRANSACTIONS} />
      </FinanceSection>

      <FinanceSection
        id="datev-integration"
        title={t("finance.sections.datev.title")}
        subtitle={t("finance.sections.datev.subtitle")}
        delay={0.14}
      >
        <DatevIntegration history={DATEV_EXPORTS} />
      </FinanceSection>

      <FinanceSection
        id="tax-center"
        title={t("finance.sections.taxCenter.title")}
        subtitle={t("finance.sections.taxCenter.subtitle")}
        delay={0.16}
      >
        <TaxCenter vatSummaries={VAT_SUMMARIES} deadlines={TAX_DEADLINES} />
      </FinanceSection>

      <FinanceSection
        id="ai-insights"
        title={t("finance.sections.aiInsights.title")}
        subtitle={t("finance.sections.aiInsights.subtitle")}
        delay={0.18}
      >
        <AiInsights insights={AI_INSIGHTS} />
      </FinanceSection>

      <FinanceSection
        id="smart-search"
        title={t("finance.sections.smartSearch.title")}
        subtitle={t("finance.sections.smartSearch.subtitle")}
        delay={0.2}
      >
        <SmartSearch onQuery={onSmartQuery} />
      </FinanceSection>
    </div>
  );
}
