"use client";

import type { JSX, ReactNode } from "react";
import { Card, EmptyState } from "./ui";
import { ModuleEmptyState, type ModuleEmptyKind } from "./ui/ModuleEmptyState";

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

/**
 * Shared module shell — identical title/lead/card rhythm across stub routes.
 */
export function ModulePanel({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
}): JSX.Element {
  const kind = TITLE_KIND[title] ?? null;

  return (
    <div className="agx-ui-page agx-page-enter">
      <Card hover={false} className="max-w-[860px]" padding="24px">
        <h1 className="agx-ui-section-title">{title}</h1>
        <p className="agx-ui-section-lead" style={{ marginBottom: 24 }}>
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
    </div>
  );
}
