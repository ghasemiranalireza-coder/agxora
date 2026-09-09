"use client";

import type { JSX, ReactNode } from "react";
import { Badge } from "../ui/Badge";
import type { BadgeTone } from "../ui/tokens";

const STATUS_TONE: Record<string, BadgeTone> = {
  connected: "positive",
  available: "gold",
  requires_authorization: "accent",
  requires_permission: "warning",
  unsupported: "default",
  waiting: "warning",
  running: "accent",
  completed: "positive",
  failed: "critical",
  rejected: "default",
};

export function AGStatus({
  status,
  children,
}: {
  readonly status: string;
  readonly children: ReactNode;
}): JSX.Element {
  return <Badge tone={STATUS_TONE[status] ?? "default"}>{children}</Badge>;
}
