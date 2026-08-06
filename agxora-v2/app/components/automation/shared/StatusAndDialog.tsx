"use client";

import type { JSX } from "react";
import { Badge } from "../../ui";
import type { BadgeTone } from "../../ui";
import { runStatusLabel, runStatusTone, integrationLabel, integrationTone } from "../../../lib/automation";
import type { IntegrationStatus, RunStatus } from "../../../lib/automation";

export function RunStatusBadge({ status }: { readonly status: RunStatus }): JSX.Element {
  return <Badge tone={runStatusTone(status) as BadgeTone}>{runStatusLabel(status)}</Badge>;
}

export function IntegrationStatusBadge({
  status,
}: {
  readonly status: IntegrationStatus;
}): JSX.Element {
  return (
    <Badge tone={integrationTone(status) as BadgeTone}>{integrationLabel(status)}</Badge>
  );
}

/** Alias of shared Dialog — Escape/focus/portal live in the UI kit. */
export { Dialog as AutomationDialog } from "../../ui/Dialog";
