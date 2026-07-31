/**
 * Agent Operating System service — lifecycle, tasks, tools, orchestration.
 * UI-independent; queue-ready execution pipeline.
 */

import { DEFAULT_AGENTS, getAgentDefinition } from "../catalog";
import { invokeTool } from "../tools";
import { createMemoryRecord } from "../memory";
import { retrieveKnowledge, seedKnowledge } from "../knowledge";
import { decomposeGoal, markStepStatus, nextExecutableSteps } from "../planning";
import { buildReasoningTrace } from "../reasoning";
import { createAgentMessage } from "../orchestration";
import { createContextBundle } from "../context";
import { getLlmProvider } from "../llm";
import { assertToolAllowed, assertWorkspaceIsolation } from "../security";
import { agentsStore } from "../store";
import type {
  AgentId,
  AgentMessage,
  AgentOsSettings,
  AgentRuntime,
  AgentTask,
} from "../types";
import { DEFAULT_AGENT_OS_SETTINGS, EMPTY_ANALYTICS } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const agentOsService = {
  ensureWorkspace(organizationId: string): void {
    agentsStore.hydrate();
    if (!agentsStore.getSettings(organizationId)) {
      agentsStore.setSettings({
        organizationId,
        ...DEFAULT_AGENT_OS_SETTINGS,
      });
    }
    const snap = agentsStore.getSnapshot();
    if (!snap.knowledge.some((k) => k.organizationId === organizationId)) {
      agentsStore.setKnowledge([
        ...snap.knowledge,
        ...seedKnowledge(organizationId),
      ]);
    }
    if (!snap.contexts.some((c) => c.organizationId === organizationId)) {
      agentsStore.upsertContext(
        createContextBundle({ organizationId, business: { name: "AGXORA" } }),
      );
    }
    if (!snap.runtimes.some((r) => r.organizationId === organizationId)) {
      for (const id of [
        "executive_advisor",
        "crm_assistant",
        "workflow_coordinator",
      ] as const) {
        this.register(organizationId, id, true);
      }
    }
  },

  listCatalog() {
    return DEFAULT_AGENTS;
  },

  listRuntimes(organizationId: string): readonly AgentRuntime[] {
    return agentsStore
      .getSnapshot()
      .runtimes.filter((r) => r.organizationId === organizationId);
  },

  register(
    organizationId: string,
    agentId: AgentId,
    activate = false,
  ): AgentRuntime {
    const def = getAgentDefinition(agentId);
    if (!def) throw new Error(`Unknown agent: ${agentId}`);
    const existing = this.listRuntimes(organizationId).find(
      (r) => r.agentId === agentId,
    );
    if (existing) {
      if (activate && existing.status !== "active") {
        return this.setStatus(existing.instanceId, "active");
      }
      return existing;
    }
    const runtime: AgentRuntime = {
      instanceId: createId("ainst"),
      organizationId,
      agentId,
      status: activate ? "active" : "registered",
      health: "healthy",
      enabled: activate,
      queueDepth: 0,
      lastHeartbeatAt: nowIso(),
      analytics: { ...EMPTY_ANALYTICS },
      config: {},
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    agentsStore.upsertRuntime(runtime);
    return runtime;
  },

  setStatus(
    instanceId: string,
    status: AgentRuntime["status"],
  ): AgentRuntime {
    const runtime = agentsStore
      .getSnapshot()
      .runtimes.find((r) => r.instanceId === instanceId);
    if (!runtime) throw new Error("Agent instance not found");
    const next: AgentRuntime = {
      ...runtime,
      status,
      enabled: status === "active",
      health: status === "error" ? "degraded" : runtime.health,
      updatedAt: nowIso(),
      lastHeartbeatAt: nowIso(),
    };
    agentsStore.upsertRuntime(next);
    return next;
  },

  getSettings(organizationId: string): AgentOsSettings {
    return (
      agentsStore.getSettings(organizationId) ?? {
        organizationId,
        ...DEFAULT_AGENT_OS_SETTINGS,
      }
    );
  },

  saveSettings(settings: AgentOsSettings): void {
    agentsStore.setSettings(settings);
  },

  async enqueueTask(input: {
    readonly organizationId: string;
    readonly agentInstanceId: string;
    readonly title: string;
    readonly goal?: string;
    readonly payload?: Readonly<Record<string, unknown>>;
  }): Promise<AgentTask> {
    const runtime = agentsStore
      .getSnapshot()
      .runtimes.find((r) => r.instanceId === input.agentInstanceId);
    if (!runtime) throw new Error("Agent instance not found");
    assertWorkspaceIsolation(input.organizationId, runtime.organizationId);
    if (!runtime.enabled || runtime.status === "paused") {
      throw new Error("Agent is not active");
    }

    const task: AgentTask = {
      id: createId("atask"),
      organizationId: input.organizationId,
      agentInstanceId: input.agentInstanceId,
      title: input.title,
      status: "pending",
      priority: 1,
      input: {
        goal: input.goal ?? input.title,
        ...(input.payload ?? {}),
      },
      attempt: 1,
      maxAttempts: 3,
      createdAt: nowIso(),
    };
    agentsStore.upsertTask(task);
    agentsStore.upsertRuntime({
      ...runtime,
      queueDepth: runtime.queueDepth + 1,
      updatedAt: nowIso(),
    });
    return this.executeTask(task.id);
  },

  async executeTask(taskId: string): Promise<AgentTask> {
    const snap = agentsStore.getSnapshot();
    let task = snap.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error("Task not found");
    const runtime = snap.runtimes.find(
      (r) => r.instanceId === task!.agentInstanceId,
    );
    if (!runtime) throw new Error("Agent missing");
    const def = getAgentDefinition(runtime.agentId);
    if (!def) throw new Error("Agent definition missing");
    const settings = this.getSettings(task.organizationId);

    task = {
      ...task,
      status: "running",
      startedAt: nowIso(),
    };
    agentsStore.upsertTask(task);

    try {
      const goal = String(task.input.goal ?? task.title);
      let plan = decomposeGoal({
        organizationId: task.organizationId,
        agentInstanceId: task.agentInstanceId,
        goal,
      });
      agentsStore.upsertPlan(plan);

      const knowledgeHits = retrieveKnowledge(
        snap.knowledge.filter((k) => k.organizationId === task!.organizationId),
        goal,
        def.knowledgeSources,
      );

      const trace = buildReasoningTrace({
        taskId: task.id,
        goal,
        observations: knowledgeHits
          .slice(0, 3)
          .map((k) => `Knowledge: ${k.title}`),
      });
      agentsStore.pushTrace(trace);

      const llm = getLlmProvider(settings.defaultLlmProvider);
      const completion = await llm.complete({
        providerId: settings.defaultLlmProvider,
        system: def.instructions,
        prompt: `Goal: ${goal}\nKnowledge: ${knowledgeHits
          .map((k) => k.title)
          .join(", ")}`,
      });

      const toolOutputs: unknown[] = [];
      for (const step of nextExecutableSteps(plan)) {
        const toolId = def.tools[0];
        if (toolId) {
          assertToolAllowed(def, toolId, settings);
          const result = await invokeTool(toolId, {
            organizationId: task.organizationId,
            agentInstanceId: task.agentInstanceId,
            taskId: task.id,
            params: { step: step.title, goal },
          });
          agentsStore.bumpToolInvocations();
          if (!result.ok) throw new Error(result.error ?? "Tool failed");
          toolOutputs.push(result.output);
        }
        plan = markStepStatus(plan, step.id, "completed");
        agentsStore.upsertPlan(plan);
      }

      for (const step of plan.steps.filter((s) => s.status === "pending")) {
        plan = markStepStatus(plan, step.id, "completed");
      }
      agentsStore.upsertPlan(plan);

      agentsStore.pushMemory(
        createMemoryRecord({
          organizationId: task.organizationId,
          agentInstanceId: task.agentInstanceId,
          scope: "working",
          key: `task:${task.id}`,
          value: { goal, completion: completion.text },
        }),
      );
      agentsStore.pushMemory(
        createMemoryRecord({
          organizationId: task.organizationId,
          agentInstanceId: task.agentInstanceId,
          scope: "agent",
          key: "last_goal",
          value: goal,
        }),
      );

      const finishedAt = nowIso();
      const durationMs = Date.parse(finishedAt) - Date.parse(task.startedAt!);
      task = {
        ...task,
        status: "completed",
        finishedAt,
        durationMs,
        output: {
          completion: completion.text,
          confidence: trace.confidence,
          tools: toolOutputs,
          planId: plan.id,
        },
      };
      agentsStore.upsertTask(task);

      const completed = runtime.analytics.tasksCompleted + 1;
      const usageCount = runtime.analytics.usageCount + 1;
      const avgExecutionMs = Math.round(
        (runtime.analytics.avgExecutionMs * runtime.analytics.tasksCompleted +
          durationMs) /
          completed,
      );
      agentsStore.upsertRuntime({
        ...runtime,
        queueDepth: Math.max(0, runtime.queueDepth - 1),
        lastHeartbeatAt: nowIso(),
        health: "healthy",
        analytics: {
          ...runtime.analytics,
          tasksCompleted: completed,
          usageCount,
          avgExecutionMs,
          errorRate:
            Math.round(
              (runtime.analytics.tasksFailed /
                Math.max(1, completed + runtime.analytics.tasksFailed)) *
                1000,
            ) / 1000,
        },
        updatedAt: nowIso(),
      });
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Task failed";
      if (task.attempt < task.maxAttempts) {
        task = {
          ...task,
          status: "retrying",
          attempt: task.attempt + 1,
          error: message,
        };
        agentsStore.upsertTask(task);
        return this.executeTask(task.id);
      }
      task = {
        ...task,
        status: "failed",
        error: message,
        finishedAt: nowIso(),
        durationMs: task.startedAt
          ? Date.now() - Date.parse(task.startedAt)
          : undefined,
      };
      agentsStore.upsertTask(task);
      agentsStore.upsertRuntime({
        ...runtime,
        queueDepth: Math.max(0, runtime.queueDepth - 1),
        health: "degraded",
        analytics: {
          ...runtime.analytics,
          tasksFailed: runtime.analytics.tasksFailed + 1,
          usageCount: runtime.analytics.usageCount + 1,
        },
        updatedAt: nowIso(),
      });
      return task;
    }
  },

  cancelTask(taskId: string): AgentTask | null {
    const task = agentsStore.getSnapshot().tasks.find((t) => t.id === taskId);
    if (!task) return null;
    if (task.status === "completed" || task.status === "cancelled") return task;
    const next: AgentTask = {
      ...task,
      status: "cancelled",
      finishedAt: nowIso(),
    };
    agentsStore.upsertTask(next);
    return next;
  },

  delegate(input: {
    readonly fromInstanceId: string;
    readonly toInstanceId: string;
    readonly title: string;
    readonly organizationId: string;
  }): AgentMessage {
    const message = createAgentMessage({
      fromInstanceId: input.fromInstanceId,
      toInstanceId: input.toInstanceId,
      type: "delegate",
      payload: { title: input.title },
    });
    agentsStore.pushMemory(
      createMemoryRecord({
        organizationId: input.organizationId,
        agentInstanceId: input.fromInstanceId,
        scope: "conversation",
        key: `delegate:${message.id}`,
        value: message,
      }),
    );
    agentsStore.pushMessage(message);
    return message;
  },

  supervise(
    supervisorInstanceId: string,
    workerInstanceId: string,
    note: string,
  ): AgentMessage {
    const message = createAgentMessage({
      fromInstanceId: supervisorInstanceId,
      toInstanceId: workerInstanceId,
      type: "supervise",
      payload: { note },
    });
    agentsStore.pushMessage(message);
    return message;
  },
};
