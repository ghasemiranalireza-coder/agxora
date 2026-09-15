"use client";

import type { JSX } from "react";
import { FinanceShell } from "../../../components/finance/core/FinanceShell";
import { FinanceDocumentSettingsWorkspace } from "../../../components/finance/documents/FinanceDocumentSettingsWorkspace";

export default function FinanceDocumentSettingsPage(): JSX.Element {
  return (
    <FinanceShell titleKey="finance.documents.title" subtitleKey="finance.documents.subtitle">
      <FinanceDocumentSettingsWorkspace />
    </FinanceShell>
  );
}
