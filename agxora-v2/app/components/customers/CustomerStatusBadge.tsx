"use client";

import type { JSX } from "react";
import type { CustomerStatus } from "../../lib/customers";
import { Badge, type BadgeTone } from "../ui";

const STATUS_TONE: Record<CustomerStatus, BadgeTone> = {
  active: "positive",
  prospect: "accent",
  inactive: "default",
  blocked: "critical",
};

export function CustomerStatusBadge({
  status,
}: {
  readonly status: CustomerStatus;
}): JSX.Element {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}
