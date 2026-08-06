/**
 * AGXORA design-system tokens — single source for UI kit components.
 * Keep in sync with enterprise.css custom properties.
 *
 * Spacing follows an 8px base (with 4px half-step for tight UI).
 */

export const UI = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 28,
    pill: 999,
  },
  space: {
    /** 4px — half step */
    xs: 4,
    /** 8px */
    sm: 8,
    /** 16px */
    md: 16,
    /** 24px */
    lg: 24,
    /** 32px */
    xl: 32,
    /** 40px */
    "2xl": 40,
    /** 48px */
    "3xl": 48,
    section: 48,
  },
  typography: {
    label: 11,
    caption: 12,
    body: 13,
    bodyLg: 14,
    title: 16,
    display: 20,
  },
  control: {
    height: 40,
    heightSm: 32,
    icon: 18,
    iconSm: 16,
    iconLg: 20,
    padX: 16,
    padXSm: 12,
  },
  color: {
    text: "var(--agx-text, #f4f8fb)",
    textMuted: "var(--agx-text-muted, #94a3b8)",
    accent: "var(--agx-accent, #22d3ee)",
    border: "var(--agx-ds-border, rgba(255,255,255,0.1))",
    surface: "var(--agx-ds-surface, rgba(255,255,255,0.035))",
    success: "var(--agx-ds-success, #34d399)",
    warning: "var(--agx-ds-warning, #fbbf24)",
    danger: "var(--agx-ds-danger, #fb7185)",
    focus: "var(--agx-ds-shadow-focus)",
  },
  shadow: {
    sm: "var(--agx-ds-shadow-sm, 0 4px 14px rgba(0,0,0,0.16))",
    md: "var(--agx-ds-shadow-md, 0 12px 32px rgba(0,0,0,0.26))",
    lg: "var(--agx-ds-shadow-lg, 0 24px 56px rgba(0,0,0,0.34))",
  },
  motion: {
    fast: 0.16,
    base: 0.24,
    ease: [0.22, 1, 0.36, 1] as const,
  },
  card: {
    padding: "24px",
    radius: 24,
    hoverY: -2,
  },
  table: {
    rowMin: 48,
    headerPadY: 12,
    cellPadY: 12,
    cellPadX: 16,
  },
} as const;

export type BadgeTone =
  | "default"
  | "positive"
  | "warning"
  | "critical"
  | "accent";

export const BADGE_TONES: Record<
  BadgeTone,
  { readonly border: string; readonly background: string; readonly color: string }
> = {
  default: {
    border: "var(--agx-ds-border, rgba(255,255,255,0.12))",
    background: "var(--agx-ds-surface, rgba(255,255,255,0.04))",
    color: "var(--agx-text-muted, #94a3b8)",
  },
  positive: {
    border: "color-mix(in srgb, var(--agx-ds-success, #34d399) 28%, transparent)",
    background: "color-mix(in srgb, var(--agx-ds-success, #34d399) 12%, transparent)",
    color: "var(--agx-ds-success, #34d399)",
  },
  warning: {
    border: "color-mix(in srgb, var(--agx-ds-warning, #fbbf24) 28%, transparent)",
    background: "color-mix(in srgb, var(--agx-ds-warning, #fbbf24) 12%, transparent)",
    color: "var(--agx-ds-warning, #fbbf24)",
  },
  critical: {
    border: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 28%, transparent)",
    background: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 12%, transparent)",
    color: "var(--agx-ds-danger, #fb7185)",
  },
  accent: {
    border: "color-mix(in srgb, var(--agx-accent, #22d3ee) 28%, transparent)",
    background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)",
    color: "var(--agx-accent, #22d3ee)",
  },
};
