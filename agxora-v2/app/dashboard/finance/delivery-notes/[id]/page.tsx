"use client";

import { Suspense, use, type JSX } from "react";
import { DeliveryNoteWorkspace } from "../../../../components/finance/core/DeliveryNoteWorkspace";

export default function DeliveryNoteDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): JSX.Element {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <DeliveryNoteWorkspace detailId={id} />
    </Suspense>
  );
}
