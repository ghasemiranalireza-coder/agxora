"use client";

import type { JSX } from "react";
import { UniversalSearchOverlay } from "./workspace";

/**
 * Command palette entrypoint — now the AGXORA Universal Search OS layer.
 * Preserves Ctrl/⌘K + `agxora:command-palette` contract used by AppShell / TopNav.
 * Module pages are not modified.
 */
export function CommandPalette(): JSX.Element | null {
  return <UniversalSearchOverlay />;
}
