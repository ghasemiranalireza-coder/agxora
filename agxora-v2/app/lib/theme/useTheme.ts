"use client";

import { useThemeContext, type ThemeContextValue } from "./ThemeProvider";

/** Public hook for Adaptive Theme Engine consumers. */
export function useTheme(): ThemeContextValue {
  return useThemeContext();
}
