import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getCapability } from "@/features/agents/capabilities/registry";
import { capabilitiesForRole } from "@/features/agents/workforce/workers";
import { marketingFactsFromState } from "./prepare";
import {
  applyConfirmedBusinessFact,
  authoritativeBusinessFacts,
  businessFactHash,
  businessFactIdempotencyKey,
  businessFactPlannerLine,
  decideFactClaim,
  parseBusinessFactConfirmation,
} from "./businessFact";
import type { MemoryRecord } from "@/features/agents/types";
import type { AgentsPersistedState } from "@/features/agents/repositories";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ROOT = path.resolve(__dirname, "../../..");

const FACT = {
  category: "OFFER" as const,
  statement: "Wir bieten täglich einen wechselnden Mittagstisch.",
  allowedForMarketing: true,
};

function state(memories: readonly MemoryRecord[]): AgentsPersistedState {
  return {
    version: 7,
    agents: [],
    tasks: [],
    approvals: [],
    memories: [...memories],
    plans: [],
    executions: [],
    messages: [],
    knowledge: [],
    settings: { llmProvider: "openai", llmModel: "gpt-4.1" },
  } as unknown as AgentsPersistedState;
}

describe("verified business facts", () => {
  it("registers a live governed write owned by the marketing worker", () => {
    const capability = getCapability("MARKETING_RECORD_BUSINESS_FACT");
    expect(capability?.mode).toBe("WRITE");
    expect(capability?.availability.status).toBe("LIVE");
    expect(capability?.security.tenantScoped).toBe(true);
    expect(capability?.approval.required).toBe(true);
    expect(capability?.execution.idempotencyRequired).toBe(true);
    expect(capability?.verification.required).toBe(true);
    expect(capability?.verification.evidenceType).toBe("business_fact");
    expect(capabilitiesForRole("MARKETING")).toContain("MARKETING_RECORD_BUSINESS_FACT");
    expect(capabilitiesForRole("SALES")).not.toContain("MARKETING_RECORD_BUSINESS_FACT");
    const server = readFileSync(path.join(ROOT, "app/lib/marketing/businessFactServer.ts"), "utf8");
    const entitlements = readFileSync(path.join(ROOT, "app/lib/billing/entitlements.ts"), "utf8");
    expect(server).not.toContain("canUseCapability");
    expect(server).not.toContain("assertGovernedExecutionAllowed");
    expect(server).not.toContain("commercialSubscription");
    expect(entitlements).not.toContain("MARKETING_RECORD_BUSINESS_FACT");
  });

  it("requires explicit confirmation and ignores forged verification", () => {
    expect(parseBusinessFactConfirmation({ ...FACT, action: "save" }).ok).toBe(false);
    const parsed = parseBusinessFactConfirmation({
      ...FACT,
      action: "confirm",
      organizationId: OTHER,
      workerId: "worker_client",
      status: "VERIFIED",
      provenance: "VERIFIED_EXECUTION",
      verified: true,
      actorId: "actor_client",
      statement: "  Wir bieten   täglich einen wechselnden Mittagstisch.  ",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fact.statement).toBe(FACT.statement);
    expect(parsed.fact.category).toBe("OFFER");
  });

  it("stores a verified user-confirmed fact and keeps it after reload", () => {
    const applied = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    expect(applied.created).toBe(true);
    expect(applied.authoritative).toBe(true);
    const reloaded = applied.memories;
    const [fact] = authoritativeBusinessFacts(reloaded, ORG);
    expect(fact?.value).toMatchObject({
      memoryType: "BUSINESS_FACT",
      status: "VERIFIED",
      provenance: "USER_INPUT",
      content: FACT.statement,
      conflict: false,
      sourceReference: "exec_1",
    });
    expect(businessFactPlannerLine(fact!)).toContain("Category: OFFER");
    expect(businessFactPlannerLine(fact!)).toContain(FACT.statement);
  });

  it("replays the same fact without a second memory", () => {
    const first = applyConfirmedBusinessFact({ memories: [], organizationId: ORG, fact: FACT, sourceReference: "exec_1" });
    const second = applyConfirmedBusinessFact({ memories: first.memories, organizationId: ORG, fact: FACT, sourceReference: "exec_2" });
    expect(second.created).toBe(false);
    expect(second.memoryId).toBe(first.memoryId);
    expect(authoritativeBusinessFacts(second.memories, ORG)).toHaveLength(1);
    const hash = businessFactHash(FACT);
    expect(businessFactIdempotencyKey(ORG, hash)).toBe(`bizfact:v1:${ORG}:${hash}`);
    expect(decideFactClaim("COMPLETED")).toBe("replay");
  });

  it("lets one concurrent confirmation create the fact", async () => {
    const key = businessFactIdempotencyKey(ORG, businessFactHash(FACT));
    const claims = new Map<string, "COMPLETED" | "RESERVED" | null>();
    let memories: readonly MemoryRecord[] = [];
    async function submit() {
      const current = claims.get(key) ?? null;
      const decision = decideFactClaim(current);
      if (decision === "replay") return "replay";
      if (decision === "in_progress") return "in_progress";
      claims.set(key, "RESERVED");
      await Promise.resolve();
      const applied = applyConfirmedBusinessFact({
        memories,
        organizationId: ORG,
        fact: FACT,
        sourceReference: "exec_concurrent",
      });
      memories = applied.memories;
      claims.set(key, "COMPLETED");
      return "saved";
    }
    const results = await Promise.all([submit(), submit()]);
    expect(results.sort()).toEqual(["in_progress", "saved"]);
    expect(authoritativeBusinessFacts(memories, ORG)).toHaveLength(1);
  });

  it("withholds a conflicting fact from authoritative context", () => {
    const first = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const conflict = applyConfirmedBusinessFact({
      memories: first.memories,
      organizationId: ORG,
      fact: { ...FACT, statement: "Wir bieten Mittagstisch nur Montag bis Donnerstag." },
      sourceReference: "exec_2",
    });
    expect(conflict.conflict).toBe(true);
    expect(conflict.authoritative).toBe(false);
    expect(authoritativeBusinessFacts(conflict.memories, ORG)).toHaveLength(0);
    const stored = conflict.memories[0];
    expect(stored && typeof stored.value === "object" && stored.value && "history" in stored.value).toBe(true);
  });

  it("does not return another organization's fact or an unverified fact", () => {
    const saved = applyConfirmedBusinessFact({ memories: [], organizationId: ORG, fact: FACT, sourceReference: "exec_1" });
    const foreign = { ...saved.memories[0]!, organizationId: OTHER };
    const unverified = {
      ...saved.memories[0]!,
      id: "mem_unverified",
      value: { ...(saved.memories[0]!.value as object), status: "UNVERIFIED" },
    };
    expect(authoritativeBusinessFacts([foreign, unverified], ORG)).toHaveLength(0);
    expect(authoritativeBusinessFacts(saved.memories, OTHER)).toHaveLength(0);
  });

  it("keeps verified facts out of generic memory blobs and available to marketing context", () => {
    const saved = applyConfirmedBusinessFact({ memories: [], organizationId: ORG, fact: FACT, sourceReference: "exec_1" });
    const generic = marketingFactsFromState(state(saved.memories), ORG);
    expect(generic.facts.some((fact) => fact.text.includes(FACT.statement))).toBe(false);
    const [fact] = authoritativeBusinessFacts(saved.memories, ORG);
    expect(businessFactPlannerLine(fact!)).toContain(FACT.statement);
    const route = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/business-facts/route.ts"), "utf8");
    const context = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/context/route.ts"), "utf8");
    expect(route).toContain("requireCurrentActor");
    expect(route).toContain('policyId: "agents.business_fact"');
    expect(context).toContain("businessFacts");
  });
});
