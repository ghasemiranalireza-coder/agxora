"use client";

import type { JSX } from "react";
import type { DocumentIntegration } from "../../lib/documents";
import { Badge, Card } from "../ui";
import { IntegrationStatusBadge } from "./shared/StatusBadges";

export function DocumentsIntegrations({
  integrations,
}: {
  readonly integrations: readonly DocumentIntegration[];
}): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Cloud drive adapters are architecture only — Google Drive, OneDrive, Dropbox, Box,
        SharePoint, Nextcloud. No live APIs.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border p-4 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_28%,transparent)]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
              opacity: item.status === "disabled" ? 0.7 : 1,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {item.name}
              </h3>
              <IntegrationStatusBadge status={item.status} />
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Reserved adapter:{" "}
              <span className="font-mono" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {item.adapter}
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {item.description}
            </p>
            <div className="mt-3">
              <Badge>Architecture</Badge>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
