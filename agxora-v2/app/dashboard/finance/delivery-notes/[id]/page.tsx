"use client";

import type { JSX } from "react";
import { use } from "react";
import { DeliveryNoteWorkspace } from "../../../../components/finance/core/DeliveryNoteWorkspace";

export default function DeliveryNoteDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): JSX.Element {
  const { id } = use(params);
  return <DeliveryNoteWorkspace detailId={id} />;
}
