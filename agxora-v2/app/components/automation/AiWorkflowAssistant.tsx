"use client";

import { useMemo, useState, type JSX } from "react";
import { useT } from "@/app/lib/i18n";
import type { WorkflowDefinition } from "../../lib/automation";
import { scoreWorkflow } from "../../lib/automation";
import { Badge, Button, Card } from "../ui";

function severityTone(
  severity: "info" | "warning" | "critical" | "opportunity",
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "opportunity":
      return "positive";
    default:
      return "accent";
  }
}

function suggestionValues(
  workflow: WorkflowDefinition,
  kind: string,
): { label: string; count: string } {
  if (kind === "duplicate_nodes") {
    const counts = new Map<string, number>();
    for (const node of workflow.nodes) {
      counts.set(node.label, (counts.get(node.label) ?? 0) + 1);
    }
    for (const [label, count] of counts) {
      if (count > 1) return { label, count: String(count) };
    }
  }
  if (kind === "unused_action") {
    const orphan = workflow.nodes.find(
      (n) =>
        (n.type === "action" || n.type === "ai_action") &&
        !workflow.edges.some((e) => e.from === n.id || e.to === n.id),
    );
    if (orphan) return { label: orphan.label, count: "" };
  }
  return { label: "", count: "" };
}

export function AiWorkflowAssistant({
  workflow,
  onClose,
}: {
  readonly workflow: WorkflowDefinition;
  readonly onClose?: () => void;
}): JSX.Element {
  const t = useT();
  const report = useMemo(() => scoreWorkflow(workflow), [workflow]);
  const [notice, setNotice] = useState(t("automation.assistant.noticeDefault"));

  return (
    <Card className="h-full space-y-4" padding="24px" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("automation.assistant.title")}
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("automation.assistant.subtitle")}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label={t("automation.assistant.closeAria")}
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              outlineColor: "var(--agx-accent, #22d3ee)",
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              color: "var(--agx-text-muted, #94a3b8)",
            }}
          >
            {t("automation.assistant.close")}
          </button>
        ) : null}
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: "color-mix(in srgb, var(--agx-accent, #22d3ee) 30%, transparent)",
          background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.assistant.workflowScore")}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {report.score}
          <span className="text-base font-medium" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {" "}
            {t("automation.assistant.scoreOutOf")}
          </span>
        </p>
        <Badge tone="accent">
          {t(
            report.score >= 85
              ? "automation.assistant.score.healthy"
              : report.score >= 70
                ? "automation.assistant.score.needsAttention"
                : "automation.assistant.score.atRisk",
          )}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.assistant.optimizationSuggestions")}
        </p>
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {report.suggestions.map((sug) => (
            <li
              key={sug.id}
              className="rounded-xl border p-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {t(`automation.assistant.suggestions.${sug.kind}.title`)}
                </p>
                <Badge tone={severityTone(sug.severity)}>
                  {t(`automation.assistant.kinds.${sug.kind}`)}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t(`automation.assistant.suggestions.${sug.kind}.description`, suggestionValues(workflow, sug.kind))}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="primary"
        onClick={() => setNotice(t("automation.assistant.noticeQueued"))}
      >
        {t("automation.assistant.oneClickOptimize")}
      </Button>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
