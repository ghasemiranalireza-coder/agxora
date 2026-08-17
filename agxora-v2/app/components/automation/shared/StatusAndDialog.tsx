"use client";

import type { JSX } from "react";
import { Badge } from "../../ui";
import type { BadgeTone } from "../../ui";
import { runStatusLabel, runStatusTone, integrationLabel, integrationTone } from "../../../lib/automation";
import type { IntegrationStatus, RunStatus } from "../../../lib/automation";
import { useT } from "@/app/lib/i18n";

export function RunStatusBadge({ status }: { readonly status: RunStatus }): JSX.Element {
  const t = useT();
  return <Badge tone={runStatusTone(status) as BadgeTone}>{t(runStatusLabel(status))}</Badge>;
}

export function IntegrationStatusBadge({
  status,
}: {
  readonly status: IntegrationStatus;
}): JSX.Element {
  const t = useT();
  return (
    <Badge tone={integrationTone(status) as BadgeTone}>{t(integrationLabel(status))}</Badge>
  );
}

/** Alias of shared Dialog — Escape/focus/portal live in the UI kit. */
export { Dialog as AutomationDialog } from "../../ui/Dialog";
