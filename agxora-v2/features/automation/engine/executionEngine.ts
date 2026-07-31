/**
 * Workflow execution engine — separated from UI.
 * Queue-ready: executions enter as queued, support retry / cancel / recovery.
 */

import { executeAction } from "../actions";
import { evaluateRules } from "../conditions";
import {
  createVariableStore,
  flattenVariables,
  interpolate,
  setVariable,
} from "../variables";
import type {
  ActionNode,
  BranchNode,
  ConditionNode,
  DelayNode,
  ExecutionStatus,
  LoopNode,
  StepExecution,
  StepLogEntry,
  TriggerType,
  VariableNode,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowNode,
} from "../types";

export interface ExecutionEngineDeps {
  readonly onUpdate: (execution: WorkflowExecution) => void;
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, Math.min(ms, 50)); // cap in stub for snappy UX
  });

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function findTrigger(workflow: WorkflowDefinition): WorkflowNode | undefined {
  return workflow.nodes.find((n) => n.kind === "trigger");
}

function nextIds(node: WorkflowNode, edgeMap: Map<string, string[]>): string[] {
  const fromEdges = edgeMap.get(node.id) ?? [];
  if (node.next && node.next.length > 0) return [...node.next];
  return fromEdges;
}

function buildEdgeMap(workflow: WorkflowDefinition): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of workflow.edges) {
    const list = map.get(e.from) ?? [];
    list.push(e.to);
    map.set(e.from, list);
  }
  return map;
}

function log(
  level: StepLogEntry["level"],
  message: string,
  data?: Readonly<Record<string, unknown>>,
): StepLogEntry {
  return { at: nowIso(), level, message, data };
}

export class WorkflowExecutionEngine {
  private readonly deps: ExecutionEngineDeps;
  private readonly cancellations = new Set<string>();

  constructor(deps: ExecutionEngineDeps) {
    this.deps = deps;
  }

  cancel(executionId: string): void {
    this.cancellations.add(executionId);
  }

  async enqueue(input: {
    readonly workflow: WorkflowDefinition;
    readonly triggeredBy: TriggerType | "manual" | "retry" | "system";
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly attempt?: number;
  }): Promise<WorkflowExecution> {
    const startedAt = nowIso();
    const execution: WorkflowExecution = {
      id: createId("exec"),
      workflowId: input.workflow.id,
      organizationId: input.workflow.organizationId,
      status: "queued",
      triggeredBy: input.triggeredBy,
      triggerPayload: input.payload ?? {},
      startedAt,
      steps: [],
      variables: {},
      attempt: input.attempt ?? 1,
      cancelled: false,
      path: [],
    };
    this.deps.onUpdate(execution);
    return this.run(input.workflow, execution);
  }

