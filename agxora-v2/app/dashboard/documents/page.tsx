"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { DocumentsHubPage } from "../../components/documents";

/**
 * AGXORA AI Documents & Knowledge Hub.
 * Additive module — does not alter Hero, Header, Sidebar chrome, Finance, CRM,
 * Creator Studio, or Automation beyond registering this route in navigation.
 */
export default function DocumentsRoutePage(): JSX.Element {
  return (
    <AppShell>
      <DocumentsHubPage />
    </AppShell>
  );
}
