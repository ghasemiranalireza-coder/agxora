"use client";

/**
 * Premium segmented theme selector — Auto / Day / Night.
 * VisionOS-inspired frosted control; persists via ThemeProvider.
 */

import { useTheme, type ThemeMode } from "../lib/theme";
import { motion, useReducedMotion } from "framer-motion";
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
  gap: "3px",
  padding: "5px",
  borderRadius: "999px",
  background: "var(--agx-panel-bg, rgba(255,255,255,0.06))",
  border: "1px solid var(--agx-panel-border, rgba(34,211,238,0.28))",
  backdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
  WebkitBackdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
  boxShadow: "var(--agx-panel-shadow, 0 8px 24px rgba(0,0,0,0.25))",
  transition:
    "background var(--agx-theme-transition, 820ms) ease, border-color var(--agx-theme-transition, 820ms) ease, box-shadow var(--agx-theme-transition, 820ms) ease",
};

function optionStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 15px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    pointerEvents: "auto",
    fontSize: "11px",
    fontWeight: 650,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: active
      ? "var(--agx-accent, #22d3ee)"
      : "var(--agx-text-muted, #94a3b8)",
    background: active
      ? "var(--agx-accent-soft, rgba(34,211,238,0.14))"
      : "transparent",
    boxShadow: active
      ? "inset 0 0 0 1px color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent), 0 4px 16px color-mix(in srgb, var(--agx-accent, #22d3ee) 16%, transparent)"
      : "none",
    transform: active ? "scale(1)" : "scale(0.98)",
    transition:
      "color 320ms cubic-bezier(0.4, 0, 0.2, 1), background 320ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 320ms cubic-bezier(0.4, 0, 0.2, 1), transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

export default function ThemeSwitcher(): JSX.Element {
  const { mode, setMode } = useTheme();
  const reduceMotion = useReducedMotion();

  const animProps = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 },
      };

  return (
    <motion.div
      role="radiogroup"
      aria-label="Dashboard theme"
      style={shellStyle}
      {...animProps}
    >
      {OPTIONS.map((option) => {
        const active = mode === option.mode;
        return (
          <motion.button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            className="agx-theme-option"
            onClick={() => setMode(option.mode)}
            style={optionStyle(active)}
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
