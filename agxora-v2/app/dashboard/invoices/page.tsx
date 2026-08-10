"use client";

import type { JSX } from "react";
import Link from "next/link";
import { ModulePanel } from "../../components/ModulePanel";
import { Button, EmptyState } from "../../components/ui";

export default function InvoicesPage(): JSX.Element {
  return (
    <ModulePanel
      title="Invoices"
      description="Billing and invoice architecture for enterprise tenants."
    >
      <EmptyState
        title="Invoice ledger is not available yet"
        description="This route is a shell — invoice creation and persistence are not connected. Use Finance for the sample ledger preview, or Billing for plan management."
        footer={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/finance" style={{ textDecoration: "none" }}>
              <Button variant="primary">Open Finance</Button>
            </Link>
            <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
              <Button variant="secondary">Open Billing</Button>
            </Link>
          </div>
        }
      />
    </ModulePanel>
  );
}
