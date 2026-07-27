import { CORE_AGENTS } from "./catalog";
import type { AgentDefinition, AgentInstance } from "./types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export class AgentRegistry {
  private readonly agents = new Map<string, AgentDefinition>();
  private readonly instances: AgentInstance[] = [];

  constructor(seed: readonly AgentDefinition[] = CORE_AGENTS) {
    for (const agent of seed) {
      this.register(agent);
    }
  }

  register(agent: AgentDefinition): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  getByKey(key: string): AgentDefinition | undefined {
    return [...this.agents.values()].find((agent) => agent.key === key);
  }

  list(): readonly AgentDefinition[] {
    return [...this.agents.values()];
  }

  activateForOrganization(
    organizationId: string,
    agentKeys: readonly string[],
  ): readonly AgentInstance[] {
    const created: AgentInstance[] = [];
    for (const key of agentKeys) {
      const agent = this.getByKey(key);
      if (!agent) continue;
      const existing = this.instances.find(
        (item) =>
          item.organizationId === organizationId && item.agentId === agent.id,
      );
      if (existing) {
        created.push(existing);
        continue;
      }
      const instance: AgentInstance = {
        id: createId("ainst"),
        agentId: agent.id,
        organizationId,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      this.instances.push(instance);
      created.push(instance);
    }
    return created;
  }

  listInstances(organizationId: string): readonly AgentInstance[] {
    return this.instances.filter(
      (item) => item.organizationId === organizationId,
    );
  }
}

export const agentRegistry = new AgentRegistry();
