"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useT } from "../../lib/i18n";
import { Button } from "./Button";
import { EmptyState } from "./States";

export type ModuleEmptyKind =
  | "crm"
  | "projects"
  | "analytics"
  | "documents"
  | "billing"
  | "agents";

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
  const t = useT();
  const title = t(`ui.empty.${kind}Title`);
  const description = t(`ui.empty.${kind}Description`);
  const actionLabel = t(`ui.empty.${kind}Action`);
  const href =
    kind === "crm"
      ? "/dashboard/crm"
      : kind === "projects"
        ? "/dashboard/projects"
        : kind === "analytics"
          ? "/dashboard/analytics"
          : kind === "documents"
            ? "/dashboard/documents"
            : kind === "billing"
              ? "/dashboard/billing"
              : "/dashboard/agents";

  if (onAction) {
    return (
      <EmptyState
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onAction}
        icon={<EmptyGlyph kind={kind} />}
      />
    );
  }

  return (
    <EmptyState
      title={title}
      description={description}
      icon={<EmptyGlyph kind={kind} />}
      footer={
        <Link href={href} style={{ textDecoration: "none" }}>
          <Button variant="primary">{actionLabel}</Button>
        </Link>
      }
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
