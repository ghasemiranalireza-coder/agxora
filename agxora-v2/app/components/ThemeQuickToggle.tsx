"use client";

/**
 * Header quick theme toggle — single control cycling Day ↔ Night.
 * Full Appearance configuration lives only in Settings Control Center.
 * Does not replace the Hero ThemeSwitcher on /dashboard.
 */

import type { JSX } from "react";
import { useTheme, type ThemeMode } from "../lib/theme";
import { IconButton } from "./ui";

function ThemeGlyph({ appearance }: { readonly appearance: "day" | "night" }): JSX.Element {
  if (appearance === "day") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeQuickToggle(): JSX.Element {
  const { mode, appearance, setMode } = useTheme();
  const next: ThemeMode = appearance === "day" ? "night" : "day";

  return (
    <IconButton
      label={`Quick theme toggle. Preference: ${mode}. Resolved: ${appearance}. Switch to ${next}.`}
      active={appearance === "night"}
      onClick={() => setMode(next)}
    >
      <ThemeGlyph appearance={appearance} />
    </IconButton>
  );
}

export default ThemeQuickToggle;
