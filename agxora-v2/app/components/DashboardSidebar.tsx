"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import { PRIMARY_NAV_ITEMS } from "../lib/workspace/firstCustomerSurface";

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

const NAV_ITEMS = PRIMARY_NAV_ITEMS;

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
            initial={false}
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

        <h2 className="agx-sidebar-brand">
          <span className="agx-sidebar-wordmark">AGXORA</span>
          <span className="agx-sidebar-tagline">{t("navigation.productTagline")}</span>
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
                    ? "1px solid color-mix(in srgb, var(--agx-ds-gold, #c9a66b) 42%, transparent)"
                    : "1px solid transparent",
                  background: active
                    ? "color-mix(in srgb, var(--agx-ds-gold, #c9a66b) 14%, transparent)"
                    : "transparent",
                  boxShadow: active
                    ? "0 0 24px color-mix(in srgb, var(--agx-ds-gold, #c9a66b) 16%, transparent)"
                    : "none",
                  color: active
                    ? "var(--agx-ds-gold, #c9a66b)"
                    : tokens.textMuted,
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
