"use client";

import type { JSX, ReactNode } from "react";
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
    <div
      className="agx-glass-panel"
      style={{
        padding: "28px 30px",
        borderRadius: 26,
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        maxWidth: 860,
      }}
    >
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
      {children}
    </div>
  );
}
