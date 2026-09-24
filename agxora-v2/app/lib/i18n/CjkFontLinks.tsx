import type { JSX } from "react";

/**
 * CJK, Arabic, and Latin text use the installed system stacks in globals.css.
 * This component does not request Google Fonts at build time or at runtime.
 */
export function CjkFontLinks(): JSX.Element | null {
  return null;
}
