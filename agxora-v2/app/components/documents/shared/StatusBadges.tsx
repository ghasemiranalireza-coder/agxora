"use client";

import type { JSX } from "react";
import type { DocumentStatus, IntegrationStatus } from "../../../lib/documents";
import {
  integrationLabel,
  integrationTone,
  statusLabel,
  statusTone,
} from "../../../lib/documents";
import { useLocale } from "../../../lib/i18n";
import { Badge } from "../../ui";
import type { BadgeTone } from "../../ui";

export function DocStatusBadge({ status }: { readonly status: DocumentStatus }): JSX.Element {
  const { t } = useLocale();
  return <Badge tone={statusTone(status) as BadgeTone}>{t(statusLabel(status))}</Badge>;
}

export function IntegrationStatusBadge({
  status,
}: {
  readonly status: IntegrationStatus;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <Badge tone={integrationTone(status) as BadgeTone}>{t(integrationLabel(status))}</Badge>
  );
}
