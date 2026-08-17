"use client";

import { useEffect, useMemo, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
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

/**
 * Workflow Automation workspace — modular OS surface.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function AutomationWorkspace(): JSX.Element {
  const t = useT();
  const engine = useAutomationEngine();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState(t("automation.workspace.noticeDefault"));
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

  const tabs: readonly { id: TabId; label: string }[] = [
    { id: "dashboard", label: t("automation.workspace.tabs.dashboard") },
    { id: "workflows", label: t("automation.workspace.tabs.workflows") },
    { id: "editor", label: t("automation.workspace.tabs.editor") },
    { id: "history", label: t("automation.workspace.tabs.history") },
    { id: "templates", label: t("automation.workspace.tabs.templates") },
    { id: "analytics", label: t("automation.workspace.tabs.analytics") },
    { id: "settings", label: t("automation.workspace.tabs.settings") },
  ];

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
      setNotice(t("automation.workspace.notice.missingWrite"));
      return;
    }
    const wf = workflowService.create({
      organizationId: engine.organizationId,
      name: t("automation.workspace.defaults.untitledName"),
      description: t("automation.workspace.defaults.untitledDescription"),
      createdBy: engine.userId ?? undefined,
    });
    setSelectedId(wf.id);
    setTab("editor");
    setNotice(t("automation.workspace.notice.created", { name: wf.name }));
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
    setNotice(t("automation.workspace.notice.templateApplied", { name: wf.name }));
  };

  const onRun = async (workflowId: string) => {
    if (!engine.permissions.canExecute) {
      setNotice(t("automation.workspace.notice.missingExecute"));
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
          ? t("automation.workspace.notice.runResult", {
              status: exec.status,
              duration: exec.durationMs ?? 0,
            })
          : t("automation.workspace.notice.runFailed"),
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
    setNotice(t("automation.workspace.notice.publishedEvent", { type }));
    setTab("history");
  };

  if (!engine.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("automation.workspace.loading")}
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
          {t("automation.workspace.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("automation.workspace.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("automation.workspace.subtitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {tabs.map((tabItem) => (
            <Button
              key={tabItem.id}
              size="sm"
              variant={tab === tabItem.id ? "primary" : "secondary"}
              onClick={() => setTab(tabItem.id)}
            >
              {tabItem.label}
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
            setNotice(t("automation.workspace.notice.workflowStatus", { status }));
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
            setNotice(t("automation.workspace.notice.saved"));
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
              setNotice(exec ? t("automation.workspace.notice.retryResult", { status: exec.status }) : t("automation.workspace.notice.retryFailed"));
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
            setNotice(t("automation.workspace.notice.settingsSaved"));
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
  const t = useT();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("automation.workspace.dashboard.workflows")} value={String(analytics.totalWorkflows)} />
        <Stat label={t("automation.workspace.dashboard.active")} value={String(analytics.activeWorkflows)} />
        <Stat label={t("automation.workspace.dashboard.runsToday")} value={String(analytics.executionsToday)} />
        <Stat label={t("automation.workspace.dashboard.successRate")} value={`${analytics.successRate}%`} />
      </div>
      <Card className="space-y-3" padding="20px" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("automation.workspace.dashboard.recentWorkflows")}
          </h2>
          <Button size="sm" onClick={onCreate}>
            {t("automation.workspace.dashboard.newWorkflow")}
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
          {t("automation.workspace.dashboard.eventBusDemo")}
        </h2>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.workspace.dashboard.eventBusHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "customer.created",
              "project.created",
              "invoice.issued",
              "task.completed",
            ] as const
          ).map((eventType) => (
            <Button key={eventType} size="sm" variant="secondary" onClick={() => onPublishEvent(eventType)}>
              {eventType}
            </Button>
          ))}
        </div>
      </Card>
      {notifications.length > 0 ? (
        <Card className="space-y-2" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("automation.workspace.dashboard.notifications")}
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
  const t = useT();
  const columns: DataTableColumn<WorkflowDefinition>[] = [
    {
      key: "name",
      header: t("automation.workspace.workflowList.columns.name"),
      render: (r) => (
        <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => onOpen(r.id)}>
          {r.name}
        </button>
      ),
    },
    { key: "status", header: t("automation.workspace.workflowList.columns.status"), render: (r) => r.status },
    {
      key: "nodes",
      header: t("automation.workspace.workflowList.columns.nodes"),
      render: (r) => String(r.nodes.length),
    },
    {
      key: "updatedAt",
      header: t("automation.workspace.workflowList.columns.updated"),
      render: (r) => r.updatedAt.slice(0, 10),
    },
    {
      key: "actions",
      header: t("automation.workspace.workflowList.columns.actions"),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" disabled={busy || !canExecute} onClick={() => onRun(r.id)}>
            {t("automation.workspace.workflowList.run")}
          </Button>
          {canWrite ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onStatus(r.id, r.status === "active" ? "disabled" : "active")
              }
            >
              {r.status === "active" ? t("automation.workspace.workflowList.disable") : t("automation.workspace.workflowList.activate")}
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
          {t("automation.workspace.workflowList.title")}
        </h2>
        <Button size="sm" onClick={onCreate} disabled={!canWrite}>
          {t("automation.workspace.workflowList.newWorkflow")}
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={[...workflows]}
        rowKey={(r) => r.id}
        emptyTitle={t("automation.workspace.workflowList.emptyTitle")}
        emptyDescription={t("automation.workspace.workflowList.emptyDescription")}
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
  const t = useT();
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
          {t("automation.workspace.editor.selectPrompt")}
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
        label: triggers.find((tr) => tr.type === triggerType)?.label ?? t("automation.workspace.editor.triggerFallback"),
        position: { x: 80, y: 120 },
        config: { triggerType },
        next: ["n_action"],
      },
      {
        id: "n_action",
        kind: "action",
        label: actions.find((a) => a.type === actionType)?.label ?? t("automation.workspace.editor.actionFallback"),
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
          {t("automation.workspace.editor.workflows")}
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
          {t("automation.workspace.editor.title")}
        </h2>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.workspace.editor.hint")}
        </p>
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.workspace.editor.name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            disabled={!canWrite}
          />
        </label>
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.workspace.editor.description")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            rows={2}
            disabled={!canWrite}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("automation.workspace.editor.trigger")}
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerType)}
              className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
            {t("automation.workspace.editor.primaryAction")}
            <select
              value={actionType}
              onChange={(e) =>
                setActionType(e.target.value as typeof actionType)
              }
              className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
            {t("automation.workspace.editor.executionPath")}
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
            {t("automation.workspace.editor.save")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !canExecute}
            onClick={() => onRun(workflow.id)}
          >
            {t("automation.workspace.editor.runNow")}
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
  const t = useT();
  const nameOf = (id: string) =>
    workflows.find((w) => w.id === id)?.name ?? id;

  const columns: DataTableColumn<WorkflowExecution>[] = [
    {
      key: "workflow",
      header: t("automation.workspace.history.columns.workflow"),
      render: (r) => nameOf(r.workflowId),
    },
    { key: "status", header: t("automation.workspace.history.columns.status"), render: (r) => r.status },
    {
      key: "triggeredBy",
      header: t("automation.workspace.history.columns.triggeredBy"),
      render: (r) => r.triggeredBy,
    },
    {
      key: "duration",
      header: t("automation.workspace.history.columns.duration"),
      render: (r) => (r.durationMs != null ? `${r.durationMs}ms` : t("automation.workspace.history.emDash")),
    },
    {
      key: "startedAt",
      header: t("automation.workspace.history.columns.started"),
      render: (r) => r.startedAt.slice(0, 19).replace("T", " "),
    },
    {
      key: "actions",
      header: t("automation.workspace.history.columns.retry"),
      render: (r) =>
        r.status === "failed" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!canExecute}
            onClick={() => onRetry(r.id)}
          >
            {t("automation.workspace.history.retry")}
          </Button>
        ) : (
          t("automation.workspace.history.emDash")
        ),
    },
  ];

  const latest = executions[0];

  return (
    <>
      <Card className="space-y-3" padding="20px" hover={false}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("automation.workspace.history.title")}
        </h2>
        <DataTable
          columns={columns}
          rows={[...executions]}
          rowKey={(r) => r.id}
          emptyTitle={t("automation.workspace.history.emptyTitle")}
          emptyDescription={t("automation.workspace.history.emptyDescription")}
          minWidth={800}
        />
      </Card>
      {latest ? (
        <Card className="space-y-2" padding="20px" hover={false}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("automation.workspace.history.latestRun")}
          </h3>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("automation.workspace.history.path", {
              path: latest.path.join(" → ") || t("automation.workspace.history.emDash"),
            })}
            {latest.error ? t("automation.workspace.history.error", { error: latest.error }) : ""}
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
  const t = useT();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" id="workflow-templates">
      {templates.map((tpl) => (
        <Card key={tpl.id} className="flex flex-col gap-2" padding="20px" hover={false}>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--agx-accent, #22d3ee)" }}>
            {tpl.category} · {tpl.difficulty}
          </p>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {tpl.name}
          </h3>
          <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {tpl.description}
          </p>
          <Button size="sm" disabled={!canWrite} onClick={() => onUse(tpl.id)}>
            {t("automation.workspace.templates.useTemplate")}
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
  const t = useT();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Stat label={t("automation.workspace.analytics.totalWorkflows")} value={String(analytics.totalWorkflows)} />
      <Stat label={t("automation.workspace.analytics.activeWorkflows")} value={String(analytics.activeWorkflows)} />
      <Stat label={t("automation.workspace.analytics.executionsToday")} value={String(analytics.executionsToday)} />
      <Stat label={t("automation.workspace.analytics.successRate24h")} value={`${analytics.successRate}%`} />
      <Stat label={t("automation.workspace.analytics.failed24h")} value={String(analytics.failedLast24h)} />
      <Stat label={t("automation.workspace.analytics.avgDuration")} value={`${analytics.avgDurationMs}ms`} />
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
  const t = useT();
  return (
    <Card className="space-y-3" padding="20px" hover={false}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {t("automation.workspace.settings.title")}
      </h2>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("automation.workspace.settings.subtitle")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumField
          label={t("automation.workspace.settings.maxRetryAttempts")}
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
          label={t("automation.workspace.settings.backoffMs")}
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
          label={t("automation.workspace.settings.executionsPerHour")}
          value={draft.executionLimitPerHour}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, executionLimitPerHour: n })}
        />
        <NumField
          label={t("automation.workspace.settings.concurrencyLimit")}
          value={draft.concurrencyLimit}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, concurrencyLimit: n })}
        />
        <NumField
          label={t("automation.workspace.settings.timeoutMs")}
          value={draft.timeoutMs}
          disabled={!canAdmin}
          onChange={(n) => onChange({ ...draft, timeoutMs: n })}
        />
        <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("automation.workspace.settings.logLevel")}
          <select
            value={draft.logLevel}
            disabled={!canAdmin}
            onChange={(e) =>
              onChange({
                ...draft,
                logLevel: e.target.value as WorkflowSettings["logLevel"],
              })
            }
            className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="error">{t("automation.workspace.settings.logLevels.error")}</option>
            <option value="warn">{t("automation.workspace.settings.logLevels.warn")}</option>
            <option value="info">{t("automation.workspace.settings.logLevels.info")}</option>
            <option value="debug">{t("automation.workspace.settings.logLevels.debug")}</option>
          </select>
        </label>
      </div>
      <Button size="sm" disabled={!canAdmin} onClick={onSave}>
        {t("automation.workspace.settings.saveSettings")}
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
        className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      />
    </label>
  );
}

