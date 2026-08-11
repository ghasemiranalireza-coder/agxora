"use client";

import { useState, type JSX } from "react";
import type { AiInsight } from "../../lib/finance";
import { formatDate, severityTone } from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
import { FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

export function AiInsights({
  insights,
}: {
  readonly insights: readonly AiInsight[];
}): JSX.Element {
  const { t } = useLocale();
  const [noticeKey, setNoticeKey] = useState<"default" | "actionUnavailable">(
    "default",
  );
  const [actionLabel, setActionLabel] = useState("");

  const notice =
    noticeKey === "actionUnavailable"
      ? t("finance.insights.actionUnavailable", { action: actionLabel })
      : t("finance.insights.noticeDefault");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const tone = severityTone(insight.severity);
          return (
            <FinanceGlassCard
              key={insight.id}
              className="flex h-full flex-col gap-3"
              padding="p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={tone}
                >
                  {t("finance.insights.demoPrefix")} ·{" "}
                  {t(`finance.insights.kinds.${insight.kind}`)}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {formatDate(insight.detectedAt)}
                </span>
              </div>
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                {insight.title}
              </h3>
              <p
                className="flex-1 text-sm leading-relaxed"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {insight.description}
              </p>
              {insight.actionLabel ? (
                <div>
                  <FinanceButton
                    variant="primary"
                    title={t("finance.insights.actionUnavailableTitle", {
                      action: insight.actionLabel,
                    })}
                    onClick={() => {
                      setActionLabel(insight.actionLabel ?? "");
                      setNoticeKey("actionUnavailable");
                    }}
                  >
                    {insight.actionLabel}
                  </FinanceButton>
                </div>
              ) : null}
            </FinanceGlassCard>
          );
        })}
      </div>
      <p
        className="text-xs"
        role="status"
        aria-live="polite"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {notice}
      </p>
    </div>
  );
}
