"use client";

import type { JSX } from "react";
import { ModulePanel } from "../../components/ModulePanel";

export default function InvoicesPage(): JSX.Element {
  return (
    <ModulePanel
      title="Invoices"
      description="Billing and invoice architecture for enterprise tenants."
    />
  );
}
