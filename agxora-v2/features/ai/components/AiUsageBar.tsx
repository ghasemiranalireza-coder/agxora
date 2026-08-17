"use client";

import type { JSX } from "react";
import { useT } from "@/app/lib/i18n";
import { useAiUsage } from "../hooks/useAiUsage";
import { useAiPlatformContext } from "../hooks/useAiContext";
import { useAISettings } from "@/app/lib/ai/AIProviderContext";

export function AiUsageBar(): JSX.Element {
  const t = useT();
  const usage = useAiUsage();
  const { settings } = useAISettings();
  const { context } = useAiPlatformContext();

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2 text-[11px]"
      style={{
        color: "var(--agx-text-muted, #94a3b8)",
        background:
          "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 55%, transparent)",
        border:
          "1px solid color-mix(in srgb, var(--agx-border, #334155) 55%, transparent)",
      }}
    >
      <span>
        {t("ai.usageBar.provider")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)", fontWeight: 600 }}>
          {settings.defaultProviderId}
        </strong>
      </span>
      <span>
        {t("ai.usageBar.model")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)", fontWeight: 600 }}>
          {settings.defaultModelId}
        </strong>
      </span>
      <span>
        {t("ai.usageBar.estimatedTokens")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)", fontWeight: 600 }}>
          {usage.estimatedTotalTokens}
        </strong>
        <span className="opacity-70">
          {" "}
          {t("ai.usageBar.tokensInOut", {
            in: usage.estimatedPromptTokens,
            out: usage.estimatedCompletionTokens,
          })}
        </span>
      </span>
      <span>
        {t("ai.usageBar.cost")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)", fontWeight: 600 }}>
          {usage.estimatedCostUsd == null
            ? t("ai.usageBar.emDash")
            : `$${usage.estimatedCostUsd.toFixed(4)}`}
        </strong>
      </span>
      <span>
        {t("ai.usageBar.context")}{" "}
        <strong style={{ color: "var(--agx-text, #f8fafc)", fontWeight: 600 }}>
          {context.active.type === "none"
            ? t("ai.usageBar.contextNone")
            : `${context.active.type}${context.active.label ? `: ${context.active.label}` : ""}`}
        </strong>
      </span>
    </div>
  );
}
