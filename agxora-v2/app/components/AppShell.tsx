"use client";

import type { JSX, ReactNode } from "react";
import { memo } from "react";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { useLocale } from "../lib/i18n";
import { CommandPalette } from "./CommandPalette";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopNav } from "./DashboardTopNav";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

/**
 * Application shell — responsive sidebar + top nav.
 * Memoized so route children can swap without remounting chrome.
 */
function AppShellComponent({
  children,
  showTopNav = true,
}: {
  readonly children: ReactNode;
  readonly showTopNav?: boolean;
}): JSX.Element {
  const { tokens } = useTheme();
  const { t } = useLocale();

  return (
    <>
      <a href="#agxora-dashboard-main" className="agx-skip-link">
        {t("dashboard.skipToContent")}
      </a>
      <div
        style={{
          minHeight: "100vh",
          color: tokens.text,
          display: "flex",
          flexWrap: "wrap",
          background: "transparent",
          transition: surfaceTransition,
          fontFamily:
            "var(--agx-ds-font-ui, var(--font-geist-sans), system-ui, sans-serif)",
        }}
      >
        <DashboardSidebar />
        <section
          id="agxora-dashboard-main"
          className="agx-shell-content"
          style={{
            position: "relative",
            flex: 1,
            padding: "44px 48px 56px",
            minWidth: "320px",
            background: "transparent",
          }}
        >
          {showTopNav ? <DashboardTopNav /> : null}
          <div className="agx-page-enter">{children}</div>
        </section>
        <CommandPalette />
      </div>
    </>
  );
}

export const AppShell = memo(AppShellComponent);
