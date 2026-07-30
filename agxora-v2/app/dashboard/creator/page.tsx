"use client";

import type { JSX } from "react";
import { AppShell } from "../../components/AppShell";
import { CreatorStudioPage } from "../../components/creator-studio";

/**
 * AGXORA AI Creator Studio & Marketing OS.
 * Additive module — does not alter Hero, Globe, Header, Finance, or CRM.
 */
export default function CreatorRoutePage(): JSX.Element {
  return (
    <AppShell>
      <CreatorStudioPage />
    </AppShell>
  );
}
