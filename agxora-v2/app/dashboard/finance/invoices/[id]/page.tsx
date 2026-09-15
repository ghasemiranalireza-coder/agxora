"use client";

import type { JSX } from "react";
import { use } from "react";
import { InvoiceWorkspace } from "../../../../components/finance/core/InvoiceWorkspace";

export default function InvoiceDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): JSX.Element {
  const { id } = use(params);
  return <InvoiceWorkspace detailId={id} />;
}
