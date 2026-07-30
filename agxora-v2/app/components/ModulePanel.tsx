"use client";

import type { JSX, ReactNode } from "react";
import { Card, EmptyState } from "./ui";
import { useTheme } from "../lib/theme";

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
      {children ?? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="This module is ready. Content and records will appear here as your workspace grows."
        />
      )}
    </Card>
  );
}
