"use client";

import { lazy, Suspense, type JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { ModulePanel } from "../../components/ModulePanel";

const LazyNotes = lazy(async () => {
  return {
    default: function Notes(): JSX.Element {
      return (
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
          Customer module architecture is ready for CRM connectors.
        </p>
      );
    },
  };
});

export default function CustomersPage(): JSX.Element {
  return (
    <AppShell>
      <ModulePanel
        title="Customers"
        description="Multi-tenant customer records for the active workspace."
      >
        <Suspense fallback={<p>Loading module…</p>}>
          <LazyNotes />
        </Suspense>
      </ModulePanel>
    </AppShell>
  );
}
