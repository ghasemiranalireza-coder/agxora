export type AgentStatus = "registered" | "active" | "paused" | "deprecated";

export type AgentCapability =
  | "analysis"
  | "automation"
  | "communication"
  | "planning"
  | "monitoring"
  | "compliance";

export interface AgentDefinition {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly AgentCapability[];
  readonly defaultTools: readonly string[];
  readonly status: AgentStatus;
  readonly version: string;
}

export interface AgentInstance {
  readonly id: string;
  readonly agentId: string;
  readonly organizationId: string;
  readonly enabled: boolean;
  readonly createdAt: string;
}
