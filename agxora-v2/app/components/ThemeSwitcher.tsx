"use client";

/**
 * Premium segmented theme selector — Auto / Day / Night.
 * Sits in the dashboard header; persists mode via ThemeProvider.
 */

import { useTheme, type ThemeMode } from "../lib/theme";
import type { CSSProperties, JSX } from "react";

const OPTIONS: readonly {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly icon: string;
}[] = [
  { mode: "auto", label: "Auto", icon: "🌍" },
  { mode: "day", label: "Day", icon: "☀" },
  { mode: "night", label: "Night", icon: "🌙" },
];

const shellStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px",
  borderRadius: "999px",
  background: "var(--agx-panel-bg, rgba(255,255,255,0.06))",
  border: "1px solid var(--agx-panel-border, rgba(34,211,238,0.28))",
  backdropFilter: "blur(18px) saturate(140%)",
  WebkitBackdropFilter: "blur(18px) saturate(140%)",
  boxShadow: "var(--agx-card-shadow, 0 8px 24px rgba(0,0,0,0.25))",
  transition:
    "background var(--agx-theme-transition, 800ms) ease, border-color var(--agx-theme-transition, 800ms) ease, box-shadow var(--agx-theme-transition, 800ms) ease",
};

function optionStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: active
      ? "var(--agx-accent, #22d3ee)"
      : "var(--agx-text-muted, #94a3b8)",
    background: active
      ? "rgba(34,211,238,0.14)"
      : "transparent",
    boxShadow: active
      ? "inset 0 0 0 1px rgba(34,211,238,0.35), 0 0 18px rgba(34,211,238,0.15)"
      : "none",
    transition:
      "color 280ms ease, background 280ms ease, box-shadow 280ms ease, transform 280ms ease",
    transform: active ? "translateY(0)" : "none",
  };
}

export default function ThemeSwitcher(): JSX.Element {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Dashboard theme"
      style={shellStyle}
    >
      {OPTIONS.map((option) => {
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => setMode(option.mode)}
            style={optionStyle(active)}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
