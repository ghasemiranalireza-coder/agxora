"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useLocale } from "../../lib/i18n";
import { ModulePanel } from "../../components/ModulePanel";
import { Button, EmptyState } from "../../components/ui";

export default function InvoicesPage(): JSX.Element {
  const { t } = useLocale();

  return (
    <ModulePanel
      title={t("dashboard.shell.invoices.title")}
      description={t("dashboard.shell.invoices.description")}
    >
      <EmptyState
        title={t("dashboard.shell.invoices.emptyTitle")}
        description={t("dashboard.shell.invoices.emptyBody")}
        footer={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/finance" style={{ textDecoration: "none" }}>
              <Button variant="primary">{t("dashboard.shell.invoices.openFinance")}</Button>
            </Link>
            <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
              <Button variant="secondary">{t("dashboard.shell.invoices.openBilling")}</Button>
            </Link>
          </div>
        }
      />
    </ModulePanel>
  );
}
