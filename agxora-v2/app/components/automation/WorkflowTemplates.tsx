"use client";

import { useState, type JSX } from "react";
import type { WorkflowTemplate } from "../../lib/automation";
import { Badge, Button, Card } from "../ui";

export function WorkflowTemplates({
  templates,
}: {
  readonly templates: readonly WorkflowTemplate[];
}): JSX.Element {
  const [notice, setNotice] = useState(
    "Templates load into the builder as draft graphs — executor wiring reserved.",
  );

  return (
    <Card padding="20px" hover={false}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Templates
        </h3>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((tpl) => (
          <article
            key={tpl.id}
            className="flex h-full flex-col rounded-2xl border p-4"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {tpl.name}
              </h4>
              <Badge tone="accent">{tpl.category}</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {tpl.description}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {tpl.nodeCount} nodes
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setNotice(`Loaded template “${tpl.name}” into draft canvas.`)}
              >
                Use template
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
