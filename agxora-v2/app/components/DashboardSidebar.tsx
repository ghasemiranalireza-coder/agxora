"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

const DRAWER_EASE = [0.22, 1, 0.36, 1] as const;
const DRAWER_DURATION = 0.35;

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
    labelKey: "navigation.dashboard",
    href: "/dashboard",
    path: "M3 12l9-9 9 9 M5 10v9a1 1 0 0 0 1 1h3m6 0h3a1 1 0 0 0 1-1v-9 M9 20v-6h6v6",
  },
  {
    labelKey: "navigation.projects",
    href: "/dashboard/projects",
    path: "M4 5h16 M4 12h16 M4 19h10",
  },
  {
    labelKey: "navigation.aiCrm",
    href: "/dashboard/crm",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    labelKey: "navigation.analytics",
    href: "/dashboard/analytics",
    path: "M4 19V5 M10 19V9 M16 19v-6 M22 19V7",
  },
  {
    labelKey: "navigation.billing",
    href: "/dashboard/billing",
    path: "M4 6h16v12H4Z M4 10h16 M8 14h4",
  },
  {
    labelKey: "navigation.aiWorkspace",
    href: "/dashboard/ai",
    path: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M5.6 18.4l2.1-2.1 M16.3 7.7l2.1-2.1 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  },
  {
    labelKey: "navigation.customers",
    href: "/dashboard/customers",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    labelKey: "navigation.automation",
    href: "/dashboard/automation",
    path: "M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-.5 M8 8V7a4 4 0 0 1 4-4 M7 14h.5A3 3 0 0 1 7 8h1m4 12v-3m-4 3h8",
  },
  {
    labelKey: "navigation.financeTax",
    href: "/dashboard/finance",
    path: "M3 21h18 M5 21V10l7-5 7 5v11 M9 21v-6h6v6 M12 5v2",
  },
  {
    labelKey: "navigation.aiCreatorStudio",
    href: "/dashboard/creator",
    path: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  },
  {
    labelKey: "navigation.documents",
    href: "/dashboard/documents",
    path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h8 M8 9h2",
  },
  {
    labelKey: "navigation.team",
    href: "/dashboard/team",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    labelKey: "navigation.settings",
    href: "/dashboard/settings",
    path: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10c.2.6.8 1 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  },
] as const;

/**
 * Dashboard sidebar — preserves approved glass visual language.
 * Mobile drawer motion is owned exclusively by Framer Motion (no CSS transform overrides).
 */
export function DashboardSidebar(): JSX.Element {
  const { tokens } = useTheme();
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [isRtl, setIsRtl] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  const closeDrawer = useCallback((): void => {
    setOpen(false);
  }, []);

  const toggleDrawer = useCallback((): void => {
    setOpen((value) => !value);
  }, []);

  const drawerOpen = isMobile && open;

  useEffect(() => {
    const m = window.matchMedia("(max-width: 900px)");
    const sync = (): void => {
      const mobile = m.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setOpen(false);
      }
    };
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const syncDir = (): void => {
      setIsRtl(document.documentElement.dir === "rtl");
    };
    syncDir();
    const observer = new MutationObserver(syncDir);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const aside = asideRef.current;
    if (!aside) return;

    const focusable = aside.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    requestAnimationFrame(() => first.focus());

    const trapFocus = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    aside.addEventListener("keydown", trapFocus);
    return () => aside.removeEventListener("keydown", trapFocus);
  }, [drawerOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !drawerOpen && isMobile) {
      toggleRef.current?.focus();
    }
    wasOpenRef.current = drawerOpen;
  }, [drawerOpen, isMobile]);

  const closedOffset = isRtl ? "100%" : "-100%";
  const drawerTransition = reduceMotion
    ? { duration: 0 }
    : { duration: DRAWER_DURATION, ease: DRAWER_EASE };

  const mobileDrawerMotion = isMobile
    ? {
        initial: false as const,
        animate: {
          x: open ? 0 : closedOffset,
          opacity: open ? 1 : reduceMotion ? 1 : 0,
        },
        transition: drawerTransition,
      }
    : {};

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="agx-sidebar-toggle notranslate"
        aria-label={t("navigation.toggleNavigation")}
        aria-expanded={drawerOpen}
        aria-controls="agxora-sidebar"
        translate="no"
        onClick={toggleDrawer}
        style={{
          position: "fixed",
          top: 16,
          insetInlineStart: 16,
          zIndex: 40,
          borderRadius: 12,
          border: `1px solid ${tokens.panelBorder}`,
          background: tokens.panelBg,
          color: tokens.accent,
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        {t("navigation.menu")}
      </button>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.button
            key="agx-mobile-nav-scrim"
            type="button"
            className="agx-mobile-nav-overlay"
            aria-label={t("common.close")}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={drawerTransition}
            onClick={closeDrawer}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        ref={asideRef}
        id="agxora-sidebar"
        className={`agx-sidebar${drawerOpen ? " is-open" : ""}`}
        role={drawerOpen ? "dialog" : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label={drawerOpen ? t("navigation.primary") : undefined}
        aria-hidden={isMobile && !open ? true : undefined}
        {...mobileDrawerMotion}
        style={{
          position: "relative",
          width: "280px",
          minHeight: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          background: tokens.sidebarBg,
          backdropFilter: tokens.sidebarBlur,
          WebkitBackdropFilter: tokens.sidebarBlur,
          borderRight: `1px solid ${tokens.sidebarBorder}`,
          boxShadow: tokens.sidebarShadow,
          padding: "36px 22px 28px",
          transition: surfaceTransition,
          flexShrink: 0,
          pointerEvents: isMobile && !open ? "none" : "auto",
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
            marginBottom: "40px",
            marginTop: "2px",
            fontSize: "13px",
            fontWeight: 700,
            transition: surfaceTransition,
          }}
        >
          AGXORA
        </h2>

        <nav
          aria-label={t("navigation.primary")}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const label = t(item.labelKey);
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
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
                  textAlign: "start",
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
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
