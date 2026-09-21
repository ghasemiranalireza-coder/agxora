"use client";

import { Suspense, use, type JSX } from "react";
import { InvoiceWorkspace } from "../../../../components/finance/core/InvoiceWorkspace";

export default function InvoiceDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): JSX.Element {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <InvoiceWorkspace detailId={id} />
    </Suspense>
  );
}
