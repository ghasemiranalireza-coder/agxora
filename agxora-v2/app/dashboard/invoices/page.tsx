"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

export default function InvoicesPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Invoices"
        description="Billing and invoice architecture for enterprise tenants."
      />
    </AppShell>
  );
}
