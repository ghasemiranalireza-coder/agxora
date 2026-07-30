"use client";

import { useState, type JSX } from "react";
import type { WorkflowDefinition, WorkflowTemplate } from "../../lib/automation";
import { difficultyLabel } from "../../lib/automation";
import { Badge, Button, Card } from "../ui";
import { MiniWorkflowPreview } from "./shared/MiniWorkflowPreview";
import { AutomationDialog } from "./shared/StatusAndDialog";

export function WorkflowTemplates({
  templates,
  onUseTemplate,
}: {
  readonly templates: readonly WorkflowTemplate[];
  readonly onUseTemplate?: (workflow: WorkflowDefinition) => void;
}): JSX.Element {
  const [preview, setPreview] = useState<WorkflowTemplate | null>(null);
  const [notice, setNotice] = useState("Preview a template before loading it into the builder.");

  const applyTemplate = (tpl: WorkflowTemplate): void => {
    onUseTemplate?.(tpl.preview);
    setNotice(`Loaded “${tpl.name}” into the workflow builder.`);
    setPreview(null);
    document.getElementById("workflow-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Card padding="20px" hover={false}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Template Library
        </h3>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((tpl) => (
          <article
            key={tpl.id}
            className="flex h-full flex-col rounded-2xl border p-4 transition-colors hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_30%,transparent)]"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <MiniWorkflowPreview workflow={tpl.preview} height={96} />
            <div className="mt-3 flex items-start justify-between gap-2">
              <h4 className="font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {tpl.name}
              </h4>
              <Badge tone="accent">{tpl.category}</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {tpl.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{tpl.nodeCount} nodes</Badge>
              <Badge>{tpl.estimatedRuntime}</Badge>
              <Badge tone="warning">{difficultyLabel(tpl.difficulty)}</Badge>
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Recommended for: {tpl.recommendedFor}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPreview(tpl)}>
                Preview
              </Button>
              <Button size="sm" variant="primary" onClick={() => applyTemplate(tpl)}>
                Use Template
              </Button>
            </div>
          </article>
        ))}
      </div>

      <AutomationDialog
        open={preview != null}
        title={preview?.name ?? "Template Preview"}
        onClose={() => setPreview(null)}
        footer={
          preview ? (
            <>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => applyTemplate(preview)}>
                Use Template
              </Button>
            </>
          ) : null
        }
      >
        {preview ? (
          <div className="space-y-4">
            <MiniWorkflowPreview workflow={preview.preview} height={160} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {preview.description}
            </p>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Nodes</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{preview.nodeCount}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Connections</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{preview.preview.edges.length}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Estimated Runtime</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{preview.estimatedRuntime}</dd>
              </div>
              <div>
                <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>Difficulty</dt>
                <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{difficultyLabel(preview.difficulty)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Required Modules
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.requiredModules.map((m) => (
                  <Badge key={m} tone="accent">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Used AI Features
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.aiFeatures.length > 0 ? (
                  preview.aiFeatures.map((f) => <Badge key={f}>{f}</Badge>)
                ) : (
                  <span className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    None
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AutomationDialog>
    </Card>
  );
}
