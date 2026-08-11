"use client";

import { useState, type JSX } from "react";
import type { BankAccount, BankTransaction } from "../../lib/finance";
import { formatDate, formatMoney } from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
import { FinanceBadge, FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

export function BankingPanel({
  accounts,
  transactions,
}: {
  readonly accounts: readonly BankAccount[];
  readonly transactions: readonly BankTransaction[];
}): JSX.Element {
  const { t } = useLocale();
  const [noticeKey, setNoticeKey] = useState<"default" | "connectUnavailable">(
    "default",
  );
  const notice =
    noticeKey === "default"
      ? t("finance.banking.noticeDefault")
      : t("finance.banking.connectUnavailable");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <FinanceGlassCard className="space-y-4 xl:col-span-1" padding="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("finance.banking.connectionTitle")}
          </h3>
          <FinanceButton
            variant="primary"
            onClick={() => setNoticeKey("connectUnavailable")}
          >
            {t("finance.banking.connectBank")}
          </FinanceButton>
        </div>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("finance.banking.description")}
        </p>
        <div
          className="rounded-2xl border border-dashed p-4 text-sm"
          style={{
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.14))",
            color: "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {t("finance.banking.feedUnavailable")}
        </div>
        <p
          className="text-xs"
          role="status"
          aria-live="polite"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {notice}
        </p>
      </FinanceGlassCard>

      <FinanceGlassCard className="space-y-3 xl:col-span-1" padding="p-5">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("finance.banking.sampleAccounts")}
        </h3>
        <ul className="space-y-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="rounded-2xl border p-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {account.bankName}
                  </p>
                  <p
                    className="mt-1 text-xs tabular-nums"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {account.ibanMasked}
                  </p>
                </div>
                <FinanceBadge tone={account.connected ? "accent" : "default"}>
                  {account.connected
                    ? t("finance.banking.sample")
                    : t("finance.banking.offline")}
                </FinanceBadge>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p
                  className="text-lg font-semibold tabular-nums"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {account.connected
                    ? formatMoney(account.balance, account.currency)
                    : t("finance.banking.emptyBalance")}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {t("finance.banking.demoPrefix")}{" "}
                  {account.connected && account.lastSync !== "—"
                    ? formatDate(account.lastSync)
                    : t("finance.banking.emptyBalance")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </FinanceGlassCard>

      <FinanceGlassCard className="space-y-3 xl:col-span-1" padding="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("finance.banking.latestTransactions")}
          </h3>
          <div className="flex gap-2">
            <FinanceBadge tone="accent">
              {t("finance.banking.sampleMatching")}
            </FinanceBadge>
            <FinanceBadge tone="default">
              {t("finance.banking.demoOnly")}
            </FinanceBadge>
          </div>
        </div>
        <ul className="space-y-2">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {tx.counterparty}
                </p>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {formatDate(tx.date)}
                  {tx.invoiceRef ? ` · ${tx.invoiceRef}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    color: tx.amount >= 0 ? "#34d399" : "var(--agx-text, #f8fafc)",
                  }}
                >
                  {formatMoney(tx.amount, tx.currency)}
                </p>
                <div className="mt-1 flex justify-end">
                  <FinanceBadge tone={tx.matched ? "accent" : "warning"}>
                    {tx.matched
                      ? t("finance.banking.sampleMatch")
                      : t("finance.banking.unmatched")}
                  </FinanceBadge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </FinanceGlassCard>
    </div>
  );
}
