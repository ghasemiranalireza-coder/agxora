"use client";

import type { JSX } from "react";
import type { DocumentActivity } from "../../lib/documents";
import { formatDateTime } from "../../lib/documents";
import { Badge, Card } from "../ui";

function kindTone(
  kind: DocumentActivity["kind"],
): "default" | "accent" | "positive" | "warning" {
  switch (kind) {
    case "upload":
      return "positive";
    case "share":
      return "accent";
    case "audit":
      return "warning";
    default:
      return "default";
  }
}

export function DocumentsActivity({
  activity,
}: {
  readonly activity: readonly DocumentActivity[];
}): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Recent changes, uploads, views, shares, and audit history — foundation for compliance trails.
      </p>
      <ul className="space-y-2">
        {activity.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_25%,transparent)]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={kindTone(item.kind)}>{item.title}</Badge>
                <span className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {formatDateTime(item.at)}
                </span>
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {item.detail}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {item.actor}
                {item.documentId ? ` · ${item.documentId}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
