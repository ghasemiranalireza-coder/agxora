"use client";

import Link from "next/link";
import type { JSX } from "react";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

type QuickAction = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly primary?: boolean;
  readonly icon: string;
};

const ACTIONS: readonly QuickAction[] = [
  {
    id: "customer",
    label: "Add customer",
    description: "Create a CRM record",
    href: "/dashboard/customers",
    primary: true,
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    id: "project",
    label: "New project",
    description: "Start a delivery track",
    href: "/dashboard/projects",
    primary: true,
    icon: "M3 7h18 M3 12h18 M3 17h12",
  },
  {
    id: "ai",
    label: "Ask AI",
    description: "Open the AI workspace",
    href: "/dashboard/ai",
    icon: "M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z",
  },
  {
    id: "invoice",
    label: "Finance",
    description: "Invoices and cashflow",
    href: "/dashboard/finance",
    icon: "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  },
  {
    id: "automation",
    label: "Automations",
    description: "Workflow engine",
    href: "/dashboard/automation",
    icon: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Workspace preferences",
    href: "/dashboard/settings",
    icon: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  },
];

function ActionIcon({ path }: { readonly path: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Primary dashboard shortcuts — deduplicated, keyboard accessible. */
export function QuickActions(): JSX.Element {
  const { tokens } = useTheme();

  return (
    <section
      id="agx-quick-actions"
      className="agx-dash-panel mb-10"
      aria-label="Quick actions"
    >
      <header className="mb-4">
        <h2
          style={{
            color: tokens.accent,
            margin: "0 0 6px",
            fontSize: "12px",
            fontWeight: 650,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Quick actions
        </h2>
        <p className="m-0 text-sm" style={{ color: tokens.textMuted }}>
          What should you do next?
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="agx-dash-quick-action group flex items-start gap-3 rounded-2xl border px-4 py-3.5 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: action.primary
                ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                : tokens.panelBorder,
              background: action.primary
                ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                : tokens.panelBg,
              boxShadow: tokens.panelShadow,
              color: tokens.text,
              backdropFilter: tokens.cardBlur,
              outlineColor: "var(--agx-accent, #22d3ee)",
              transition: surfaceTransition,
            }}
          >
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: tokens.panelBorder,
                color: tokens.accent,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <ActionIcon path={action.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{action.label}</span>
              <span
                className="mt-0.5 block text-xs leading-relaxed"
                style={{ color: tokens.textMuted }}
              >
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
