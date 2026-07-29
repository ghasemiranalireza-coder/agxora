"use client";

/**
 * Dashboard Hero — cinematic AGXORA CORE centerpiece.
 * Layout only; no business logic, AI, or routing changes.
 */

import type { CSSProperties, JSX } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import ThemeSwitcher from "../ThemeSwitcher";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";

const AgxoraGlobe3D = dynamic(() => import("../AgxoraGlobe3D").then((m) => m.default), {
  ssr: false,
  // Minimal skeleton keeps hero cinematic while Globe loads.
  loading: () => <div className="agx-globe-loading" aria-hidden="true" />,
});

const surfaceTransition = [
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `box-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `text-shadow ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function HeroSection(): JSX.Element {
  const { tokens } = useTheme();
  const isDay = tokens.tone === "day";
  const reduceMotion = useReducedMotion();

  const primaryCtaStyle: CSSProperties = {
    appearance: "none",
    border: "none",
    cursor: "pointer",
    padding: "14px 28px",
    borderRadius: "980px",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: isDay ? "#0b1520" : "#041018",
    background: isDay
      ? "linear-gradient(180deg, #f7fbff 0%, #d7e8f4 100%)"
      : "linear-gradient(180deg, #7ee7f7 0%, #22d3ee 55%, #0ea5c6 100%)",
    boxShadow: isDay
      ? "0 10px 28px rgba(90,130,160,0.22), inset 0 1px 0 rgba(255,255,255,0.9)"
      : "0 12px 36px rgba(34,211,238,0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
    transition: surfaceTransition,
  };

  const secondaryCtaStyle: CSSProperties = {
    appearance: "none",
    cursor: "pointer",
    padding: "14px 26px",
    borderRadius: "980px",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: tokens.text,
    background: isDay ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.06)",
    border: `1px solid ${tokens.panelBorder}`,
    boxShadow: isDay
      ? "inset 0 1px 0 rgba(255,255,255,0.7)"
      : "inset 0 1px 0 rgba(255,255,255,0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    transition: surfaceTransition,
  };

  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 26 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.9 },
      };

  const globeRise = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 34, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 1.05 },
      };

  return (
    <section className="agx-hero" aria-label="AGXORA CORE hero">
      <div className="agx-hero-theme">
        <ThemeSwitcher />
      </div>

      <motion.div className="agx-hero-copy" {...fadeUp}>
        <p
          className="agx-hero-eyebrow"
          style={{ color: tokens.textMuted, transition: surfaceTransition }}
        >
          AI Business Operating System
        </p>

        <h1
          className="agx-hero-title"
          style={{
            color: tokens.accent,
            textShadow: tokens.titleShadow,
            transition: surfaceTransition,
          }}
        >
          AGXORA CORE
        </h1>

        <p
          className="agx-hero-subtitle"
          style={{ color: tokens.textMuted, transition: surfaceTransition }}
        >
          Real-time intelligence, predictive analytics, and global operational
          control — in one cinematic command surface.
        </p>

        <div className="agx-hero-cta-row">
          <motion.button
            type="button"
            className="agx-hero-cta agx-hero-cta-primary"
            style={primaryCtaStyle}
            onClick={() => scrollToId("agx-command-center")}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.22 }}
            aria-label="Enter Command Center"
          >
            Enter Command Center
          </motion.button>
          <motion.button
            type="button"
            className="agx-hero-cta agx-hero-cta-secondary"
            style={secondaryCtaStyle}
            onClick={() => scrollToId("agx-live-activity")}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.22 }}
            aria-label="View Live Activity"
          >
            View Live Activity
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="agx-hero-globe-stage" {...globeRise}>
        <div className="agx-hero-globe-glow" aria-hidden="true" />
        <div className="agx-hero-globe-depth" aria-hidden="true" />
        <div className="agx-hero-globe-canvas">
          <AgxoraGlobe3D variant="hero" />
        </div>
      </motion.div>
    </section>
  );
}
