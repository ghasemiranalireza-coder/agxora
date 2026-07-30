"use client";

import type { JSX } from "react";
import type { SearchResult } from "../../lib/workspace";
import { Badge } from "../ui";

export function SearchPreview({
  item,
  related,
  onOpenRelated,
}: {
  readonly item: SearchResult | null;
  readonly related: readonly SearchResult[];
  readonly onOpenRelated: (item: SearchResult) => void;
}): JSX.Element {
  if (!item) {
    return (
      <div
        className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border px-4 text-center text-sm"
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
          color: "var(--agx-text-muted, #94a3b8)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        Hover or highlight a result for preview, metadata, and smart links.
      </div>
    );
  }

  return (
    <aside
      className="space-y-3 rounded-2xl border p-4"
      style={{
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
        background: "rgba(255,255,255,0.03)",
      }}
      aria-label="Universal preview"
    >
      <div>
        <Badge tone="accent">{item.kind.replaceAll("_", " ")}</Badge>
        <h3
          className="mt-2 text-sm font-semibold leading-snug"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {item.title}
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {item.subtitle}
        </p>
      </div>

      {item.preview ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {item.preview}
        </p>
      ) : null}

      {item.meta ? (
        <dl className="space-y-1.5 text-xs">
          {Object.entries(item.meta).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{key}</dt>
              <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div>
        <p
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Related Items
        </p>
        {related.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            No smart links for this result.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {related.map((rel) => (
              <li key={rel.id}>
                <button
                  type="button"
                  onClick={() => onOpenRelated(rel)}
                  className="w-full rounded-xl border px-3 py-2 text-left text-xs transition hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_35%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    outlineColor: "var(--agx-accent, #22d3ee)",
                    borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                    color: "var(--agx-text, #f8fafc)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  <span className="font-medium">{rel.title}</span>
                  <span
                    className="mt-0.5 block"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {rel.subtitle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
