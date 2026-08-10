"use client";

import Link from "next/link";
import type { CSSProperties, JSX, ReactNode } from "react";
import type { ButtonVariant } from "@/app/components/ui/Button";
import { UI } from "@/app/components/ui/tokens";

const variantStyle: Record<
  ButtonVariant,
  { border: string; background: string; color: string }
> = {
  primary: {
    border: "transparent",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--agx-ds-accent, #22d3ee) 88%, white) 0%, var(--agx-ds-accent, #22d3ee) 55%, color-mix(in srgb, var(--agx-ds-accent, #22d3ee) 75%, #0e7490) 100%)",
    color: "var(--agx-ds-on-accent, #041018)",
  },
  secondary: {
    border: "var(--agx-ds-border, rgba(255,255,255,0.12))",
    background: "var(--agx-ds-surface, rgba(255,255,255,0.04))",
    color: "var(--agx-ds-text, #f4f8fb)",
  },
  outline: {
    border: "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)",
    background: "transparent",
    color: "var(--agx-accent, #22d3ee)",
  },
  ghost: {
    border: "transparent",
    background: "transparent",
    color: "var(--agx-ds-text-muted, #94a3b8)",
  },
  danger: {
    border: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 35%, transparent)",
    background: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 12%, transparent)",
    color: "var(--agx-ds-danger, #fb7185)",
  },
};

/**
 * Navigation link styled as a button — avoids invalid Link + Button nesting.
 */
export function SaasNavLink({
  href,
  variant = "secondary",
  size = "sm",
  children,
}: {
  readonly href: string;
  readonly variant?: ButtonVariant;
  readonly size?: "sm" | "md";
  readonly children: ReactNode;
}): JSX.Element {
  const v = variantStyle[variant];
  const height = size === "sm" ? UI.control.heightSm : UI.control.height;
  const linkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: UI.space.sm,
    height,
    minWidth: size === "sm" ? 72 : 88,
    minHeight: 44,
    padding: `0 ${size === "sm" ? UI.control.padXSm : UI.control.padX}px`,
    borderRadius: UI.radius.md,
    border: `1px solid ${v.border}`,
    background: v.background,
    color: v.color,
    fontSize: size === "sm" ? UI.typography.caption : UI.typography.body,
    fontWeight: variant === "primary" ? 650 : 550,
    letterSpacing: "0.01em",
    textDecoration: "none",
    cursor: "pointer",
    boxShadow: variant === "primary" ? UI.shadow.sm : "none",
    transition:
      "opacity var(--agx-ds-duration, 160ms) var(--agx-ds-ease), background var(--agx-ds-duration, 160ms) ease, border-color var(--agx-ds-duration, 160ms) ease",
  };

  return (
    <Link href={href} className="agx-ui-btn-link" style={linkStyle}>
      {children}
    </Link>
  );
}
