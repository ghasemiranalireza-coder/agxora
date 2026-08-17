"use client";

import { memo, type JSX } from "react";
import { useT } from "@/app/lib/i18n";

export const TypingIndicator = memo(function TypingIndicator(): JSX.Element {
  const t = useT();
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2"
      style={{
        background:
          "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 90%, transparent)",
        border:
          "1px solid color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
      }}
      aria-label={t("ai.typingIndicator.ariaLabel")}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{
            background: "var(--agx-accent, #22d3ee)",
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
});
