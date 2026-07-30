"use client";

import type { JSX } from "react";
import type { DocumentStatus, IntegrationStatus } from "../../../lib/documents";
import {
  integrationLabel,
  integrationTone,
  statusLabel,
  statusTone,
} from "../../../lib/documents";
import { Badge } from "../../ui";
import type { BadgeTone } from "../../ui";

export function DocStatusBadge({ status }: { readonly status: DocumentStatus }): JSX.Element {
  return <Badge tone={statusTone(status) as BadgeTone}>{statusLabel(status)}</Badge>;
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
