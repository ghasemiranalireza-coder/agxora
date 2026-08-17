"use client";

import { memo, type JSX } from "react";
import type { WorkflowDefinition } from "../../../lib/automation";
import { useT } from "../../../lib/i18n";

const NODE_W = 56;
const NODE_H = 28;

/** Compact read-only workflow preview for templates / dialogs. */
export const MiniWorkflowPreview = memo(function MiniWorkflowPreview({
  workflow,
  height = 120,
}: {
  readonly workflow: WorkflowDefinition;
  readonly height?: number;
}): JSX.Element {
  const t = useT();
  if (workflow.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border text-xs"
        style={{
          height,
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
          color: "var(--agx-text-muted, #94a3b8)",
        }}
      >
        {t("automation.miniPreview.emptyWorkflow")}
      </div>
    );
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of workflow.nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + 168);
    maxY = Math.max(maxY, n.y + 72);
  }
  const pad = 40;
  const vbW = Math.max(200, maxX - minX + pad * 2);
  const vbH = Math.max(120, maxY - minY + pad * 2);
  const map = new Map(workflow.nodes.map((n) => [n.id, n]));

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        height,
        borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
        background: "rgba(255,255,255,0.02)",
      }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox={`${minX - pad} ${minY - pad} ${vbW} ${vbH}`}>
        {workflow.edges.map((edge) => {
          const from = map.get(edge.from);
          const to = map.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x + 84}
              y1={from.y + 36}
              x2={to.x + 84}
              y2={to.y + 36}
              stroke="rgba(34,211,238,0.4)"
              strokeWidth={6}
            />
          );
        })}
        {workflow.nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x + 40}
              y={n.y + 16}
              width={NODE_W * 1.5}
              height={NODE_H}
              rx={10}
              fill="rgba(34,211,238,0.22)"
              stroke="rgba(34,211,238,0.45)"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
    </div>
  );
});
