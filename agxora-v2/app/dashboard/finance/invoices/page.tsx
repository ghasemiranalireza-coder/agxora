"use client";

import { Suspense, type JSX } from "react";
import { InvoiceWorkspace } from "../../../components/finance/core/InvoiceWorkspace";

export default function InvoicesFinancePage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <InvoiceWorkspace />
    </Suspense>
  );
}
