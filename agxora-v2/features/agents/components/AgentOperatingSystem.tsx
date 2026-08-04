"use client";

import Link from "next/link";
import { useEffect, useState, type JSX } from "react";
import { Button, Card, DataTable } from "@/app/components/ui";
import type { DataTableColumn } from "@/app/components/ui";
import { agentsStore } from "../store";
import { agentOsService } from "../services";
import { useAgentOperatingSystem } from "../hooks";
import type {
  AgentId,
  AgentRuntime,
  AgentTask,
  KnowledgeDocument,
  LlmProviderId,
  MemoryRecord,
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
  | "settings";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "registry", label: "Registry" },
  { id: "marketplace", label: "Marketplace" },
  { id: "monitor", label: "Monitor" },
  { id: "history", label: "History" },
  { id: "memory", label: "Memory" },
  { id: "knowledge", label: "Knowledge" },
  { id: "tools", label: "Tools" },
  { id: "settings", label: "Settings" },
];

/**
 * AI Agent Operating System workspace.
 * Does not alter dashboard shell (layout / sidebar / header).
 */
export function AgentOperatingSystem(): JSX.Element {
  const aos = useAgentOperatingSystem();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [notice, setNotice] = useState(
    "Agents are first-class citizens — execution is independent from UI chrome.",
  );
  const [busy, setBusy] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [llmDraft, setLlmDraft] = useState<LlmProviderId | null>(null);
  const [supervisorDraft, setSupervisorDraft] = useState<boolean | null>(null);
  const [sensitiveDraft, setSensitiveDraft] = useState<boolean | null>(null);

  useEffect(() => {
    agentsStore.hydrate();
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

  if (!aos.hydrated) {
    return (
      <div
        className="py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading Agent Operating System…
      </div>
    );
  }

  const onRun = async (instanceId: string, title: string) => {
    setBusy(true);
    try {
      const task = await agentOsService.enqueueTask({
        organizationId: aos.organizationId,
        agentInstanceId: instanceId,
        title,
        goal: title,
      });
      setNotice(`Task ${task.status} (${task.durationMs ?? 0}ms)`);
      setTab("history");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Task failed");
    } finally {
      setBusy(false);
    }
  };

  const onInstall = (agentId: AgentId) => {
    const runtime = agentOsService.register(aos.organizationId, agentId, true);
    setSelectedInstance(runtime.instanceId);
    setNotice(`Activated ${agentId}`);
    setTab("registry");
  };

  const runtimeColumns: DataTableColumn<AgentRuntime>[] = [
    {
      key: "agent",
      header: "Agent",
      render: (r) =>
        aos.agentsWithDefs.find((a) => a.runtime.instanceId === r.instanceId)
          ?.definition?.name ?? r.agentId,
    },
    { key: "status", header: "Status", render: (r) => r.status },
    { key: "health", header: "Health", render: (r) => r.health },
    {
      key: "queue",
      header: "Queue",
      render: (r) => String(r.queueDepth),
    },
    {
      key: "usage",
      header: "Usage",
      render: (r) => String(r.analytics.usageCount),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !r.enabled}
            onClick={() =>
              void onRun(r.instanceId, `Execute ${r.agentId} business goal`)
            }
          >
            Run
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
                r.status === "active" ? "Agent paused" : "Agent activated",
              );
            }}
          >
            {r.status === "active" ? "Pause" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  const taskColumns: DataTableColumn<AgentTask>[] = [
    { key: "title", header: "Task", render: (r) => r.title },
    { key: "status", header: "Status", render: (r) => r.status },
    {
      key: "agent",
      header: "Agent",
      render: (r) =>
        aos.agentsWithDefs.find(
          (a) => a.runtime.instanceId === r.agentInstanceId,
        )?.definition?.name ?? r.agentInstanceId.slice(0, 10),
    },
    {
      key: "duration",
      header: "Duration",
      render: (r) => (r.durationMs != null ? `${r.durationMs}ms` : "—"),
    },
    {
      key: "created",
      header: "Created",
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "running" || r.status === "pending" || r.status === "retrying" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              agentOsService.cancelTask(r.id);
              setNotice("Task cancelled");
            }}
          >
            Cancel
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  const memoryColumns: DataTableColumn<MemoryRecord>[] = [
    { key: "scope", header: "Scope", render: (r) => r.scope },
    { key: "key", header: "Key", render: (r) => r.key },
    {
      key: "value",
      header: "Value",
      render: (r) => JSON.stringify(r.value).slice(0, 80),
    },
    {
      key: "at",
      header: "At",
      render: (r) => r.createdAt.slice(0, 19).replace("T", " "),
    },
  ];

  const knowledgeColumns: DataTableColumn<KnowledgeDocument>[] = [
    { key: "title", header: "Title", render: (r) => r.title },
    { key: "kind", header: "Kind", render: (r) => r.kind },
    {
      key: "summary",
      header: "Summary",
      render: (r) => r.summary.slice(0, 72),
    },
  ];

  const selectedRuntime = aos.runtimes.find(
    (r) => r.instanceId === effectiveSelected,
  );
  const supervisor = aos.runtimes.find((r) => r.agentId === "executive_advisor");

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          AI Agent Operating System
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Agent OS
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Autonomous enterprise intelligence — agents reason, plan, collaborate,
          and execute across CRM, Projects, Finance, Workflows, and Integrations.
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
          <Link href="/dashboard/ai">
            <Button size="sm" variant="ghost">
              AI Chat
            </Button>
          </Link>
        </div>
      </Card>

      {tab === "dashboard" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Agents" value={String(aos.metrics.totalAgents)} />
            <Stat label="Active" value={String(aos.metrics.activeAgents)} />
            <Stat label="Healthy" value={String(aos.metrics.healthyAgents)} />
            <Stat label="Tasks today" value={String(aos.metrics.tasksToday)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Failed today" value={String(aos.metrics.failedToday)} />
            <Stat label="Avg exec" value={`${aos.metrics.avgExecutionMs}ms`} />
            <Stat
              label="Tool calls"
              value={String(aos.metrics.toolInvocations24h)}
            />
            <Stat label="Knowledge" value={String(aos.knowledge.length)} />
          </div>
          <Card className="space-y-3" padding="20px" hover={false}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
              Active fleet
            </h2>
            <DataTable
              columns={runtimeColumns}
              rows={[...aos.runtimes]}
              rowKey={(r) => r.instanceId}
              emptyTitle="No agents active"
              emptyDescription="Install or activate an agent from the marketplace to start autonomous runs."
              minWidth={720}
            />
          </Card>
        </>
      ) : null}

      {tab === "registry" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="space-y-2" padding="16px" hover={false}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Registry
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
                    {definition?.name ?? runtime.agentId}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-3" padding="20px" hover={false}>
            {selectedRuntime ? (
              <>
                <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                  {aos.agentsWithDefs.find(
                    (a) => a.runtime.instanceId === selectedRuntime.instanceId,
                  )?.definition?.name ?? selectedRuntime.agentId}
                </h2>
                <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {
                    aos.agentsWithDefs.find(
                      (a) => a.runtime.instanceId === selectedRuntime.instanceId,
                    )?.definition?.description
                  }
                </p>
                <dl className="grid gap-2 text-xs sm:grid-cols-2" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  <div>Status: {selectedRuntime.status}</div>
                  <div>Health: {selectedRuntime.health}</div>
                  <div>Queue: {selectedRuntime.queueDepth}</div>
                  <div>Usage: {selectedRuntime.analytics.usageCount}</div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !selectedRuntime.enabled}
                    onClick={() =>
                      void onRun(
                        selectedRuntime.instanceId,
                        "Plan and execute a workspace business goal",
                      )
                    }
                  >
                    Execute task
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
                          "Prioritize customer impact",
                        );
                        agentOsService.delegate({
                          fromInstanceId: supervisor.instanceId,
                          toInstanceId: selectedRuntime.instanceId,
                          title: "Delegated follow-up",
                          organizationId: aos.organizationId,
                        });
                        setNotice("Supervisor delegated a follow-up");
                      }}
                    >
                      Supervisor delegate
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Select an agent from the registry.
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
                      {agent.name}
                    </h3>
                    <p className="text-[11px]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                      {agent.category}
                    </p>
                  </div>
                </div>
                <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  {agent.description}
                </p>
                <p className="text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                  Tools: {agent.tools.join(", ")}
                </p>
                <Button
                  size="sm"
                  disabled={installed}
                  onClick={() => onInstall(agent.id)}
                >
                  {installed ? "Installed" : "Install & activate"}
                </Button>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "monitor" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Agent monitor
          </h2>
          <DataTable
            columns={runtimeColumns}
            rows={[...aos.runtimes]}
            rowKey={(r) => r.instanceId}
            emptyTitle="No agents to monitor"
            emptyDescription="Activate agents from the marketplace."
            minWidth={720}
          />
          {aos.traces[0] ? (
            <div className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              Latest reasoning confidence: {aos.traces[0].confidence} —{" "}
              {aos.traces[0].steps.slice(0, 2).join(" · ")}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "history" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Execution history
          </h2>
          <DataTable
            columns={taskColumns}
            rows={[...aos.tasks]}
            rowKey={(r) => r.id}
            emptyTitle="No executions yet"
            emptyDescription="Run an agent task from the registry or monitor."
            minWidth={800}
          />
        </Card>
      ) : null}

      {tab === "memory" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Memory center
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Working · Conversation · Business · Long-term · Workspace · Agent
            scopes (architecture-ready).
          </p>
          <DataTable
            columns={memoryColumns}
            rows={[...aos.memories]}
            rowKey={(r) => r.id}
            emptyTitle="No memory records"
            emptyDescription="Execute a task to populate working/agent memory."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "knowledge" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Knowledge center
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Company, documents, projects, CRM, policies, procedures — plus vector/RAG
            placeholders.
          </p>
          <DataTable
            columns={knowledgeColumns}
            rows={[...aos.knowledge]}
            rowKey={(r) => r.id}
            emptyTitle="No knowledge docs"
            emptyDescription="Seed knowledge appears after workspace bootstrap."
            minWidth={720}
          />
        </Card>
      ) : null}

      {tab === "tools" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {aos.tools.map((tool) => (
            <Card key={tool.id} className="space-y-2" padding="20px" hover={false}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {tool.name}
              </h3>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {tool.description}
              </p>
              <p className="text-[11px]" style={{ color: "var(--agx-accent, #22d3ee)" }}>
                {tool.module}
                {tool.sensitive ? " · sensitive" : ""}
                {tool.mcpReady ? " · MCP-ready" : ""}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "settings" ? (
        <Card className="space-y-3" padding="20px" hover={false}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            Agent OS settings
          </h2>
          <label className="block text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Default LLM provider
            <select
              value={llmProvider}
              onChange={(e) => setLlmDraft(e.target.value as LlmProviderId)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              style={fieldStyle}
            >
              {aos.llmProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
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
            Enable supervisor agent architecture
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
            <input
              type="checkbox"
              checked={isolateSensitive}
              onChange={(e) => setSensitiveDraft(e.target.checked)}
            />
            Isolate sensitive tools
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
              setNotice("Agent OS settings saved");
            }}
          >
            Save settings
          </Button>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Providers ready: OpenAI, Azure OpenAI, Anthropic, Gemini, Local, Ollama,
            MCP, Custom. Swap adapters via registerLlmProvider without UI changes.
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

const fieldStyle = {
  background:
    "color-mix(in srgb, var(--agx-surface, #0f172a) 80%, transparent)",
  borderColor:
    "color-mix(in srgb, var(--agx-border, #334155) 70%, transparent)",
  color: "var(--agx-text, #f8fafc)",
} as const;
