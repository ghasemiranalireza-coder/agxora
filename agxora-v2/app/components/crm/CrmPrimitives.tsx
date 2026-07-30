"use client";

import type { JSX, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const glassStyle = {
  borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
  background:
    "linear-gradient(165deg, var(--agx-card-bg-from, rgba(255,255,255,0.06)) 0%, var(--agx-card-bg-to, rgba(255,255,255,0.02)) 100%)",
  boxShadow: "var(--agx-card-shadow, 0 8px 32px rgba(0,0,0,0.25))",
  backdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
  WebkitBackdropFilter: "var(--agx-card-blur, blur(22px) saturate(150%))",
} as const;

export function CrmGlassCard({
  children,
  className = "",
  padding = "p-5",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly padding?: string;
}): JSX.Element {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border ${padding} ${className}`}
      style={glassStyle}
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
    </div>
  );
}

export function CrmSection({
  id,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  readonly id: string;
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
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
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

export function CrmBadge({
  children,
  tone = "default",
}: {
  readonly children: ReactNode;
  readonly tone?: "default" | "positive" | "warning" | "critical" | "accent";
}): JSX.Element {
  const styles = {
    default: {
      border: "var(--agx-card-border, rgba(255,255,255,0.12))",
      background: "rgba(255,255,255,0.04)",
      color: "var(--agx-text-muted, #94a3b8)",
    },
    positive: {
      border: "rgba(52,211,153,0.28)",
      background: "rgba(52,211,153,0.12)",
      color: "#34d399",
    },
    warning: {
      border: "rgba(251,191,36,0.28)",
      background: "rgba(251,191,36,0.12)",
      color: "#fbbf24",
    },
    critical: {
      border: "rgba(251,113,133,0.28)",
      background: "rgba(251,113,133,0.12)",
      color: "#fb7185",
    },
    accent: {
      border: "rgba(34,211,238,0.28)",
      background: "rgba(34,211,238,0.12)",
      color: "#22d3ee",
    },
  } as const;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

export function CrmButton({
  children,
  onClick,
  variant = "secondary",
  type = "button",
  disabled = false,
}: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "secondary";
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
}): JSX.Element {
  const primary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border px-3.5 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: primary
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
          : "var(--agx-card-border, rgba(255,255,255,0.12))",
        background: primary
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)"
          : "rgba(255,255,255,0.04)",
        color: primary ? "var(--agx-accent, #22d3ee)" : "var(--agx-text, #f8fafc)",
      }}
    >
      {children}
    </button>
  );
}
