"use client";

import type { JSX, ReactNode } from "react";
import { Card, EmptyState } from "./ui";
import { ModuleEmptyState, type ModuleEmptyKind } from "./ui/ModuleEmptyState";
import { useTheme } from "../lib/theme";

const TITLE_KIND: Record<string, ModuleEmptyKind> = {
  CRM: "crm",
  Customers: "crm",
  Projects: "projects",
  Analytics: "analytics",
  Intelligence: "analytics",
  Documents: "documents",
  Billing: "billing",
  Agents: "agents",
  "Agent OS": "agents",
};

export function ModulePanel({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
}): JSX.Element {
  const { tokens } = useTheme();
  const kind = TITLE_KIND[title] ?? null;

  return (
    <Card hover={false} className="max-w-[860px]" padding="28px 30px">
      <h1
        style={{
          margin: "0 0 8px",
          color: tokens.accent,
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h1>
      <p style={{ margin: "0 0 18px", color: tokens.textMuted, fontSize: 14 }}>
        {description}
      </p>
      {children ??
        (kind ? (
          <ModuleEmptyState kind={kind} />
        ) : (
          <EmptyState
            title={`${title} is ready`}
            description="This module is prepared for production use. Records will appear here as your workspace grows."
          />
        ))}
    </Card>
  );
}