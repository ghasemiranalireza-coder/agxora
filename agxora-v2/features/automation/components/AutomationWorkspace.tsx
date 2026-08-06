"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { automationStore } from "../store";
import { workflowService } from "../services";
import { useAutomationEngine } from "../hooks";
import type {
  TriggerType,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowNode,
  WorkflowSettings,
  WorkflowStatus,
} from "../types";
import { DEFAULT_WORKFLOW_SETTINGS } from "../types";

type TabId =
  | "dashboard"
  | "workflows"
  | "editor"
  | "history"
  | "templates"
  | "analytics"
  | "settings";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workflows", label: "Workflows" },
  { id: "editor", label: "Editor" },
  { id: "history", label: "History" },
  { id: "templates", label: "Templates" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

/**
 * Workflow Automation workspace — modular OS surface.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function AutomationWorkspace(): JSX.Element {
  const engine = useAutomationEngine();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    "Execution engine is UI-independent. Modules publish events; workflows subscribe.",
  );
  const [busy, setBusy] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<WorkflowSettings | null>(
    null,
  );

  useEffect(() => {
    automationStore.hydrate();
  }, []);

  useEffect(() => {
    if (!engine.hydrated) return;
    workflowService.ensureWorkspace(engine.organizationId);
  }, [engine.hydrated, engine.organizationId]);

  const settings =
    settingsDraft ??
    (engine.hydrated
      ? workflowService.getSettings(engine.organizationId)
      : DEFAULT_WORKFLOW_SETTINGS);

  const effectiveSelectedId = selectedId ?? engine.workflows[0]?.id ?? null;

  const selected = useMemo(
    () => engine.workflows.find((w) => w.id === effectiveSelectedId) ?? null,
    [engine.workflows, effectiveSelectedId],
  );

  const openEditor = (id: string) => {
    setSelectedId(id);
    setTab("editor");
  };

  const onCreate = () => {
    if (!engine.permissions.canWrite) {
      setNotice("Missing workflow.write permission.");
      return;
    }
    const wf = workflowService.create({
      organizationId: engine.organizationId,
      name: "Untitled workflow",
      description: "Draft workflow — configure trigger and actions.",
      createdBy: engine.userId ?? undefined,
    });
    setSelectedId(wf.id);
    setTab("editor");
    setNotice(`Created ${wf.name}`);
  };

  const onUseTemplate = (templateId: string) => {
    if (!engine.permissions.canWrite) return;
    const wf = workflowService.createFromTemplate(
      engine.organizationId,
      templateId,
      engine.userId ?? undefined,
    );
    if (!wf) return;
    setSelectedId(wf.id);
    setTab("editor");
    setNotice(`Template applied: ${wf.name}`);
  };

  const onRun = async (workflowId: string) => {
    if (!engine.permissions.canExecute) {
      setNotice("Missing workflow.execute permission.");
      return;
    }
    setBusy(true);
    try {
      const exec = await workflowService.runWorkflow(workflowId, {
        triggeredBy: "manual",
        payload: { source: "ui", at: new Date().toISOString() },
      });
      setNotice(
        exec
          ? `Run ${exec.status} (${exec.durationMs ?? 0}ms)`
          : "Workflow could not run (disabled or missing).",
      );
      setTab("history");
    } finally {
      setBusy(false);
    }
  };

  const onPublishEvent = (type: string) => {
    workflowService.publishModuleEvent({
      type,
      organizationId: engine.organizationId,
      source: "automation.ui",
      payload: { demo: true, at: new Date().toISOString() },
    });
    setNotice(`Published domain event: ${type}`);
    setTab("history");
  };

  if (!engine.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading automation engine…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          Workflow Automation Engine
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Automation
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Configurable business workflows across CRM, Projects, Finance,
          Documents, and AI — event-driven, queue-ready, and backend-ready.
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </Card>

      {tab === "dashboard" ? (
        <DashboardPanel
          analytics={engine.analytics}
          workflows={engine.workflows}
          notifications={engine.notifications}
          onOpen={openEditor}
          onCreate={onCreate}
          onPublishEvent={onPublishEvent}
        />
      ) : null}

      {tab === "workflows" ? (
        <WorkflowListPanel
          workflows={engine.workflows}
          canWrite={engine.permissions.canWrite}
          canExecute={engine.permissions.canExecute}
          busy={busy}
          onOpen={openEditor}
          onCreate={onCreate}
          onRun={(id) => void onRun(id)}
          onStatus={(id, status) => {
            workflowService.setStatus(id, status);
            setNotice(`Workflow ${status}`);
          }}
        />
      ) : null}

      {tab === "editor" ? (
        <WorkflowEditorPanel
          key={selected?.id ?? "none"}
          workflow={selected}
          workflows={engine.workflows}
          triggers={engine.triggers}
          actions={engine.actions}
          canWrite={engine.permissions.canWrite}
          canExecute={engine.permissions.canExecute}
          busy={busy}
          onSelect={setSelectedId}
          onSave={(wf) => {
            workflowService.update(wf);
            setNotice("Workflow saved");
          }}
          onRun={(id) => void onRun(id)}
        />
      ) : null}

      {tab === "history" ? (
        <HistoryPanel
          executions={engine.executions}
          workflows={engine.workflows}
          canExecute={engine.permissions.canExecute}
          onRetry={(id) => {
            void workflowService.retryExecution(id).then((exec) => {
              setNotice(exec ? `Retry ${exec.status}` : "Retry failed");
            });
          }}
        />
      ) : null}

      {tab === "templates" ? (
        <TemplatesPanel
          templates={engine.templates}
          canWrite={engine.permissions.canWrite}
          onUse={onUseTemplate}
        />
      ) : null}

      {tab === "analytics" ? (
        <AnalyticsPanel analytics={engine.analytics} />
      ) : null}

      {tab === "settings" ? (
        <SettingsPanel
          draft={settings}
          canAdmin={engine.permissions.canAdmin}
          onChange={setSettingsDraft}
          onSave={() => {
            workflowService.saveSettings(engine.organizationId, settings);
            setSettingsDraft(null);
            setNotice("Automation settings saved");
          }}
        />
      ) : null}
    </div>
  );
}

function DashboardPanel({
  analytics,
  workflows,
  notifications,
  onOpen,
  onCreate,
  onPublishEvent,
}: {
  analytics: ReturnType<typeof useAutomationEngine>["analytics"];
  workflows: readonly WorkflowDefinition[];
  notifications: ReturnType<typeof useAutomationEngine>["notifications"];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onPublishEvent: (type: string) => void;
}): JSX.Element {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Workflows" value={String(analytics.totalWorkflows)} />
        <Stat label="Active" value={String(analytics.activeWorkflows)} />
        <Stat label="Runs today" value={String(analytics.executionsToday)} />
        <Stat label="Success rate" value={`${analytics.successRate}%`} />
      </div>
      <Card className="space-y-3" padding="20px" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Recent workflows
          </h2>
          <Button size="sm" onClick={onCreate}>
            New workflow
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {workflows.slice(0, 5).map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
              style={{ borderColor: "color-mix(in srgb, var(--agx-border, #334155) 50%, transparent)" }}
            >
              <button
                type="button"
                className="text-left font-medium"
                style={{ color: "var(--agx-text, #f8fafc)" }}
                onClick={() => onOpen(w.id)}
              >
                {w.name}
              </button>
              <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{w.status}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Event bus demo
        </h2>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Publish a module event. Active workflows with matching triggers enqueue automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "customer.created",
              "project.created",
              "invoice.issued",
              "task.completed",
            ] as const
          ).map((t) => (
            <Button key={t} size="sm" variant="secondary" onClick={() => onPublishEvent(t)}>
              {t}
            </Button>
          ))}
        </div>
      </Card>
      {notifications.length > 0 ? (
        <Card className="space-y-2" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Notifications
          </h2>
          <ul className="space-y-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {notifications.slice(0, 5).map((n) => (
              <li key={n.id}>
                <strong style={{ color: "var(--agx-text, #f8fafc)" }}>{n.title}</strong> — {n.body}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function WorkflowListPanel({
  workflows,
  canWrite,
  canExecute,
  busy,
  onOpen,
  onCreate,
  onRun,
  onStatus,
}: {
  workflows: readonly WorkflowDefinition[];
  canWrite: boolean;
  canExecute: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRun: (id: string) => void;
  onStatus: (id: string, status: WorkflowStatus) => void;
}): JSX.Element {
  const columns: DataTableColumn<WorkflowDefinition>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => onOpen(r.id)}>
          {r.name}
        </button>
      ),
    },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "nodes",
      header: "Nodes",
      render: (r) => String(r.nodes.length),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (r) => r.updatedAt.slice(0, 10),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" disabled={busy || !canExecute} onClick={() => onRun(r.id)}>
            Run
          </Button>
          {canWrite ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onStatus(r.id, r.status === "active" ? "disabled" : "active")
              }
            >
              {r.status === "active" ? "Disable" : "Activate"}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <Card className="space-y-3" padding="20px" hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Workflow list
        </h2>
        <Button size="sm" onClick={onCreate} disabled={!canWrite}>
          New workflow
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={[...workflows]}
        rowKey={(r) => r.id}
        emptyTitle="No workflows yet."
        emptyDescription="Create a workflow or start from a template."
        minWidth={720}
      />
    </Card>
  );
}

function WorkflowEditorPanel({
  workflow,
  workflows,
  triggers,
  actions,
  canWrite,
  canExecute,
  busy,
  onSelect,
  onSave,
  onRun,
}: {
  workflow: WorkflowDefinition | null;
  workflows: readonly WorkflowDefinition[];
  triggers: ReturnType<typeof useAutomationEngine>["triggers"];
  actions: ReturnType<typeof useAutomationEngine>["actions"];
  canWrite: boolean;
  canExecute: boolean;
  busy: boolean;
  onSelect: (id: string) => void;
  onSave: (wf: WorkflowDefinition) => void;
  onRun: (id: string) => void;
}): JSX.Element {
  const triggerNode = workflow?.nodes.find((n) => n.kind === "trigger");
  const actionNode = workflow?.nodes.find((n) => n.kind === "action");
  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    triggerNode && triggerNode.kind === "trigger"
      ? triggerNode.config.triggerType
      : "manual",
  );
  const [actionType, setActionType] = useState(
    actionNode && actionNode.kind === "action"
      ? actionNode.config.actionType
      : (actions[0]?.type ?? "notification.send"),
  );

  if (!workflow) {
    return (
      <Card padding="20px" hover={false}>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Select or create a workflow to edit.
        </p>
      </Card>
    );
  }

  const save = () => {
    if (!canWrite) return;
    const nodes: WorkflowNode[] = [
      {
        id: "n_trigger",
        kind: "trigger",
        label: triggers.find((t) => t.type === triggerType)?.label ?? "Trigger",
        position: { x: 80, y: 120 },
        config: { triggerType },
        next: ["n_action"],
      },
      {
        id: "n_action",
        kind: "action",
        label: actions.find((a) => a.type === actionType)?.label ?? "Action",
        position: { x: 360, y: 120 },
        config: { actionType, params: {}, outputKey: "result" },
      },
    ];
    // Preserve extra nodes (condition/delay/branch) beyond simple editor path
    const extras = workflow.nodes.filter(
      (n) => n.id !== "n_trigger" && n.id !== "n_action" && n.kind !== "trigger",
    );
    const merged = [
      nodes[0],
      ...extras.filter((n) => n.kind !== "action" || n.id !== "n_action"),
      nodes[1],
    ];
    onSave({
      ...workflow,
      name,
      description,
      nodes: merged.length >= 2 ? merged : nodes,
      edges: [
        { id: "e_main", from: "n_trigger", to: extras[0]?.id ?? "n_action" },
        ...workflow.edges.filter((e) => e.id !== "e_main"),
      ],
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card className="space-y-2" padding="16px" hover={false}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Workflows
        </p>
        <ul className="space-y-1 text-sm">
          {workflows.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-left"
                style={{
                  color: "var(--agx-text, #f8fafc)",
                  background:
                    w.id === workflow.id
                      ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                      : "transparent",
                }}
                onClick={() => onSelect(w.id)}
              >
                {w.name}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Workflow editor
        </h2>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Architecture supports trigger → condition → action → delay → branch → loop.
          Canvas drag-and-drop can plug into node positions without engine changes.
        </p>
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
            disabled={!canWrite}
          />
        </label>
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
            rows={2}
            disabled={!canWrite}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Trigger
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
              disabled={!canWrite}
            >
              {triggers.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Primary action
            <select
              value={actionType}
              onChange={(e) =>
                setActionType(e.target.value as typeof actionType)
              }
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
              disabled={!canWrite}
            >
              {actions.map((a) => (
                <option key={a.type} value={a.type}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)" }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Execution path preview
          </p>
          <ol className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {workflow.nodes.map((n, i) => (
              <li key={n.id} className="flex items-center gap-2">
                {i > 0 ? <span style={{ color: "var(--agx-text-muted, #94a3b8)" }}>→</span> : null}
                <span
                  className="rounded-lg px-2 py-1 text-xs"
                  style={{
                    background: "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)",
                  }}
                >
                  {n.kind}: {n.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={!canWrite}>
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !canExecute}
            onClick={() => onRun(workflow.id)}
          >
            Run now
          </Button>
        </div>
      </Card>
    </div>
  );
}

function HistoryPanel({
  executions,
  workflows,
  canExecute,
  onRetry,
}: {
  executions: readonly WorkflowExecution[];
  workflows: readonly WorkflowDefinition[];
  canExecute: boolean;
  onRetry: (id: string) => void;
}): JSX.Element {
  const nameOf = (id: string) =>
    workflows.find((w) => w.id === id)?.name ?? id;

  const columns: DataTableColumn<WorkflowExecution>[] = [
    {
      key: "workflow",
      header: "Workflow",
      render: (r) => nameOf(r.workflowId),
    },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "triggeredBy",
      header: "Triggered by",
      render: (r) => r.triggeredBy,
    },
    {
      key: "duration",
      header: "Duration",
      render: (r) => (r.durationMs != null ? `${r.durationMs}ms` : "—"),
    },
    {
      key: "startedAt",
      header: "Started",
      render: (r) => r.startedAt.slice(0, 19).replace("T", " "),
    },
    {
      key: "actions",
      header: "Retry",
      render: (r) =>
        r.status === "failed" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!canExecute}
            onClick={() => onRetry(r.id)}
          >
            Retry
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  const latest = executions[0];

  return (
    <>
      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Execution history
        </h2>
        <DataTable
          columns={columns}
          rows={[...executions]}
          rowKey={(r) => r.id}
          emptyTitle="No executions yet."
          emptyDescription="Run a workflow or publish a domain event."
          minWidth={800}
        />
      </Card>
      {latest ? (
        <Card className="space-y-2" padding="20px" hover={false}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Latest run detail
          </h3>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Path: {latest.path.join(" → ") || "—"}
            {latest.error ? ` · Error: ${latest.error}` : ""}
          </p>
          <ul className="space-y-2 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {latest.steps.map((s, i) => (
              <li key={`${s.nodeId}-${i}`}>
                <strong style={{ color: "var(--agx-text, #f8fafc)" }}>{s.nodeId}</strong>{" "}
                {s.status}
                {s.logs[0] ? ` — ${s.logs[0].message}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function TemplatesPanel({
  templates,
  canWrite,
  onUse,
}: {
  templates: ReturnType<typeof useAutomationEngine>["templates"];
  canWrite: boolean;
  onUse: (id: string) => void;
}): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" id="workflow-templates">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col gap-2" padding="20px" hover={false}>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-accent, #22d3ee)" }}>
            {t.category} · {t.difficulty}
          </p>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t.name}
          </h3>
          <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t.description}
          </p>
          <Button size="sm" disabled={!canWrite} onClick={() => onUse(t.id)}>
            Use template
          </Button>
        </Card>
      ))}
    </div>
  );
}

function AnalyticsPanel({
  analytics,
}: {
  analytics: ReturnType<typeof useAutomationEngine>["analytics"];
}): JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Stat label="Total workflows" value={String(analytics.totalWorkflows)} />
      <Stat label="Active workflows" value={String(analytics.activeWorkflows)} />
      <Stat label="Executions today" value={String(analytics.executionsToday)} />
      <Stat label="Success rate (24h)" value={`${analytics.successRate}%`} />
      <Stat label="Failed (24h)" value={String(analytics.failedLast24h)} />
      <Stat label="Avg duration" value={`${analytics.avgDurationMs}ms`} />
    </div>
  );
}

function SettingsPanel({
  draft,
  canAdmin,
  onChange,
  onSave,
}: {
  draft: WorkflowSettings;
  canAdmin: boolean;
  onChange: (s: WorkflowSettings) => void;
  onSave: () => void;
}): JSX.Element {
  return (
    <Card className="space-y-3" padding="20px" hover={false}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        Automation settings
      </h2>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Retry policy, execution limits, concurrency, timeout, and loggings for
        distributed execution.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumField
          label="Max retry attempts"
          value={draft.retryPolicy.maxAttempts}
          disabled={!canAdmin}
          onChange={(n) =>
            onChange({
              ...draft,
              retryPolicy: { ...draft.retryPolicy, maxAttempts: n },
            })
          }
        />
        <NumField
          label="Backoff (ms)"
          value={draft.retryPolicy.backoffMs}
          disabled={!canAdmin}
          onChange={(n) =>
            onChange({
              ...draft,
              retryPolicy: { ...draft.retryPolicy, backoffMs: n },
            })
          }
        />
        <NumField
          label="Executions / hour"
          value={draft.executionLimitPerHour}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, executionLimitPerHour: n })}
        />
        <NumField
          label="Concurrency limit"
          value={draft.concurrencyLimit}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, concurrencyLimit: n })}
        />
        <NumField
          label="Timeout (ms)"
          value={draft.timeoutMs}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, timeoutMs: n })}
        />
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Log level
          <select
            value={draft.logLevel}
            disabled={!canAdmin}
            onChange={(e) =>
              onChange({
                ...draft,
                logLevel: e.target.value as WorkflowSettings["logLevel"],
              })
            }
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            style={fieldStyle}
          >
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
        </label>
      </div>
      <Button size="sm" disabled={!canAdmin} onClick={onSave}>
        Save settings
      </Button>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card className="space-y-1" padding="16px" hover={false}>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}

function NumField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}): JSX.Element {
  return (
    <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
      {label}
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        style={fieldStyle}
      />
    </label>
  );
}

const fieldStyle = {
  background: "color-mix(in srgb, var(--agx-surface, #0f172a) 80%, transparent)",
  borderColor: "color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
  color: "var(--agx-text, #f8fafc)",
} as const;
