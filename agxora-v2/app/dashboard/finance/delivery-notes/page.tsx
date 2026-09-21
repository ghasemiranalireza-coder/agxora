"use client";

import { Suspense, type JSX } from "react";
import { DeliveryNoteWorkspace } from "../../../components/finance/core/DeliveryNoteWorkspace";

export default function DeliveryNotesPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <DeliveryNoteWorkspace />
    </Suspense>
  );
}
