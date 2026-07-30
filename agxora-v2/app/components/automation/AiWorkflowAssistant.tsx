"use client";

import { useMemo, useState, type JSX } from "react";
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

export function AiWorkflowAssistant({
  workflow,
  onClose,
}: {
  readonly workflow: WorkflowDefinition;
  readonly onClose?: () => void;
}): JSX.Element {
  const report = useMemo(() => scoreWorkflow(workflow), [workflow]);
  const [notice, setNotice] = useState("One Click Optimize is a placeholder — no graph mutation yet.");

  return (
    <Card className="h-full space-y-4" padding="20px" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            AI Workflow Assistant
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Local heuristics only — no live model required.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close AI Workflow Assistant"
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              outlineColor: "var(--agx-accent, #22d3ee)",
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              color: "var(--agx-text-muted, #94a3b8)",
            }}
          >
            Close
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
          Workflow Score
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {report.score}
          <span className="text-base font-medium" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {" "}
            / 100
          </span>
        </p>
        <Badge tone="accent">{report.label}</Badge>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Optimization Suggestions
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
                  {sug.title}
                </p>
                <Badge tone={severityTone(sug.severity)}>{sug.kind.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {sug.description}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="primary"
        onClick={() =>
          setNotice("Optimize queued (placeholder). Future engine will rewrite delays & approvals.")
        }
      >
        One Click Optimize
      </Button>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {notice}
      </p>
    </Card>
  );
}
