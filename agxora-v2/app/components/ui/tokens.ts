/**
 * AGXORA enterprise UI tokens — single spacing / radius / shadow / motion system.
 * Does not alter theme colors; complements existing CSS variables.
 */

export const UI = {
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
    section: 48,
  },
  control: {
    height: 36,
    heightSm: 32,
    icon: 18,
    padX: 14,
  },
  shadow: {
    sm: "0 4px 16px rgba(0,0,0,0.18)",
    md: "0 12px 32px rgba(0,0,0,0.28)",
    lg: "0 24px 56px rgba(0,0,0,0.36)",
  },
  motion: {
    fast: 0.18,
    base: 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  },
  card: {
    padding: "20px",
    radius: 24,
    hoverY: -2,
  },
} as const;

export type BadgeTone = "default" | "positive" | "warning" | "critical" | "accent";

export const BADGE_TONES: Record<
  BadgeTone,
  { readonly border: string; readonly background: string; readonly color: string }
> = {
  default: {
    border: "var(--agx-card-border, rgba(255,255,255,0.12))",
    background: "rgba(255,255,255,0.04)",
    color: "var(--agx-text-muted, #94a3b8)",
  },
  positive: {
    border: "rgba(52,211,153,0.28)",
    background: "rgba(52,211,153,0.12)",
    color: "#34d399",
  },
  warning: {
    border: "rgba(251,191,36,0.28)",
    background: "rgba(251,191,36,0.12)",
    color: "#fbbf24",
  },
  critical: {
    border: "rgba(251,113,133,0.28)",
    background: "rgba(251,113,133,0.12)",
    color: "#fb7185",
  },
  accent: {
    border: "rgba(34,211,238,0.28)",
    background: "rgba(34,211,238,0.12)",
    color: "#22d3ee",
  },
};
