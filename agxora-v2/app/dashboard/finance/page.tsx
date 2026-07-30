"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { FinancePage } from "../../components/finance";

/**
 * AGXORA Finance & Tax — enterprise accounting foundation.
 * Additive module; does not alter Dashboard Hero or layout.
 */
export default function FinanceRoutePage(): JSX.Element {
  return (
    <AppShell>
      <FinancePage />
    </AppShell>
  );
}
