"use client";

import Link from "next/link";
import type { JSX } from "react";
import { useLocale } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { interactionTransition } from "./motion";

export type AttentionItem = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly href: string;
  readonly tone: "info" | "action";
};

/**
 * Command-center strip — what needs attention and what to do next.
 */
export function AttentionPanel({
  items,
  summary,
}: {
  readonly items: readonly AttentionItem[];
  readonly summary: string;
}): JSX.Element {
  const { tokens } = useTheme();
  const { t } = useLocale();

  return (
    <section
      id="agx-command-center"
      className="agx-glass-panel agx-hero-follow agx-dash-panel"
      aria-label={t("dashboard.attention.ariaLabel")}
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        marginBottom: "24px",
        transition: interactionTransition("background", "border-color", "box-shadow"),
      }}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            style={{
              color: tokens.accent,
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 650,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {t("dashboard.attention.title")}
          </h2>
          <p
            style={{
              color: tokens.textMuted,
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.6,
              maxWidth: "62ch",
            }}
          >
            {summary}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <p
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: tokens.panelBorder,
            color: tokens.textMuted,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {t("dashboard.attention.empty")}
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="agx-dash-attention-card block h-full rounded-2xl border px-4 py-3 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor:
                    item.tone === "action"
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)"
                      : tokens.panelBorder,
                  background:
                    item.tone === "action"
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
                      : "rgba(255,255,255,0.03)",
                  color: tokens.text,
                  outlineColor: "var(--agx-accent, #22d3ee)",
                }}
              >
                <p
                  className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: tokens.accent }}
                >
                  {item.tone === "action"
                    ? t("dashboard.attention.tone.action")
                    : t("dashboard.attention.tone.info")}
                </p>
                <p className="mt-2 mb-1 text-sm font-semibold">{item.title}</p>
                <p
                  className="m-0 text-xs leading-relaxed"
                  style={{ color: tokens.textMuted }}
                >
                  {item.detail}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
