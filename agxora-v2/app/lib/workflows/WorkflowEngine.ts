import type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowStep,
} from "./types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function defaultSteps(key: string): readonly WorkflowStep[] {
  return [
    {
      id: `${key}.intake`,
      name: "Intake",
      type: "action",
      config: { phase: "intake" },
    },
    {
      id: `${key}.process`,
      name: "Process",
      type: "action",
      config: { phase: "process" },
    },
    {
      id: `${key}.complete`,
      name: "Complete",
      type: "action",
      config: { phase: "complete" },
    },
  ];
}

/**
 * Workflow Engine foundation — definitions + in-memory runs.
 * Execution adapters plug in later without redesign.
 */
export class WorkflowEngine {
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly runs: WorkflowRun[] = [];

  register(definition: WorkflowDefinition): void {
    if (this.workflows.has(definition.id)) {
      throw new Error(`Workflow already registered: ${definition.id}`);
    }
    this.workflows.set(definition.id, definition);
  }

  registerStarter(key: string, name?: string): WorkflowDefinition {
    const existing = [...this.workflows.values()].find((item) => item.key === key);
    if (existing) return existing;

    const definition: WorkflowDefinition = {
      id: `wf.${key}`,
      key,
      name: name ?? key.split("_").join(" "),
      description: `Starter workflow: ${key}`,
      status: "published",
      steps: defaultSteps(key),
      version: "1.0.0",
    };
    this.register(definition);
    return definition;
  }

  registerMany(keys: readonly string[]): readonly WorkflowDefinition[] {
    return keys.map((key) => this.registerStarter(key));
  }

  get(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  list(): readonly WorkflowDefinition[] {
    return [...this.workflows.values()];
  }

  async startRun(input: {
    workflowId: string;
    organizationId: string;
  }): Promise<WorkflowRun> {
    const workflow = this.workflows.get(input.workflowId);
    if (!workflow) throw new Error(`Unknown workflow: ${input.workflowId}`);

    const run: WorkflowRun = {
      id: createId("wrun"),
      workflowId: workflow.id,
      organizationId: input.organizationId,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    this.runs.push(run);

    // Foundation stub — succeeds immediately until real executors exist.
    const completed: WorkflowRun = {
      ...run,
      status: "succeeded",
      finishedAt: new Date().toISOString(),
    };
    const index = this.runs.findIndex((item) => item.id === run.id);
    this.runs[index] = completed;
    return completed;
  }

  listRuns(organizationId: string): readonly WorkflowRun[] {
    return this.runs.filter((run) => run.organizationId === organizationId);
  }
}

export const workflowEngine = new WorkflowEngine();
