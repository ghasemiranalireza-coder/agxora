"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useOrganization } from "@/app/lib/organization";
import { useOptionalAuth } from "@/app/lib/auth";
import { agentsStore } from "../store";
import { computeAgentOsMetrics } from "../observability";
import { DEFAULT_AGENTS, listMarketplaceAgents } from "../catalog";
import { TOOL_CATALOG } from "../tools";
import { listLlmProviders } from "../llm";
import { agentOsService } from "../services";
import { filterMemory } from "../memory";
import { getAgentDefinition } from "../catalog";

const LOCAL_ORG = "org_local_default";

export function useAgentsOrganizationId(): string {
  const { organization } = useOrganization();
  const auth = useOptionalAuth();
  return (
    organization?.id ??
    auth?.user?.defaultOrganizationId ??
    LOCAL_ORG
  );
}

export function useAgentOperatingSystem() {
  const organizationId = useAgentsOrganizationId();
  const auth = useOptionalAuth();
  const snapshot = useSyncExternalStore(
    (l) => agentsStore.subscribe(l),
    () => agentsStore.getSnapshot(),
    () => agentsStore.getSnapshot(),
  );

  const runtimes = useMemo(
    () =>
      snapshot.runtimes.filter((r) => r.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const tasks = useMemo(
    () => snapshot.tasks.filter((t) => t.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const executions = useMemo(
    () =>
      snapshot.executions.filter((execution) =>
        execution.organizationId === organizationId,
      ),
    [organizationId, snapshot],
  );

  const approvals = useMemo(
    () =>
      snapshot.approvals.filter((approval) =>
        approval.organizationId === organizationId,
      ),
    [organizationId, snapshot],
  );

  const stepExecutions = useMemo(
    () =>
      snapshot.stepExecutions.filter((event) =>
        event.organizationId === organizationId,
      ),
    [organizationId, snapshot],
  );

  const memories = useMemo(
    () =>
      filterMemory(snapshot.memories, { organizationId }),
    [organizationId, snapshot],
  );

  const knowledge = useMemo(
    () =>
      snapshot.knowledge.filter((k) => k.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const plans = useMemo(
    () => snapshot.plans.filter((p) => p.organizationId === organizationId),
    [organizationId, snapshot],
  );

  const traces = useMemo(
    () =>
      snapshot.traces.filter((t) =>
        tasks.some((task) => task.id === t.taskId),
      ),
    [snapshot.traces, tasks],
  );

  const messages = useMemo(() => snapshot.messages, [snapshot.messages]);

  const metrics = useMemo(
    () =>
      computeAgentOsMetrics(
        runtimes,
        tasks,
        snapshot.toolInvocationCount24h,
      ),
    [runtimes, tasks, snapshot.toolInvocationCount24h],
  );

  const agentsWithDefs = useMemo(
    () =>
      runtimes.map((r) => ({
        runtime: r,
        definition: getAgentDefinition(r.agentId) ?? null,
      })),
    [runtimes],
  );

  return {
    hydrated: snapshot.hydrated,
    organizationId,
    userId: auth?.userId ?? null,
    catalog: DEFAULT_AGENTS,
    marketplace: listMarketplaceAgents(),
    runtimes,
    agentsWithDefs,
    tasks,
    executions,
    approvals,
    stepExecutions,
    memories,
    knowledge,
    plans,
    traces,
    messages,
    tools: TOOL_CATALOG,
    llmProviders: listLlmProviders(),
    metrics,
    settings: agentOsService.getSettings(organizationId),
    context:
      snapshot.contexts.find((c) => c.organizationId === organizationId) ??
      null,
  };
}
