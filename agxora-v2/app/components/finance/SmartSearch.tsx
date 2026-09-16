"use client";

import { useMemo, useRef, useState, type FormEvent, type JSX } from "react";
import { resolveSmartQuery } from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
import { VoiceInputButton } from "../ui";
import { FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

const EXAMPLE_IDS = ["q1", "q2", "q3", "q4"] as const;

export function SmartSearch({
  onQuery,
}: {
  readonly onQuery?: (query: string, intent?: string) => void;
}): JSX.Element {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const listeningRef = useRef(false);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(
    () => resolveSmartQuery(submitted || query),
    [submitted, query],
  );

  const hint =
    result.intent === "general"
      ? t(result.hintKey, { query: (submitted || query).trim() })
      : t(result.hintKey);

  const run = (value: string): void => {
    setQuery(value);
    setSubmitted(value);
    const resolved = resolveSmartQuery(value);
    onQuery?.(value, resolved.intent);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (listeningRef.current) return;
    run(query);
  };

  return (
    <FinanceGlassCard padding="p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("finance.search.label")}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="agx-voice-field min-w-0 flex-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("finance.search.placeholder")}
                className="agx-ui-control w-full"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              />
              <VoiceInputButton
                value={query}
                onChange={setQuery}
                inputRef={inputRef}
                onListeningChange={(listening) => {
                  listeningRef.current = listening;
                }}
              />
            </div>
            <FinanceButton type="submit" variant="primary">
              {t("finance.search.submit")}
            </FinanceButton>
          </div>
        </label>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {hint}
        </p>
      </form>

      <div className="mt-5">
        <p
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("finance.search.examplesTitle")}
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDS.map((id) => {
            const localizedQuery = t(`finance.search.examples.${id}.query`);
            const description = t(`finance.search.examples.${id}.description`);
            return (
              <button
                key={id}
                type="button"
                onClick={() => run(localizedQuery)}
                title={description}
                className="rounded-full border px-3.5 py-1.5 text-sm transition-opacity hover:opacity-90"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                {localizedQuery}
              </button>
            );
          })}
        </div>
      </div>
    </FinanceGlassCard>
  );
}
