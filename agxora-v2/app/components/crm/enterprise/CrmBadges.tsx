"use client";

import type { JSX } from "react";
import type { BadgeTone } from "../../ui";
import { Badge } from "../../ui";
import {
  statusLabel,
  type CrmCustomerStatus,
  type CrmTag,
} from "../../../lib/crm/directory";
import { useLocale } from "../../../lib/i18n";

function statusTone(status: CrmCustomerStatus): BadgeTone {
  switch (status) {
    case "active":
      return "positive";
    case "vip":
      return "accent";
    case "lead":
      return "warning";
    case "prospect":
      return "default";
    case "inactive":
      return "default";
    case "archived":
      return "critical";
    default:
      return "default";
  }
}

export function CrmStatusBadge({
  status,
}: {
  readonly status: CrmCustomerStatus;
}): JSX.Element {
  const { t } = useLocale();
  return <Badge tone={statusTone(status)}>{t(statusLabel(status))}</Badge>;
}

export function CrmTagChips({
  tags,
}: {
  readonly tags: readonly CrmTag[];
}): JSX.Element | null {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
          style={{
            borderColor: `${tag.color}55`,
            background: `${tag.color}18`,
            color: tag.color,
          }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}