  private async run(
    workflow: WorkflowDefinition,
    initial: WorkflowExecution,
  ): Promise<WorkflowExecution> {
    const sleep = this.deps.sleep ?? defaultSleep;
    const edgeMap = buildEdgeMap(workflow);
    const nodesById = new Map(workflow.nodes.map((n) => [n.id, n]));
    const vars = createVariableStore(workflow.variables);
    setVariable(vars, "runtime", "trigger", initial.triggerPayload);
    setVariable(vars, "runtime", "organizationId", workflow.organizationId);

    let execution: WorkflowExecution = {
      ...initial,
      status: "running",
    };
    this.deps.onUpdate(execution);

    const trigger = findTrigger(workflow);
    const queue: string[] = trigger
      ? nextIds(trigger, edgeMap)
      : workflow.nodes[0]
        ? [workflow.nodes[0].id]
        : [];

    if (trigger) {
      const triggerLabel =
        trigger.kind === "trigger"
          ? String(trigger.config.triggerType)
          : "unknown";
      execution = this.appendStep(execution, {
        nodeId: trigger.id,
        status: "succeeded",
        startedAt: nowIso(),
        finishedAt: nowIso(),
        attempt: 1,
        logs: [log("info", `Trigger ${triggerLabel} fired`)],
        output: initial.triggerPayload,
      });
      execution = {
        ...execution,
        path: [...execution.path, trigger.id],
      };
      this.deps.onUpdate(execution);
    }

    const timeoutMs = workflow.settings.timeoutMs;
    const deadline = Date.now() + timeoutMs;

    while (queue.length > 0) {
      if (this.cancellations.has(execution.id)) {
        execution = {
          ...execution,
          status: "cancelled",
          cancelled: true,
          finishedAt: nowIso(),
          durationMs: Date.now() - Date.parse(execution.startedAt),
          error: "Cancelled by user or system",
        };
        this.deps.onUpdate(execution);
        return execution;
      }

      if (Date.now() > deadline) {
        execution = {
          ...execution,
          status: "failed",
          finishedAt: nowIso(),
          durationMs: Date.now() - Date.parse(execution.startedAt),
          error: "Execution timed out",
        };
        this.deps.onUpdate(execution);
        return execution;
      }

      const nodeId = queue.shift()!;
      const node = nodesById.get(nodeId);
      if (!node) continue;

      const stepStart = nowIso();
      let step: StepExecution = {
        nodeId,
        status: "running",
        startedAt: stepStart,
        attempt: execution.attempt,
        logs: [log("info", `Executing ${node.kind}: ${node.label}`)],
      };
      execution = this.appendStep(execution, step);
      execution = { ...execution, path: [...execution.path, nodeId] };
      this.deps.onUpdate(execution);

      try {
        const result = await this.executeNode(node, {
          workflow,
          execution,
          vars,
          edgeMap,
          sleep,
        });
        step = {
          ...step,
          status: result.skipped ? "skipped" : "succeeded",
          finishedAt: nowIso(),
          output: result.output,
          logs: [...step.logs, ...result.logs],
        };
        execution = this.replaceStep(execution, step);
        queue.push(...result.next);
        execution = {
          ...execution,
          variables: flattenVariables(vars),
        };
        this.deps.onUpdate(execution);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Step failed";
        const maxAttempts = workflow.settings.retryPolicy.maxAttempts;
        step = {
          ...step,
          status: "failed",
          finishedAt: nowIso(),
          error: message,
          logs: [...step.logs, log("error", message)],
        };
        execution = this.replaceStep(execution, step);

        if (execution.attempt < maxAttempts) {
          execution = {
            ...execution,
            status: "retrying",
            error: message,
            variables: flattenVariables(vars),
          };
          this.deps.onUpdate(execution);
          const backoff =
            workflow.settings.retryPolicy.backoffMs *
            workflow.settings.retryPolicy.backoffMultiplier **
              (execution.attempt - 1);
          await sleep(backoff);
          return this.enqueue({
            workflow,
            triggeredBy: "retry",
            payload: initial.triggerPayload,
            attempt: execution.attempt + 1,
          });
        }

        execution = {
          ...execution,
          status: "failed",
          finishedAt: nowIso(),
          durationMs: Date.now() - Date.parse(execution.startedAt),
          error: message,
          variables: flattenVariables(vars),
        };
        this.deps.onUpdate(execution);
        return execution;
      }
    }

    execution = {
      ...execution,
      status: "succeeded" satisfies ExecutionStatus,
      finishedAt: nowIso(),
      durationMs: Date.now() - Date.parse(execution.startedAt),
      variables: flattenVariables(vars),
    };
    this.deps.onUpdate(execution);
    return execution;
  }

  private appendStep(
    execution: WorkflowExecution,
    step: StepExecution,
  ): WorkflowExecution {
    return { ...execution, steps: [...execution.steps, step] };
  }

  private replaceStep(
    execution: WorkflowExecution,
    step: StepExecution,
  ): WorkflowExecution {
    const steps = execution.steps.map((s) =>
      s.nodeId === step.nodeId && s.startedAt === step.startedAt ? step : s,
    );
    return { ...execution, steps };
  }

