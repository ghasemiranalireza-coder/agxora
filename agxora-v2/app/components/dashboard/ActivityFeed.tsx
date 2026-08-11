"use client";

import Link from "next/link";
import type { JSX } from "react";
import type { Activity, ActivityKind } from "../../lib/backend/types";
import { useLocale } from "../../lib/i18n";
import { THEME_TRANSITION_MS, useTheme } from "../../lib/theme";

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

const KIND_MESSAGE_KEY: Record<ActivityKind, string> = {
  customer_created: "customer",
  customer_updated: "customer",
  customer_deleted: "customer",
  project_updated: "project",
  invoice_paid: "finance",
  workflow_executed: "automation",
  document_uploaded: "documents",
  member_invited: "team",
  generic: "workspace",
};

function formatRelativeTime(iso: string, bcp47: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const deltaSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(bcp47, { numeric: "auto" });
  if (abs < 60) return rtf.format(deltaSec, "second");
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(deltaSec / 3600), "hour");
  return rtf.format(Math.round(deltaSec / 86400), "day");
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Live activity feed — real workspace events with empty-state guidance.
 */
export function ActivityFeed({
  items,
}: {
  readonly items: readonly Activity[];
}): JSX.Element {
  const { tokens } = useTheme();
  const { t, bcp47 } = useLocale();
  const todayCount = items.filter((row) => isToday(row.createdAt)).length;
  const visible = items.slice(0, 12);

  return (
    <section
      id="agx-live-activity"
      className="agx-glass-panel agx-dash-activity"
      aria-label={t("dashboard.activity.ariaLabel")}
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        transition: surfaceTransition,
        minHeight: 416,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            style={{
              color: tokens.accent,
              marginBottom: "6px",
              marginTop: 0,
              fontSize: "12px",
              fontWeight: 650,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {t("dashboard.activity.title")}
          </h2>
          <p className="m-0 text-sm" style={{ color: tokens.textMuted }}>
            {t("dashboard.activity.subtitle")}
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.14em]"
          style={{
            borderColor: tokens.panelBorder,
            color: tokens.textMuted,
          }}
        >
          {t("dashboard.activity.todayCount", { count: todayCount })}
        </span>
      </header>

      {visible.length === 0 ? (
        <div
          className="flex flex-1 flex-col items-start justify-center rounded-2xl border px-5 py-8"
          style={{
            borderColor: tokens.panelBorder,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p
            className="m-0 text-sm font-semibold"
            style={{ color: tokens.text }}
          >
            {t("dashboard.activity.emptyTitle")}
          </p>
          <p
            className="mt-2 mb-4 max-w-md text-sm leading-relaxed"
            style={{ color: tokens.textMuted }}
          >
            {t("dashboard.activity.emptyBody")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/customers"
              className="rounded-xl border px-3 py-2 text-xs font-semibold no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: "color-mix(in srgb, var(--agx-accent, #22d3ee) 40%, transparent)",
                color: tokens.accent,
                outlineColor: "var(--agx-accent, #22d3ee)",
              }}
            >
              {t("dashboard.activity.addCustomer")}
            </Link>
            <Link
              href="/dashboard/projects"
              className="rounded-xl border px-3 py-2 text-xs font-semibold no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: tokens.panelBorder,
                color: tokens.text,
                outlineColor: "var(--agx-accent, #22d3ee)",
              }}
            >
              {t("dashboard.activity.newProject")}
            </Link>
          </div>
        </div>
      ) : (
        <ul
          className="m-0 flex-1 list-none overflow-y-auto p-0"
          style={{ maxHeight: 360 }}
        >
          {visible.map((item) => {
            const kindKey =
              KIND_MESSAGE_KEY[item.kind] ?? "workspace";
            const body = (
              <>
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: tokens.accent,
                    boxShadow: "0 0 10px color-mix(in srgb, var(--agx-accent, #22d3ee) 55%, transparent)",
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: tokens.textMuted }}
                    >
                      {t(`dashboard.activity.kind.${kindKey}`)}
                    </span>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: tokens.textMuted }}
                    >
                      {formatRelativeTime(item.createdAt, bcp47)}
                    </span>
                  </span>
                  <span
                    className="mt-1 block text-sm font-medium"
                    style={{ color: tokens.text }}
                  >
                    {item.title}
                  </span>
                  <span
                    className="mt-0.5 block text-xs leading-relaxed"
                    style={{ color: tokens.textMuted }}
                  >
                    {item.detail}
                  </span>
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="agx-activity-row flex gap-3 border-b py-3.5 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      borderColor: tokens.divider,
                      outlineColor: "var(--agx-accent, #22d3ee)",
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    className="agx-activity-row flex gap-3 border-b py-3.5"
                    style={{ borderColor: tokens.divider }}
                  >
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
