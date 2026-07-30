"use client";

import { useMemo, useState, type FormEvent, type JSX } from "react";
import type { SmartSearchExample } from "../../lib/finance";
import { resolveSmartQuery } from "../../lib/finance";
import { FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

export function SmartSearch({
  examples,
  onQuery,
}: {
  readonly examples: readonly SmartSearchExample[];
  readonly onQuery?: (query: string) => void;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => resolveSmartQuery(submitted || query), [submitted, query]);

  const run = (value: string): void => {
    setQuery(value);
    setSubmitted(value);
    onQuery?.(value);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
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
            Natural Language Search
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try “Show unpaid invoices”'
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                background: "rgba(255,255,255,0.04)",
                color: "var(--agx-text, #f8fafc)",
              }}
            />
            <FinanceButton type="submit" variant="primary">
              Search
            </FinanceButton>
          </div>
        </label>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {result.hint}
        </p>
      </form>

      <div className="mt-5">
        <p
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Examples
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => run(example.query)}
              title={example.description}
              className="rounded-full border px-3.5 py-1.5 text-sm transition-opacity hover:opacity-90"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                background: "rgba(255,255,255,0.03)",
                color: "var(--agx-text, #f8fafc)",
              }}
            >
              {example.query}
            </button>
          ))}
        </div>
      </div>
    </FinanceGlassCard>
  );
}
