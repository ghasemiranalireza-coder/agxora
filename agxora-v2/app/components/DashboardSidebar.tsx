"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type JSX } from "react";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { motion, useReducedMotion } from "framer-motion";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

function NavIcon({ path }: { readonly path: string }): JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    path: "M3 12l9-9 9 9 M5 10v9a1 1 0 0 0 1 1h3m6 0h3a1 1 0 0 0 1-1v-9 M9 20v-6h6v6",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    path: "M4 19V5 M10 19V9 M16 19v-6 M22 19V7",
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    path: "M4 5h16 M4 12h16 M4 19h10",
  },
  {
    label: "Automation",
    href: "/dashboard/automation",
    path: "M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-.5 M8 8V7a4 4 0 0 1 4-4 M7 14h.5A3 3 0 0 1 7 8h1m4 12v-3m-4 3h8",
  },
  {
    label: "Finance & Tax",
    href: "/dashboard/finance",
    path: "M3 21h18 M5 21V10l7-5 7 5v11 M9 21v-6h6v6 M12 5v2",
  },
  {
    label: "Team",
    href: "/dashboard/team",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    path: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10c.2.6.8 1 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  },
] as const;

/**
 * Dashboard sidebar — preserves approved glass visual language.
 */
export function DashboardSidebar(): JSX.Element {
  const { tokens } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 900px)");
    const sync = (): void => setIsMobile(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  const SIDEBAR_WIDTH = 280;
  const asideAnim = reduceMotion
    ? undefined
    : {
        initial: { opacity: isMobile && !open ? 0 : 1, x: 0 },
        animate: {
          opacity: isMobile ? (open ? 1 : 0) : 1,
          x: isMobile ? (open ? 0 : -SIDEBAR_WIDTH) : 0,
        },
        transition: { duration: 0.45 },
      };

  return (
    <>
      <button
        type="button"
        className="agx-sidebar-toggle"
        aria-label="Toggle navigation"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "none",
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 40,
          borderRadius: 12,
          border: `1px solid ${tokens.panelBorder}`,
          background: tokens.panelBg,
          color: tokens.accent,
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        Menu
      </button>

      <motion.aside
        className={`agx-sidebar${open ? " is-open" : ""}`}
        {...asideAnim}
        style={{
          position: "relative",
          width: "280px",
          minHeight: "100vh",
          background: tokens.sidebarBg,
          backdropFilter: tokens.sidebarBlur,
          WebkitBackdropFilter: tokens.sidebarBlur,
          borderRight: `1px solid ${tokens.sidebarBorder}`,
          boxShadow: tokens.sidebarShadow,
          padding: "40px 26px",
          transition: surfaceTransition,
          flexShrink: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 32%)",
            opacity: tokens.tone === "day" ? 0.95 : 0.4,
            transition: `opacity ${THEME_TRANSITION_MS}ms ease`,
          }}
        />

        <h2
          style={{
            position: "relative",
            color: tokens.accent,
            letterSpacing: "0.32em",
            marginBottom: "52px",
            marginTop: "4px",
            fontSize: "13px",
            fontWeight: 700,
            transition: surfaceTransition,
          }}
        >
          AGXORA
        </h2>

        <nav
          aria-label="Primary"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`agx-nav-item${active ? " is-active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  width: "100%",
                  padding: "13px 14px",
                  borderRadius: "16px",
                  border: active
                    ? `1px solid ${tokens.panelBorder}`
                    : "1px solid transparent",
                  background: active ? tokens.navActiveBg : "transparent",
                  boxShadow: active ? tokens.navActiveGlow : "none",
                  color: active ? tokens.accent : tokens.textMuted,
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "0.01em",
                  textAlign: "left",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition:
                    "background 360ms cubic-bezier(0.22, 1, 0.36, 1), color 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms cubic-bezier(0.22, 1, 0.36, 1), border-color 360ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: 20,
                    height: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: active ? 1 : 0.78,
                  }}
                >
                  <NavIcon path={item.path} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      <style jsx global>{`
        @media (max-width: 900px) {
          .agx-sidebar-toggle {
            display: inline-flex !important;
          }
          .agx-sidebar {
            position: fixed !important;
            inset: 0 auto 0 0;
            z-index: 30;
            transform: translateX(-105%);
          }
          .agx-sidebar.is-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
