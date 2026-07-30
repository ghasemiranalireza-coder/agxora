"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { CrmPage } from "../../components/crm";

/**
 * AGXORA AI CRM + Creator OS.
 * Additive module — does not alter Dashboard Hero, Globe, or layout.
 */
export default function CrmRoutePage(): JSX.Element {
  return (
    <AppShell>
      <CrmPage />
    </AppShell>
  );
}
