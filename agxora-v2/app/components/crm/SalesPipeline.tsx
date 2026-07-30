"use client";

import { useMemo, useState, type DragEvent, type JSX } from "react";
import type { PipelineDeal, PipelineStage } from "../../lib/crm";
import {
  formatMoney,
  groupDealsByStage,
  moveDealStage,
  PIPELINE_STAGES,
} from "../../lib/crm";
import { CrmBadge, CrmGlassCard } from "./CrmPrimitives";

export function SalesPipeline({
  initialDeals,
}: {
  readonly initialDeals: readonly PipelineDeal[];
}): JSX.Element {
  const [deals, setDeals] = useState<PipelineDeal[]>([...initialDeals]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const groups = useMemo(() => groupDealsByStage(deals), [deals]);

  const onDrop = (stage: PipelineStage): void => {
    if (!draggingId) return;
    setDeals((prev) => moveDealStage(prev, draggingId, stage));
    setDraggingId(null);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[1100px] gap-3">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="w-[180px] flex-1"
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={() => onDrop(stage.id)}
          >
            <CrmGlassCard className="h-full min-h-[320px]" padding="p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {stage.label}
                </h3>
                <CrmBadge>{groups[stage.id].length}</CrmBadge>
              </div>
              <ul className="space-y-2">
                {groups[stage.id].map((deal) => (
                  <li
                    key={deal.id}
                    draggable
                    onDragStart={() => setDraggingId(deal.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab rounded-2xl border p-3 active:cursor-grabbing"
                    style={{
                      borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                      background: "rgba(255,255,255,0.03)",
                      opacity: draggingId === deal.id ? 0.55 : 1,
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {deal.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {deal.company}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                        {formatMoney(deal.value, deal.currency)}
                      </span>
                      <span className="text-[11px] tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                        {deal.probability}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {deal.owner}
                    </p>
                  </li>
                ))}
              </ul>
            </CrmGlassCard>
          </div>
        ))}
      </div>
    </div>
  );
}
