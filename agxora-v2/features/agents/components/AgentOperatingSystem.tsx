"use client";

import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import { catalogCopy, localizeThrownError, useT } from "@/app/lib/i18n";
import type { DataTableColumn } from "@/app/components/ui";
import { agentsStore } from "../store";
import { agentOsService } from "../services";
import { useAgentOperatingSystem, useProductionReadinessFromHealth } from "../hooks";
import { GrowthWorkspace } from "./GrowthWorkspace";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { OperationsWorkspace } from "./OperationsWorkspace";
import { CreativeWorkspace } from "./CreativeWorkspace";
import type {
  AgentApproval,
  AgentExecution,
  AgentId,
  AgentRuntime,
  AgentTask,
  KnowledgeDocument,
  LlmProviderId,
  MemoryRecord,
  StepExecution,
} from "../types";

type TabId =
  | "dashboard"
  | "registry"
  | "marketplace"
  | "monitor"
  | "history"
  | "memory"
  | "knowledge"
  | "tools"
  | "settings"
  | "growth"
  | "website"
  | "social"
  | "campaigns"
  | "creative"
  | "operations";

/**
 * AI Agent Operating System workspace.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function AgentOperatingSystem(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const productionReadiness = useProductionReadinessFromHealth();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [notice, setNotice] = useState(t("agents.noticeDefault"));
  const [busy, setBusy] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [llmDraft, setLlmDraft] = useState<LlmProviderId | null>(null);
  const [supervisorDraft, setSupervisorDraft] = useState<boolean | null>(null);
  const [sensitiveDraft, setSensitiveDraft] = useState<boolean | null>(null);

  useEffect(() => {
    agentsStore.hydrate({ force: false });
  }, []);

  useEffect(() => {
    if (!aos.hydrated) return;
    agentOsService.ensureWorkspace(aos.organizationId);
  }, [aos.hydrated, aos.organizationId]);

  const effectiveSelected =
    selectedInstance ?? aos.runtimes[0]?.instanceId ?? null;

  const llmProvider = llmDraft ?? aos.settings.defaultLlmProvider;
  const enableSupervisor =
    supervisorDraft ?? aos.settings.enableSupervisor;
  const isolateSensitive =
    sensitiveDraft ?? aos.settings.isolateSensitiveTools;

  const tabs: readonly { id: TabId; label: string }[] = [
    { id: "dashboard", label: t("agents.tabs.dashboard") },
    { id: "growth", label: t("agents.tabs.growth") },
    { id: "website", label: t("agents.tabs.website") },
    { id: "social", label: t("agents.tabs.social") },
    { id: "campaigns", label: t("agents.tabs.campaigns") },
    { id: "creative", label: t("agents.tabs.creative") },
    { id: "operations", label: t("agents.tabs.operations") },
    { id: "registry", label: t("agents.tabs.registry") },
    { id: "marketplace", label: t("agents.tabs.marketplace") },
    { id: "monitor", label: t("agents.tabs.monitor") },
    { id: "history", label: t("agents.tabs.history") },
    { id: "memory", label: t("agents.tabs.memory") },
    { id: "knowledge", label: t("agents.tabs.knowledge") },
    { id: "tools", label: t("agents.tabs.tools") },
    { id: "settings", label: t("agents.tabs.settings") },
  ];

  if (!aos.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {t("agents.loading")}
      </div>
    );
  }

  const productionGateBanner =
    productionReadiness.status === "ready" && !productionReadiness.data.ready ? (
      <p
        className="rounded-md border px-3 py-2 text-xs"
        style={{
          color: "var(--agx-danger, #f87171)",
          borderColor:
            "color-mix(in srgb, var(--agx-danger, #f87171) 35%, transparent)",
          background:
            "color-mix(in srgb, var(--agx-danger, #f87171) 8%, transparent)",
        }}
      >
        {productionReadiness.data.publishEnabled && !productionReadiness.data.publishReady
          ? t("agents.productionGate.publishNotReady", {
              codes: productionReadiness.data.publishIssueCodes.join(", "),
            })
          : t("agents.productionGate.notReady", {
              codes: productionReadiness.data.issueCodes.join(", "),
            })}
      </p>
    ) : productionReadiness.status === "error" ? (
      <p
        className="rounded-md border px-3 py-2 text-xs"
        style={{
          color: "var(--agx-text-muted, #94a3b8)",
          borderColor:
            "color-mix(in srgb, var(--agx-text-muted, #94a3b8) 35%, transparent)",
        }}
      >
        {t("agents.productionGate.readinessUnavailable")}
      </p>
    ) : null;

  const onRun = async (instanceId: string, title: string) => {
    setBusy(true);
    try {
      const task = await agentOsService.enqueueTask({
        organizationId: aos.organizationId,
        agentInstanceId: instanceId,
        title,
        goal: title,
      });
      setNotice(
        task.status === "blocked"
          ? t("agents.notice.approvalRequired")
          : t("agents.notice.simulatedRun", {
              status: task.status,
              duration: task.durationMs ?? 0,
            }),
      );
      setTab("history");
    } catch (err) {
      setNotice(localizeThrownError(t, err, "agents.notice.taskFailed"));
    } finally {
      setBusy(false);
    }
  };

  const onInstall = (agentId: AgentId) => {
    const runtime = agentOsService.register(aos.organizationId, agentId, true);
    setSelectedInstance(runtime.instanceId);
    setNotice(t("agents.notice.activated", { agentId }));
    setTab("registry");
  };

  const runtimeColumns: DataTableColumn<AgentRuntime>[] = [
    {
      key: "agent",
      header: t("agents.columns.agent"),
      render: (r) =>
        catalogCopy(
          t,
          `agents.catalog.${r.agentId}.name`,
          aos.agentsWithDefs.find((a) => a.runtime.instanceId === r.instanceId)
            ?.definition?.name ?? r.agentId,
        ),
    },
    {
      key: "status",
      header: t("agents.columns.status"),
      render: (r) => catalogCopy(t, `agents.lifecycle.${r.status}`, r.status),
    },
    {
      key: "health",
      header: t("agents.columns.health"),
      render: (r) => catalogCopy(t, `agents.healthStatus.${r.health}`, r.health),
    },
    {
      key: "queue",
      header: t("agents.columns.queue"),
      render: (r) => String(r.queueDepth),
    },
    {
      key: "usage",
      header: t("agents.columns.usage"),
      render: (r) => String(r.analytics.usageCount),
    },
    {
      key: "actions",
      header: t("agents.columns.actions"),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !r.enabled}
            onClick={() =>
              void onRun(r.instanceId, t("agents.goals.executeBusiness", { agentId: r.agentId }))
            }
          >
            {t("agents.actions.run")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              agentOsService.setStatus(
                r.instanceId,
                r.status === "active" ? "paused" : "active",
              );
              setNotice(
                r.status === "active" ? t("agents.notice.agentPaused") : t("agents.notice.agentActivated"),
              );
            }}
          >
            {r.status === "active" ? t("agents.actions.pause") : t("agents.actions.activate")}
          </Button>
        </div>
      ),
    },
  ];

  const taskColumns: DataTableColumn<AgentTask>[] = [
    { key: "title", header: t("agents.columns.task"), render: (r) => r.title },
    {
      key: "status",
      header: t("agents.columns.status"),
      render: (r) => catalogCopy(t, `agents.taskStatus.${r.status}`, r.status),
    },
    {
      key: "agent",
      header: t("agents.columns.agent"),
      render: (r) => {
        const agentId = aos.agentsWithDefs.find(
          (a) => a.runtime.instanceId === r.agentInstanceId,
        )?.runtime.agentId;
        return agentId
          ? catalogCopy(t, `agents.catalog.${agentId}.name`, agentId)
          : r.agentInstanceId.slice(0, 10);
      },
    },
    {
      key: "duration",
      header: t("agents.columns.duration"),
      render: (r) => (r.durationMs != null ? `${r.durationMs}ms` : t("agents.actions.emDash")),
    },
    {
      key: "created",
      header: t("agents.columns.created"),
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
    {
      key: "actions",
      header: t("agents.columns.actions"),
      render: (r) =>
        r.status === "running" ||
        r.status === "pending" ||
        r.status === "retrying" ||
        r.status === "blocked" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              agentOsService.cancelTask(r.id);
              setNotice(t("agents.notice.taskCancelled"));
            }}
          >
            {t("agents.actions.cancel")}
          </Button>
        ) : (
          t("agents.actions.emDash")
        ),
    },
  ];

  const memoryColumns: DataTableColumn<MemoryRecord>[] = [
    {
      key: "scope",
      header: t("agents.columns.scope"),
      render: (r) => catalogCopy(t, `agents.memoryScope.${r.scope}`, r.scope),
    },
    { key: "key", header: t("agents.columns.key"), render: (r) => r.key },
    {
      key: "value",
      header: t("agents.columns.value"),
      render: (r) => JSON.stringify(r.value).slice(0, 80),
    },
    {
      key: "at",
      header: t("agents.columns.at"),
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
  ];

  const knowledgeColumns: DataTableColumn<KnowledgeDocument>[] = [
    {
      key: "title",
      header: t("agents.columns.title"),
      render: (r) => catalogCopy(t, `agents.knowledgeDocs.${r.kind}.title`, r.title),
    },
    {
      key: "kind",
      header: t("agents.columns.kind"),
      render: (r) => catalogCopy(t, `agents.knowledgeKind.${r.kind}`, r.kind),
    },
    {
      key: "summary",
      header: t("agents.columns.summary"),
      render: (r) =>
        catalogCopy(t, `agents.knowledgeDocs.${r.kind}.summary`, r.summary).slice(0, 72),
    },
  ];

  const executionColumns: DataTableColumn<AgentExecution>[] = [
    {
      key: "goal",
      header: t("agents.columns.goal"),
      render: (execution) => execution.goal,
    },
    {
      key: "lifecycle",
      header: t("agents.columns.lifecycle"),
      render: (execution) =>
        catalogCopy(
          t,
          `agents.executionLifecycle.${execution.lifecycle}`,
          execution.lifecycle,
        ),
    },
    {
      key: "step",
      header: t("agents.columns.step"),
      render: (execution) => execution.currentStepId ?? t("agents.actions.emDash"),
    },
    {
      key: "updated",
      header: t("agents.columns.updated"),
      render: (execution) => execution.updatedAt.slice(0, 19).replace("T", " "),
    },
  ];

  const approvalColumns: DataTableColumn<AgentApproval>[] = [
    {
      key: "action",
      header: t("agents.columns.action"),
      render: (approval) => approval.action,
    },
    {
      key: "approval",
      header: t("agents.columns.approval"),
      render: (approval) =>
        catalogCopy(
          t,
          `agents.approvalState.${approval.state}`,
          approval.state,
        ),
    },
    {
      key: "step",
      header: t("agents.columns.step"),
      render: (approval) => approval.stepId,
    },
    {
      key: "actions",
      header: t("agents.columns.actions"),
      render: (approval) =>
        approval.state === "REQUIRES_APPROVAL" ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void agentOsService
                  .resolveApproval({
                    approvalId: approval.id,
                    state: "APPROVED",
                    decidedBy: aos.userId ?? "local-user",
                  })
                  .then(() => {
                    setNotice(t("agents.notice.approvalApproved"));
                  })
                  .catch((err) => {
                    setNotice(
                      localizeThrownError(t, err, "agents.notice.taskFailed"),
                    );
                  });
              }}
            >
              {t("agents.actions.approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void agentOsService
                  .resolveApproval({
                    approvalId: approval.id,
                    state: "REJECTED",
                    decidedBy: aos.userId ?? "local-user",
                  })
                  .then(() => {
                    setNotice(t("agents.notice.approvalRejected"));
                  })
                  .catch((err) => {
                    setNotice(
                      localizeThrownError(t, err, "agents.notice.taskFailed"),
                    );
                  });
              }}
            >
              {t("agents.actions.reject")}
            </Button>
          </div>
        ) : (
          t("agents.actions.emDash")
        ),
    },
  ];

  const stepExecutionColumns: DataTableColumn<StepExecution>[] = [
    {
      key: "action",
      header: t("agents.columns.action"),
      render: (event) => event.action,
    },
    {
      key: "status",
      header: t("agents.columns.status"),
      render: (event) =>
        catalogCopy(
          t,
          `agents.stepExecutionStatus.${event.status}`,
          event.status,
        ),
    },
    {
      key: "approval",
      header: t("agents.columns.approval"),
      render: (event) =>
        event.approvalState
          ? catalogCopy(
              t,
              `agents.approvalState.${event.approvalState}`,
              event.approvalState,
            )
          : t("agents.actions.emDash"),
    },
    {
      key: "result",
      header: t("agents.columns.result"),
      render: (event) =>
        event.error
          ? event.error
          : JSON.stringify(event.result ?? event.input ?? "").slice(0, 80),
    },
    {
      key: "timestamp",
      header: t("agents.columns.timestamp"),
      render: (event) => event.timestamp.slice(0, 19).replace("T", " "),
    },
  ];

  const selectedRuntime = aos.runtimes.find(
    (r) => r.instanceId === effectiveSelected,
  );
  const supervisor = aos.runtimes.find((r) => r.agentId === "executive_advisor");
  const pendingApprovals = aos.approvals.filter(
    (approval) => approval.state === "REQUIRES_APPROVAL",
  );
  const recentExecutions = [...aos.executions].slice(0, 8);
  const recentEvents = [...aos.stepExecutions].slice(0, 12);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("agents.eyebrow")}
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("agents.title")}
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("agents.subtitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {notice}
        </p>
        {productionGateBanner}
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
          <Link href="/dashboard/ai">
            <Button size="sm" variant="ghost">
              {t("agents.aiChat")}
            </Button>
          </Link>
        </div>
      </Card>

      {tab === "dashboard" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("agents.dashboard.agents")} value={String(aos.metrics.totalAgents)} />
            <Stat label={t("agents.dashboard.active")} value={String(aos.metrics.activeAgents)} />
            <Stat label={t("agents.dashboard.localReady")} value={String(aos.metrics.healthyAgents)} />
            <Stat label={t("agents.dashboard.simulatedToday")} value={String(aos.metrics.tasksToday)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("agents.dashboard.failedToday")} value={String(aos.metrics.failedToday)} />
            <Stat label={t("agents.dashboard.avgExec")} value={`${aos.metrics.avgExecutionMs}ms`} />
            <Stat
              label={t("agents.dashboard.toolCalls")}
              value={String(aos.metrics.toolInvocations24h)}
            />
            <Stat
              label={t("agents.dashboard.pendingApprovals")}
              value={String(pendingApprovals.length)}
            />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.dashboard.activeFleet")}
            </h2>
            <DataTable
              columns={runtimeColumns}
              rows={[...aos.runtimes]}
              rowKey={(r) => r.instanceId}
              emptyTitle={t("agents.dashboard.emptyTitle")}
              emptyDescription={t("agents.dashboard.emptyDescription")}
              minWidth={720}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("agents.history.executionsTitle")}
              </h2>
              <span className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("agents.dashboard.knowledge")}: {aos.knowledge.length}
              </span>
            </div>
            <DataTable
              columns={executionColumns}
              rows={recentExecutions}
              rowKey={(execution) => execution.id}
              emptyTitle={t("agents.history.emptyTitle")}
              emptyDescription={t("agents.history.emptyDescription")}
              minWidth={760}
            />
          </Card>
        </>
      ) : null}

      {tab === "growth" ? <GrowthWorkspace mode="growth" /> : null}
      {tab === "website" ? <GrowthWorkspace mode="website" /> : null}
      {tab === "social" ? <GrowthWorkspace mode="social" /> : null}
      {tab === "campaigns" ? <CampaignWorkspace /> : null}
      {tab === "creative" ? <CreativeWorkspace /> : null}
      {tab === "operations" ? <OperationsWorkspace /> : null}

      {tab === "registry" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="space-y-2" padding="16px" hover={false}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("agents.registry.title")}
            </p>
            <ul className="space-y-1 text-sm">
              {aos.agentsWithDefs.map(({ runtime, definition }) => (
                <li key={runtime.instanceId}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left"
                    style={{
                      color: "var(--agx-text, #f8fafc)",
                      background:
                        runtime.instanceId === effectiveSelected
                          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
                          : "transparent",
                    }}
                    onClick={() => setSelectedInstance(runtime.instanceId)}
                  >
                    <span className="mr-2 font-mono text-[11px] opacity-70">
                      {definition?.avatar ?? "AG"}
                    </span>
                    {catalogCopy(
                      t,
                      `agents.catalog.${runtime.agentId}.name`,
                      definition?.name ?? runtime.agentId,
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            {selectedRuntime ? (
              <>
                <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {catalogCopy(
                    t,
                    `agents.catalog.${selectedRuntime.agentId}.name`,
                    aos.agentsWithDefs.find(
                      (a) => a.runtime.instanceId === selectedRuntime.instanceId,
                    )?.definition?.name ?? selectedRuntime.agentId,
                  )}
                </h2>
                <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {catalogCopy(
                    t,
                    `agents.catalog.${selectedRuntime.agentId}.description`,
                    aos.agentsWithDefs.find(
                      (a) => a.runtime.instanceId === selectedRuntime.instanceId,
                    )?.definition?.description ?? "",
                  )}
                </p>
                <dl className="grid gap-2 text-xs sm:grid-cols-2" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  <div>
                    {t("agents.registry.status", {
                      status: catalogCopy(
                        t,
                        `agents.lifecycle.${selectedRuntime.status}`,
                        selectedRuntime.status,
                      ),
                    })}
                  </div>
                  <div>
                    {t("agents.registry.health", {
                      health: catalogCopy(
                        t,
                        `agents.healthStatus.${selectedRuntime.health}`,
                        selectedRuntime.health,
                      ),
                    })}
                  </div>
                  <div>{t("agents.registry.queue", { queue: selectedRuntime.queueDepth })}</div>
                  <div>{t("agents.registry.usage", { usage: selectedRuntime.analytics.usageCount })}</div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !selectedRuntime.enabled}
                    onClick={() =>
                      void onRun(
                        selectedRuntime.instanceId,
                        t("agents.goals.planAndExecute"),
                      )
                    }
                  >
                    {t("agents.registry.executeTask")}
                  </Button>
                  {supervisor &&
                  supervisor.instanceId !== selectedRuntime.instanceId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        agentOsService.supervise(
                          supervisor.instanceId,
                          selectedRuntime.instanceId,
                          t("agents.os.prioritizeCustomerImpact"),
                        );
                        agentOsService.delegate({
                          fromInstanceId: supervisor.instanceId,
                          toInstanceId: selectedRuntime.instanceId,
                          title: t("agents.os.delegatedFollowUp"),
                          organizationId: aos.organizationId,
                        });
                        setNotice(t("agents.notice.supervisorDelegated"));
                      }}
                    >
                      {t("agents.registry.supervisorDelegate")}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {t("agents.registry.selectPrompt")}
              </p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "marketplace" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {aos.marketplace.map((agent) => {
            const installed = aos.runtimes.some((r) => r.agentId === agent.id);
            return (
              <Card key={agent.id} className="flex flex-col gap-2" padding="20px" hover={false}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold"
                    style={{
                      background:
                        "color-mix(in srgb, var(--agx-accent, #22d3ee) 16%, transparent)",
                      color: "var(--agx-text, #f8fafc)",
                    }}
                  >
                    {agent.avatar}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                      {catalogCopy(t, `agents.catalog.${agent.id}.name`, agent.name)}
                    </h3>
                    <p className="text-[11px]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                      {catalogCopy(t, `agents.categories.${agent.category}`, agent.category)}
                    </p>
                  </div>
                </div>
                <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {catalogCopy(t, `agents.catalog.${agent.id}.description`, agent.description)}
                </p>
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {t("agents.marketplace.tools", {
                    tools: agent.tools
                      .map((id) => catalogCopy(t, `agents.toolsCatalog.${id}.name`, id))
                      .join(", "),
                  })}
                </p>
                <Button
                  size="sm"
                  disabled={installed}
                  onClick={() => onInstall(agent.id)}
                >
                  {installed ? t("agents.marketplace.installed") : t("agents.marketplace.installActivate")}
                </Button>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "monitor" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("agents.monitor.title")}
          </h2>
          <DataTable
            columns={runtimeColumns}
            rows={[...aos.runtimes]}
            rowKey={(r) => r.instanceId}
            emptyTitle={t("agents.monitor.emptyTitle")}
            emptyDescription={t("agents.monitor.emptyDescription")}
            minWidth={720}
          />
          {aos.traces[0] ? (
            <div className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("agents.monitor.latestConfidence", {
                confidence: aos.traces[0].confidence,
                steps: aos.traces[0].steps.slice(0, 2).join(" · "),
              })}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "history" ? (
        <div className="grid gap-4">
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.history.title")}
            </h2>
            <DataTable
              columns={taskColumns}
              rows={[...aos.tasks]}
              rowKey={(r) => r.id}
              emptyTitle={t("agents.history.emptyTitle")}
              emptyDescription={t("agents.history.emptyDescription")}
              minWidth={800}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.history.executionsTitle")}
            </h2>
            <DataTable
              columns={executionColumns}
              rows={[...aos.executions]}
              rowKey={(execution) => execution.id}
              emptyTitle={t("agents.history.emptyTitle")}
              emptyDescription={t("agents.history.emptyDescription")}
              minWidth={760}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.history.approvalsTitle")}
            </h2>
            <DataTable
              columns={approvalColumns}
              rows={pendingApprovals}
              rowKey={(approval) => approval.id}
              emptyTitle={t("agents.history.noApprovalsTitle")}
              emptyDescription={t("agents.history.noApprovalsDescription")}
              minWidth={760}
            />
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              {t("agents.history.auditTitle")}
            </h2>
            <DataTable
              columns={stepExecutionColumns}
              rows={recentEvents}
              rowKey={(event) => event.id}
              emptyTitle={t("agents.history.emptyTitle")}
              emptyDescription={t("agents.history.emptyDescription")}
              minWidth={820}
            />
          </Card>
        </div>
      ) : null}

      {tab === "memory" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("agents.memory.title")}
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.memory.subtitle")}
          </p>
          <DataTable
            columns={memoryColumns}
            rows={[...aos.memories]}
            rowKey={(r) => r.id}
            emptyTitle={t("agents.memory.emptyTitle")}
            emptyDescription={t("agents.memory.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "knowledge" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("agents.knowledge.title")}
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.knowledge.subtitle")}
          </p>
          <DataTable
            columns={knowledgeColumns}
            rows={[...aos.knowledge]}
            rowKey={(r) => r.id}
            emptyTitle={t("agents.knowledge.emptyTitle")}
            emptyDescription={t("agents.knowledge.emptyDescription")}
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "tools" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {aos.tools.map((tool) => (
            <Card key={tool.id} className="space-y-2" padding="20px" hover={false}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {catalogCopy(t, `agents.toolsCatalog.${tool.id}.name`, tool.name)}
              </h3>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {catalogCopy(t, `agents.toolsCatalog.${tool.id}.description`, tool.description)}
              </p>
              <p className="text-[11px]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                {tool.module}
                {tool.sensitive ? t("agents.tools.sensitive") : ""}
                {tool.mcpReady ? t("agents.tools.mcpReady") : ""}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "settings" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {t("agents.settings.title")}
          </h2>
          <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.settings.defaultLlmProvider")}
            <select
              value={llmProvider}
              onChange={(e) => setLlmDraft(e.target.value as LlmProviderId)}
              className="agx-ui-control mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              {aos.llmProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === "local" || p.id === "mcp" || p.id === "custom"
                    ? catalogCopy(t, `agents.llm.${p.id}`, p.displayName)
                    : p.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
            <input
              type="checkbox"
              checked={enableSupervisor}
              onChange={(e) => setSupervisorDraft(e.target.checked)}
            />
            {t("agents.settings.enableSupervisor")}
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
            <input
              type="checkbox"
              checked={isolateSensitive}
              onChange={(e) => setSensitiveDraft(e.target.checked)}
            />
            {t("agents.settings.isolateSensitive")}
          </label>
          <Button
            size="sm"
            onClick={() => {
              agentOsService.saveSettings({
                ...aos.settings,
                defaultLlmProvider: llmProvider,
                enableSupervisor,
                isolateSensitiveTools: isolateSensitive,
              });
              setLlmDraft(null);
              setSupervisorDraft(null);
              setSensitiveDraft(null);
              setNotice(t("agents.notice.settingsUpdated"));
            }}
          >
            {t("agents.settings.saveSettings")}
          </Button>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.settings.providersHint")}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card className="space-y-1" padding="16px" hover={false}>
      <p
        className="text-[11px] uppercase tracking-wide"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </p>
      <p className="text-xl font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </p>
    </Card>
  );
}

