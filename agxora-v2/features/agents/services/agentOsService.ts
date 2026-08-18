/**
 * Agent Operating System service — bounded execution lifecycle, approvals,
 * audit events, and minimal API-ready orchestration.
 */

import { auditLog } from "@/app/lib/backend/audit/logger";
import { DEFAULT_AGENTS, getAgentDefinition } from "../catalog";
import {
  createApproval,
  createExecution,
  createStepExecution,
  resolveApproval as finalizeApproval,
  updateExecutionLifecycle,
} from "../execution";
import { createContextBundle } from "../context";
import { retrieveKnowledge, seedKnowledge } from "../knowledge";
import { getLlmProvider } from "../llm";
import { createMemoryRecord } from "../memory";
import { createAgentMessage } from "../orchestration";
import {
  decomposeGoal,
  markStepStatus,
  validatePlan,
} from "../planning";
import { buildReasoningTrace } from "../reasoning";
import { assertToolAllowed, assertWorkspaceIsolation } from "../security";
import { agentsStore } from "../store";
import { getToolDefinition, invokeTool } from "../tools";
import type {
  AgentApproval,
  AgentExecution,
  AgentId,
  AgentMessage,
  AgentOsSettings,
  AgentPlan,
  AgentRuntime,
  AgentTask,
  StepExecution,
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

function majorAudit(
  action: string,
  execution: AgentExecution,
  metadata?: Readonly<Record<string, string>>,
): void {
  auditLog({
    action,
    resource: "agent_execution",
    resourceId: execution.id,
    organizationId: execution.organizationId,
    metadata,
  });
}

function lifecycleEvent(
  execution: AgentExecution,
  action: string,
  status: StepExecution["status"],
  input?: unknown,
  result?: unknown,
  error?: string,
): StepExecution {
  return createStepExecution({
    organizationId: execution.organizationId,
    agentInstanceId: execution.agentInstanceId,
    executionId: execution.id,
    taskId: execution.taskId,
    planId: execution.planId,
    stepId: execution.currentStepId,
    action,
    status,
    input,
    result,
    error,
  });
}

function getExecutionOutputs(executionId: string): readonly unknown[] {
  return agentsStore
    .getSnapshot()
    .stepExecutions.filter(
      (event) =>
        event.executionId === executionId &&
        event.status === "COMPLETED" &&
        typeof event.result !== "undefined" &&
        typeof event.toolId === "string",
    )
    .map((event) => event.result);
}

function isTerminalLifecycle(lifecycle: AgentExecution["lifecycle"]): boolean {
  return (
    lifecycle === "COMPLETED" ||
    lifecycle === "FAILED" ||
    lifecycle === "CANCELLED"
  );
}

function nextExecution(
  task: AgentTask,
  goal: string,
): AgentExecution {
  const snap = agentsStore.getSnapshot();
  const current =
    (task.executionId
      ? snap.executions.find((execution) => execution.id === task.executionId)
      : undefined) ??
    snap.executions.find((execution) => execution.taskId === task.id);
  if (current && !isTerminalLifecycle(current.lifecycle)) {
    return current;
  }
  const created = createExecution({
    organizationId: task.organizationId,
    agentInstanceId: task.agentInstanceId,
    taskId: task.id,
    goal,
  });
  agentsStore.upsertExecution(created);
  const nextTask: AgentTask = {
    ...task,
    executionId: created.id,
  };
  agentsStore.upsertTask(nextTask);
  majorAudit("agent.execution.created", created, {
    taskId: task.id,
    goal,
  });
  return created;
}

function updateExecution(execution: AgentExecution): AgentExecution {
  agentsStore.upsertExecution(execution);
  return execution;
}

function recordEvent(event: StepExecution): void {
  agentsStore.pushStepExecution(event);
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

  listExecutions(organizationId: string): readonly AgentExecution[] {
    return agentsStore
      .getSnapshot()
      .executions.filter((execution) => execution.organizationId === organizationId);
  },

  listApprovals(organizationId: string): readonly AgentApproval[] {
    return agentsStore
      .getSnapshot()
      .approvals.filter((approval) => approval.organizationId === organizationId);
  },

  listStepExecutions(organizationId: string): readonly StepExecution[] {
    return agentsStore
      .getSnapshot()
      .stepExecutions.filter((event) => event.organizationId === organizationId);
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
    this.ensureWorkspace(input.organizationId);
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
    const foundTask = agentsStore
      .getSnapshot()
      .tasks.find((item) => item.id === taskId);
    if (!foundTask) throw new Error("Task not found");
    let task: AgentTask = foundTask;
    this.ensureWorkspace(task.organizationId);

    const runtime = agentsStore
      .getSnapshot()
      .runtimes.find((r) => r.instanceId === task.agentInstanceId);
    if (!runtime) throw new Error("Agent missing");
    const def = getAgentDefinition(runtime.agentId);
    if (!def) throw new Error("Agent definition missing");
    const settings = this.getSettings(task.organizationId);
    const goal = String(task.input.goal ?? task.title);

    let execution = nextExecution(task, goal);
    task =
      agentsStore.getSnapshot().tasks.find((item) => item.id === taskId) ?? task;

    task = {
      ...task,
      status: "running",
      startedAt: task.startedAt ?? nowIso(),
      executionId: execution.id,
      error: undefined,
    };
    agentsStore.upsertTask(task);

    try {
      let plan: AgentPlan | undefined =
        (task.planId
          ? agentsStore
              .getSnapshot()
              .plans.find((candidate) => candidate.id === task.planId)
          : undefined) ??
        undefined;

      if (!plan) {
        execution = updateExecution(
          updateExecutionLifecycle(execution, "UNDERSTAND"),
        );
        recordEvent(
          lifecycleEvent(execution, "UNDERSTAND", "COMPLETED", {
            goal,
          }),
        );
        majorAudit("agent.execution.understand", execution, { goal });

        const knowledgeHits = retrieveKnowledge(
          agentsStore
            .getSnapshot()
            .knowledge.filter((k) => k.organizationId === task.organizationId),
          goal,
          def.knowledgeSources,
        );
        const trace = buildReasoningTrace({
          taskId: task.id,
          goal,
          observations: knowledgeHits
            .slice(0, 3)
            .map((doc) => `Knowledge: ${doc.title}`),
        });
        agentsStore.pushTrace(trace);

        execution = updateExecution(
          updateExecutionLifecycle(execution, "PLAN"),
        );
        recordEvent(
          lifecycleEvent(execution, "PLAN", "RUNNING", {
            goal,
            agentId: runtime.agentId,
          }),
        );
        plan = decomposeGoal({
          organizationId: task.organizationId,
          agentInstanceId: task.agentInstanceId,
          taskId: task.id,
          goal,
          toolId: def.tools[0],
        });
        const planErrors = validatePlan(plan);
        if (planErrors.length > 0) {
          throw new Error(planErrors.join("; "));
        }
        agentsStore.upsertPlan(plan);
        task = {
          ...task,
          planId: plan.id,
        };
        agentsStore.upsertTask(task);
        execution = updateExecution({
          ...execution,
          planId: plan.id,
          updatedAt: nowIso(),
        });
        recordEvent(
          lifecycleEvent(execution, "PLAN", "COMPLETED", undefined, {
            steps: plan.steps.length,
          }),
        );
      }
      if (!plan) {
        throw new Error("Plan creation failed");
      }
      let activePlan: AgentPlan = plan;

      execution = updateExecution(
        updateExecutionLifecycle(execution, "EXECUTING", {
          planId: activePlan.id,
        }),
      );
      majorAudit("agent.execution.executing", execution, {
        planId: activePlan.id,
      });

      for (const step of activePlan.steps) {
        if (step.status === "completed" || step.status === "cancelled") continue;
        if (!step.dependsOn.every((dependency) =>
          activePlan.steps.some(
            (candidate) =>
              candidate.id === dependency && candidate.status === "completed",
          ),
        )) {
          continue;
        }

        const stepToolId = step.toolId ?? def.tools[0];
        execution = updateExecution({
          ...execution,
          currentStepId: step.id,
          updatedAt: nowIso(),
        });
        let stepPlan: AgentPlan = activePlan;

        if (stepToolId) {
          assertToolAllowed(def, stepToolId, settings);
          const tool = getToolDefinition(stepToolId);
          const existingApproval = agentsStore
            .getSnapshot()
            .approvals.find(
              (approval) =>
                approval.executionId === execution.id &&
                approval.stepId === step.id &&
                approval.toolId === stepToolId,
            );

          if (tool?.requiresApproval) {
            if (!existingApproval || existingApproval.state === "REQUIRES_APPROVAL") {
              const approval =
                existingApproval ??
                createApproval({
                  organizationId: task.organizationId,
                  agentInstanceId: task.agentInstanceId,
                  executionId: execution.id,
                  taskId: task.id,
                  planId: activePlan.id,
                  stepId: step.id,
                  toolId: stepToolId,
                  action: step.title,
                  reason: `${tool.name} requires approval before side effects.`,
                });
              agentsStore.upsertApproval(approval);
              stepPlan = markStepStatus(stepPlan, step.id, "blocked");
              agentsStore.upsertPlan(stepPlan);
              activePlan = stepPlan;
              plan = stepPlan;
              execution = updateExecution(
                updateExecutionLifecycle(execution, "WAITING_FOR_APPROVAL", {
                  currentStepId: step.id,
                  blockedReason: approval.reason,
                }),
              );
              task = {
                ...task,
                status: "blocked",
                error: undefined,
              };
              agentsStore.upsertTask(task);
              recordEvent(
                createStepExecution({
                  organizationId: task.organizationId,
                  agentInstanceId: task.agentInstanceId,
                  executionId: execution.id,
                  taskId: task.id,
                  planId: activePlan.id,
                  stepId: step.id,
                  toolId: stepToolId,
                  action: step.title,
                  status: "WAITING_FOR_APPROVAL",
                  input: { goal, toolId: stepToolId },
                  approvalState: approval.state,
                }),
              );
              majorAudit("agent.execution.approval_required", execution, {
                stepId: step.id,
                toolId: stepToolId,
              });
              return task;
            }
            if (existingApproval.state === "REJECTED") {
              execution = updateExecution(
                updateExecutionLifecycle(execution, "BLOCKED", {
                  currentStepId: step.id,
                  blockedReason: existingApproval.reason,
                }),
              );
              task = {
                ...task,
                status: "blocked",
                error: existingApproval.comment ?? existingApproval.reason,
              };
              agentsStore.upsertTask(task);
              recordEvent(
                createStepExecution({
                  organizationId: task.organizationId,
                  agentInstanceId: task.agentInstanceId,
                  executionId: execution.id,
                  taskId: task.id,
                  planId: activePlan.id,
                  stepId: step.id,
                  toolId: stepToolId,
                  action: step.title,
                  status: "BLOCKED",
                  approvalState: existingApproval.state,
                  error: existingApproval.comment ?? existingApproval.reason,
                }),
              );
              return task;
            }
            if (step.status === "blocked") {
              stepPlan = markStepStatus(stepPlan, step.id, "pending");
              agentsStore.upsertPlan(stepPlan);
              activePlan = stepPlan;
              plan = stepPlan;
            }
          }

          const startedAt = Date.now();
          recordEvent(
            createStepExecution({
              organizationId: task.organizationId,
              agentInstanceId: task.agentInstanceId,
              executionId: execution.id,
              taskId: task.id,
              planId: activePlan.id,
              stepId: step.id,
              toolId: stepToolId,
              action: step.title,
              status: "RUNNING",
              input: { step: step.title, goal },
            }),
          );
          const result = await invokeTool(stepToolId, {
            organizationId: task.organizationId,
            agentInstanceId: task.agentInstanceId,
            taskId: task.id,
            params: { step: step.title, goal },
          });
          agentsStore.bumpToolInvocations();
          if (!result.ok) throw new Error(result.error ?? "Tool failed");
          stepPlan = markStepStatus(stepPlan, step.id, "completed");
          agentsStore.upsertPlan(stepPlan);
          activePlan = stepPlan;
          plan = stepPlan;
          recordEvent(
            createStepExecution({
              organizationId: task.organizationId,
              agentInstanceId: task.agentInstanceId,
              executionId: execution.id,
              taskId: task.id,
              planId: activePlan.id,
              stepId: step.id,
              toolId: stepToolId,
              action: step.title,
              status: "COMPLETED",
              input: { step: step.title, goal },
              result: result.output,
              durationMs: Date.now() - startedAt,
              approvalState: tool?.requiresApproval ? "APPROVED" : undefined,
            }),
          );
        } else {
          stepPlan = markStepStatus(stepPlan, step.id, "completed");
          agentsStore.upsertPlan(stepPlan);
          activePlan = stepPlan;
          plan = stepPlan;
          recordEvent(
            createStepExecution({
              organizationId: task.organizationId,
              agentInstanceId: task.agentInstanceId,
              executionId: execution.id,
              taskId: task.id,
              planId: activePlan.id,
              stepId: step.id,
              action: step.title,
              status: "COMPLETED",
            }),
          );
        }
      }

      execution = updateExecution(
        updateExecutionLifecycle(execution, "VERIFYING", {
          currentStepId: undefined,
          blockedReason: undefined,
        }),
      );
      recordEvent(
        lifecycleEvent(execution, "VERIFYING", "RUNNING", {
          completedSteps: activePlan.steps.filter((step) => step.status === "completed").length,
        }),
      );

      const toolOutputs = getExecutionOutputs(execution.id);
      const llm = getLlmProvider(settings.defaultLlmProvider);
      const completion = await llm.complete({
        providerId: settings.defaultLlmProvider,
        system: def.instructions,
        prompt: `Goal: ${goal}\nSteps: ${activePlan.steps
          .map((step) => step.title)
          .join(", ")}\nTool outputs: ${toolOutputs
          .map((output) => JSON.stringify(output))
          .join("\n")}`,
      });

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

      const trace = agentsStore
        .getSnapshot()
        .traces.find((item) => item.taskId === task.id);
      const finishedAt = nowIso();
      const durationMs = Date.parse(finishedAt) - Date.parse(task.startedAt!);
      task = {
        ...task,
        status: "completed",
        finishedAt,
        durationMs,
        output: {
          completion: completion.text,
          confidence: trace?.confidence ?? 0.5,
          tools: toolOutputs,
          planId: activePlan.id,
          executionId: execution.id,
        },
      };
      agentsStore.upsertTask(task);

      execution = updateExecution(
        updateExecutionLifecycle(execution, "COMPLETED", {
          planId: activePlan.id,
          currentStepId: undefined,
          result: task.output,
          finishedAt,
        }),
      );
      recordEvent(
        lifecycleEvent(execution, "VERIFYING", "COMPLETED", undefined, {
          completion: completion.text,
        }),
      );
      majorAudit("agent.execution.completed", execution, {
        taskId: task.id,
        planId: activePlan.id,
      });

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
      execution = updateExecution(
        updateExecutionLifecycle(execution, "FAILED", {
          error: message,
          currentStepId: execution.currentStepId,
        }),
      );
      recordEvent(
        lifecycleEvent(execution, "EXECUTING", "FAILED", undefined, undefined, message),
      );
      majorAudit("agent.execution.failed", execution, { error: message });
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

  async resolveApproval(input: {
    readonly approvalId: string;
    readonly state: "APPROVED" | "REJECTED";
    readonly decidedBy?: string;
    readonly comment?: string;
  }): Promise<AgentApproval> {
    const approval = agentsStore
      .getSnapshot()
      .approvals.find((candidate) => candidate.id === input.approvalId);
    if (!approval) throw new Error("Approval not found");
    const resolved = finalizeApproval(
      approval,
      input.state,
      input.decidedBy,
      input.comment,
    );
    agentsStore.upsertApproval(resolved);

    const execution = agentsStore
      .getSnapshot()
      .executions.find((candidate) => candidate.id === approval.executionId);
    if (execution) {
      majorAudit(
        input.state === "APPROVED"
          ? "agent.execution.approval_approved"
          : "agent.execution.approval_rejected",
        execution,
        {
          approvalId: resolved.id,
          stepId: resolved.stepId,
        },
      );
      recordEvent(
        createStepExecution({
          organizationId: resolved.organizationId,
          agentInstanceId: resolved.agentInstanceId,
          executionId: resolved.executionId,
          taskId: resolved.taskId,
          planId: resolved.planId,
          stepId: resolved.stepId,
          toolId: resolved.toolId,
          action: resolved.action,
          status:
            input.state === "APPROVED" ? "COMPLETED" : "BLOCKED",
          approvalState: resolved.state,
          result:
            input.state === "APPROVED"
              ? { decision: resolved.state }
              : undefined,
          error:
            input.state === "REJECTED"
              ? resolved.comment ?? resolved.reason
              : undefined,
        }),
      );
    }

    if (input.state === "APPROVED") {
      await this.resumeExecution(resolved.executionId);
    } else {
      const task = agentsStore
        .getSnapshot()
        .tasks.find((candidate) => candidate.id === resolved.taskId);
      const activeExecution = agentsStore
        .getSnapshot()
        .executions.find((candidate) => candidate.id === resolved.executionId);
      if (task && activeExecution) {
        agentsStore.upsertTask({
          ...task,
          status: "blocked",
          error: resolved.comment ?? resolved.reason,
        });
        updateExecution(
          updateExecutionLifecycle(activeExecution, "BLOCKED", {
            blockedReason: resolved.comment ?? resolved.reason,
          }),
        );
      }
    }

    return resolved;
  },

  async resumeExecution(executionId: string): Promise<AgentTask> {
    const execution = agentsStore
      .getSnapshot()
      .executions.find((candidate) => candidate.id === executionId);
    if (!execution) throw new Error("Execution not found");
    const task = agentsStore
      .getSnapshot()
      .tasks.find((candidate) => candidate.id === execution.taskId);
    if (!task) throw new Error("Task not found");
    updateExecution(
      updateExecutionLifecycle(execution, "EXECUTING", {
        blockedReason: undefined,
      }),
    );
    agentsStore.upsertTask({
      ...task,
      status: "running",
      error: undefined,
    });
    return this.executeTask(task.id);
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
    const execution = task.executionId
      ? agentsStore
          .getSnapshot()
          .executions.find((candidate) => candidate.id === task.executionId)
      : undefined;
    if (execution) {
      updateExecution(
        updateExecutionLifecycle(execution, "CANCELLED", {
          finishedAt: nowIso(),
        }),
      );
      recordEvent(lifecycleEvent(execution, "CANCELLED", "CANCELLED"));
      majorAudit("agent.execution.cancelled", execution, { taskId });
    }
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
