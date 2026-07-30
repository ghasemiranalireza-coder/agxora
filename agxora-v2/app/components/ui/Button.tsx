"use client";

import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";
import { UI } from "./tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

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
    border: "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)",
    background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)",
    color: "var(--agx-accent, #22d3ee)",
  },
  secondary: {
    border: "var(--agx-card-border, rgba(255,255,255,0.12))",
    background: "rgba(255,255,255,0.04)",
    color: "var(--agx-text, #f8fafc)",
  },
  ghost: {
    border: "transparent",
    background: "transparent",
    color: "var(--agx-text-muted, #94a3b8)",
  },
  danger: {
    border: "rgba(251,113,133,0.35)",
    background: "rgba(251,113,133,0.12)",
    color: "#fb7185",
  },
};

/**
 * Enterprise button — Primary / Secondary / Ghost / Danger + loading / disabled.
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
        gap: 8,
        height,
        padding: `0 ${UI.control.padX}px`,
        borderRadius: UI.radius.sm,
        border: `1px solid ${v.border}`,
        background: v.background,
        color: v.color,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 550,
        letterSpacing: "0.01em",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition:
          "opacity 180ms ease, background 180ms ease, border-color 180ms ease, transform 180ms ease",
        ...style,
      }}
      {...rest}
    >
      {loading ? <span aria-hidden="true">…</span> : null}
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
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">): JSX.Element {
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
        borderRadius: UI.radius.sm,
        border: `1px solid ${
          active
            ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
            : "var(--agx-card-border, rgba(255,255,255,0.12))"
        }`,
        background: active
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
          : "rgba(255,255,255,0.03)",
        color: active
          ? "var(--agx-accent, #22d3ee)"
          : "var(--agx-text-muted, #94a3b8)",
        cursor: rest.disabled ? "not-allowed" : "pointer",
        transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
