"use client";

import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { UI } from "./tokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly loading?: boolean;
  readonly children: ReactNode;
  readonly size?: "sm" | "md";
}

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
    color: "var(--agx-ds-text, #f4f8fb)",
  },
  danger: {
    border: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 35%, transparent)",
    background: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 12%, transparent)",
    color: "var(--agx-ds-danger, #fb7185)",
  },
};

/**
 * Enterprise button — Primary / Secondary / Outline / Ghost / Danger.
 */
export function Button({
  variant = "secondary",
  loading = false,
  disabled = false,
  size = "md",
  children,
  style,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  const v = variantStyle[variant];
  const height = size === "sm" ? UI.control.heightSm : UI.control.height;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className="agx-ui-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: UI.space.sm,
        height,
        minWidth: size === "sm" ? 72 : 88,
        padding: `0 ${size === "sm" ? UI.control.padXSm : UI.control.padX}px`,
        borderRadius: UI.radius.md,
        border: `1px solid ${v.border}`,
        background: v.background,
        color: v.color,
        fontSize: size === "sm" ? UI.typography.caption : UI.typography.body,
        fontWeight: variant === "primary" ? 650 : 550,
        letterSpacing: "0.01em",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        boxShadow: variant === "primary" ? UI.shadow.sm : "none",
        transition:
          "opacity var(--agx-ds-duration, 160ms) var(--agx-ds-ease), background var(--agx-ds-duration, 160ms) ease, border-color var(--agx-ds-duration, 160ms) ease, transform var(--agx-ds-duration, 160ms) var(--agx-ds-ease), box-shadow var(--agx-ds-duration, 160ms) ease",
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span className="agx-ui-btn__spinner" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  active = false,
  ...rest
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly active?: boolean;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
>): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="agx-ui-icon-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: UI.control.height,
        height: UI.control.height,
        borderRadius: UI.radius.md,
        border: `1px solid ${
          active
            ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
            : "var(--agx-ds-border, rgba(255,255,255,0.12))"
        }`,
        background: active
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
          : "var(--agx-ds-surface, rgba(255,255,255,0.03))",
        color: active
          ? "var(--agx-accent, #22d3ee)"
          : "var(--agx-ds-text-muted, #94a3b8)",
        cursor: rest.disabled ? "not-allowed" : "pointer",
        transition:
          "background var(--agx-ds-duration, 160ms) ease, border-color var(--agx-ds-duration, 160ms) ease, color var(--agx-ds-duration, 160ms) ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
