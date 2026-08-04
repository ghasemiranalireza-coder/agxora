"use client";

import type { JSX } from "react";
import Link from "next/link";
import { EmptyState } from "./States";

export type ModuleEmptyKind =
  | "crm"
  | "projects"
  | "analytics"
  | "documents"
  | "billing"
  | "agents";

const PRESETS: Record<
  ModuleEmptyKind,
  {
    readonly title: string;
    readonly description: string;
    readonly actionLabel?: string;
    readonly href?: string;
  }
> = {
  crm: {
    title: "Your CRM is ready",
    description:
      "Create the first customer record to unlock directory, profiles, and activity.",
    actionLabel: "Open CRM",
    href: "/dashboard/crm",
  },
  projects: {
    title: "No projects yet",
    description:
      "Spin up a delivery workspace to track milestones, budget, and team ownership.",
    actionLabel: "Open Projects",
    href: "/dashboard/projects",
  },
  analytics: {
    title: "Analytics awaits signal",
    description:
      "Once your workspace generates activity, executive KPIs and alerts appear here.",
    actionLabel: "Open Analytics",
    href: "/dashboard/analytics",
  },
  documents: {
    title: "Document library is empty",
    description:
      "Upload or create knowledge assets to power approvals, versions, and AI context.",
    actionLabel: "Open Documents",
    href: "/dashboard/documents",
  },
  billing: {
    title: "No billing history yet",
    description:
      "Upgrade a plan to generate invoices, renewals, and payment history.",
    actionLabel: "View plans",
    href: "/pricing",
  },
  agents: {
    title: "No agents active",
    description:
      "Install or activate an agent from the marketplace to start autonomous runs.",
    actionLabel: "Open Agent OS",
    href: "/dashboard/agents",
  },
};

/**
 * Premium empty-state presets for core modules.
 * Presentation only — does not alter business data flows.
 */
export function ModuleEmptyState({
  kind,
  onAction,
}: {
  readonly kind: ModuleEmptyKind;
  readonly onAction?: () => void;
}): JSX.Element {
  const preset = PRESETS[kind];

  if (onAction && preset.actionLabel) {
    return (
      <EmptyState
        title={preset.title}
        description={preset.description}
        actionLabel={preset.actionLabel}
        onAction={onAction}
        icon={<EmptyGlyph kind={kind} />}
      />
    );
  }

  if (preset.href && preset.actionLabel) {
    return (
      <EmptyState
        title={preset.title}
        description={preset.description}
        icon={<EmptyGlyph kind={kind} />}
        footer={
          <Link
            href={preset.href}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: "linear-gradient(90deg, #06b6d4, #22d3ee)",
              color: "#020617",
            }}
          >
            {preset.actionLabel}
          </Link>
        }
      />
    );
  }

  return (
    <EmptyState
      title={preset.title}
      description={preset.description}
      icon={<EmptyGlyph kind={kind} />}
    />
  );
}

function EmptyGlyph({ kind }: { readonly kind: ModuleEmptyKind }): JSX.Element {
  const label = kind.slice(0, 2).toUpperCase();
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.12em",
      }}
    >
      {label}
    </span>
  );
}
