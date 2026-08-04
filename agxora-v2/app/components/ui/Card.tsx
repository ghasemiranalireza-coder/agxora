"use client";

import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { UI } from "./tokens";

const glassStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
  background:
    "linear-gradient(165deg, var(--agx-card-bg-from, rgba(255,255,255,0.06)) 0%, var(--agx-card-bg-to, rgba(255,255,255,0.02)) 100%)",
        boxShadow: "var(--agx-card-shadow, var(--agx-ds-shadow-md))",
        backdropFilter: "var(--agx-card-blur, blur(18px) saturate(140%))",
        WebkitBackdropFilter: "var(--agx-card-blur, blur(18px) saturate(140%))",
} as const;

/**
 * Shared glass card — unified radius, shadow, hover, internal rhythm.
 */
export function Card({
  children,
  className = "",
  padding = UI.card.padding,
  hover = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** CSS padding value, or omit / pass empty to rely on className. */
  readonly padding?: string | number | null;
  readonly hover?: boolean;
}): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`agx-ui-card relative overflow-hidden border ${className}`}
      whileHover={
        hover && !reduceMotion ? { y: UI.card.hoverY } : undefined
      }
      transition={{ duration: UI.motion.fast, ease: UI.motion.ease }}
      style={{
        ...glassStyle,
        borderRadius: UI.card.radius,
        ...(padding === null || padding === undefined || padding === ""
          ? {}
          : { padding }),
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
          opacity: 0.65,
        }}
        aria-hidden="true"
      />
      {children}
    </motion.div>
  );
}

export function Section({
  id,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  readonly id?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly delay?: number;
}): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      className="space-y-4"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: UI.motion.base, delay, ease: UI.motion.ease }}
    >
      <header className="space-y-1">
        <h2
          className="text-lg font-semibold tracking-tight sm:text-xl"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="max-w-3xl text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </motion.section>
  );
}