  private async executeNode(
    node: WorkflowNode,
    ctx: {
      readonly workflow: WorkflowDefinition;
      readonly execution: WorkflowExecution;
      readonly vars: ReturnType<typeof createVariableStore>;
      readonly edgeMap: Map<string, string[]>;
      readonly sleep: (ms: number) => Promise<void>;
    },
  ): Promise<{
    readonly next: string[];
    readonly output?: unknown;
    readonly logs: StepLogEntry[];
    readonly skipped?: boolean;
  }> {
    const { vars, edgeMap, sleep, workflow, execution } = ctx;
    const flat = flattenVariables(vars);

    switch (node.kind) {
      case "action": {
        const action = node as ActionNode;
        const params = { ...(action.config.params ?? {}) };
        const result = await executeAction(action.config.actionType, {
          organizationId: workflow.organizationId,
          workflowId: workflow.id,
          executionId: execution.id,
          variables: flat,
          params,
          aiPrompt: action.config.aiPrompt
            ? interpolate(action.config.aiPrompt, vars)
            : undefined,
        });
        if (!result.ok) {
          throw new Error(result.error ?? "Action failed");
        }
        if (action.config.outputKey) {
          setVariable(vars, "output", action.config.outputKey, result.output);
        }
        return {
          next: nextIds(node, edgeMap),
          output: result.output,
          logs: [log("info", `Action ${action.config.actionType} completed`)],
        };
      }
      case "condition": {
        const cond = node as ConditionNode;
        const passed = evaluateRules(cond.config.rules, cond.config.logic, flat);
        const next = passed
          ? cond.config.trueNext
            ? [cond.config.trueNext]
            : nextIds(node, edgeMap)
          : cond.config.falseNext
            ? [cond.config.falseNext]
            : [];
        return {
          next,
          output: { passed },
          logs: [
            log("info", `Condition ${passed ? "passed" : "failed"}`, {
              passed,
            }),
          ],
        };
      }
      case "delay": {
        const delay = node as DelayNode;
        await sleep(delay.config.delayMs);
        return {
          next: nextIds(node, edgeMap),
          output: { delayedMs: delay.config.delayMs },
          logs: [log("info", `Delayed ${delay.config.delayMs}ms`)],
        };
      }
      case "branch": {
        const branch = node as BranchNode;
        for (const b of branch.config.branches) {
          if (
            !b.rules ||
            b.rules.length === 0 ||
            evaluateRules(b.rules, "and", flat)
          ) {
            return {
              next: b.next ? [b.next] : nextIds(node, edgeMap),
              output: { branch: b.id },
              logs: [log("info", `Branch selected: ${b.label}`)],
            };
          }
        }
        return {
          next: branch.config.defaultNext
            ? [branch.config.defaultNext]
            : nextIds(node, edgeMap),
          output: { branch: "default" },
          logs: [log("info", "Default branch")],
        };
      }
      case "loop": {
        const loop = node as LoopNode;
        // Placeholder — single pass for architecture readiness.
        setVariable(vars, "runtime", loop.config.itemVariable, null);
        return {
          next: loop.config.bodyNext
            ? [loop.config.bodyNext]
            : nextIds(node, edgeMap),
          output: { placeholder: true, maxIterations: loop.config.maxIterations },
          logs: [
            log("warn", "Loop node is a placeholder — single pass executed"),
          ],
        };
      }
      case "variable": {
        const vn = node as VariableNode;
        for (const a of vn.config.assignments) {
          const value = interpolate(a.expression, vars);
          setVariable(vars, a.scope, a.key, value);
        }
        return {
          next: nextIds(node, edgeMap),
          output: vn.config.assignments,
          logs: [log("info", "Variables updated")],
        };
      }
      case "trigger":
        return {
          next: nextIds(node, edgeMap),
          skipped: true,
          logs: [log("info", "Trigger already processed")],
        };
      default:
        return {
          next: nextIds(node, edgeMap),
          logs: [log("warn", "Unknown node kind")],
        };
    }
  }
}
