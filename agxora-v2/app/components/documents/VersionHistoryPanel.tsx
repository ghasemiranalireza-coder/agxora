"use client";

import { useState, type JSX } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import { formatBytes, formatDateTime } from "../../lib/documents";
import { Button, Card, EmptyState } from "../ui";

export function VersionHistoryPanel({
  document,
}: {
  readonly document: KnowledgeDocument | null;
}): JSX.Element {
  const [notice, setNotice] = useState("Restore and compare require the storage API.");
  const [selected, setSelected] = useState<string | null>(null);

  if (!document) {
    return (
      <Card padding="24px" hover={false}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Version History
        </h3>
        <EmptyState
          title="No document selected"
          description="Open a document to inspect versions, notes, restore, and compare."
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-3" padding="24px" hover={false}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Version History
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {document.name} · current {document.version}
        </p>
      </div>

      <ul className="space-y-2">
        {document.versions.map((v) => {
          const active = selected === v.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setSelected(v.id)}
                className="w-full rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  borderColor: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                    : "var(--agx-card-border, rgba(255,255,255,0.08))",
                  background: active
                    ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {v.version}
                  </p>
                  <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {formatBytes(v.sizeBytes)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {v.author} · {formatDateTime(v.createdAt)}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {v.notes}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={!selected}
          onClick={() =>
            setNotice(`Restore queued for ${selected}.`)
          }
        >
          Restore Version
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!selected}
          onClick={() =>
            setNotice(`Compare ${selected} ↔ ${document.version}.`)
          }
        >
          Compare Versions
        </Button>
      </div>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
