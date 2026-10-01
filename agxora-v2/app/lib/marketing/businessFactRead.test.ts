import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { BusinessMemoryValue } from "@/features/agents/memory/businessContext";
import {
  assessClaimGateApproval,
  claimContentHash,
  claimGateCheckId,
  CLAIM_GATE_VERSION,
  factContextHash,
  factContextRefs,
  supportFromMemories,
} from "./claimGate";
import {
  applyConfirmedBusinessFact,
  projectBusinessFactRead,
} from "./businessFact";
import type { MemoryRecord } from "@/features/agents/types";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ROOT = path.resolve(__dirname, "../../..");
const FACT = {
  category: "OFFER" as const,
  statement: "Wir bieten täglich einen wechselnden Mittagstisch.",
  allowedForMarketing: true,
};

function withStatus(record: MemoryRecord, status: BusinessMemoryValue["status"]): MemoryRecord {
  const value = record.value as BusinessMemoryValue;
  return { ...record, id: `mem_${status.toLowerCase()}`, value: { ...value, status } };
}

describe("business fact truth read", () => {
  it("shows a confirmed fact as authoritative with stored status and provenance", () => {
    const saved = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
      now: "2026-09-30T12:00:00.000Z",
    });
    const read = projectBusinessFactRead(saved.memories, ORG);
    expect(read.needsAttention).toHaveLength(0);
    expect(read.facts).toEqual([
      expect.objectContaining({
        memoryId: saved.memoryId,
        category: "OFFER",
        statement: FACT.statement,
        allowedForMarketing: true,
        status: "VERIFIED",
        provenance: "USER_INPUT",
        authoritative: true,
        conflict: false,
        updatedAt: "2026-09-30T12:00:00.000Z",
        verifiedAt: "2026-09-30T12:00:00.000Z",
        previous: null,
      }),
    ]);
    expect(supportFromMemories(saved.memories, ORG).map((item) => item.id)).toEqual([saved.memoryId]);
  });

  it("keeps a conflicted fact out of the authoritative set and shows the previous statement", () => {
    const first = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
      now: "2026-09-30T12:00:00.000Z",
    });
    const conflict = applyConfirmedBusinessFact({
      memories: first.memories,
      organizationId: ORG,
      fact: { ...FACT, statement: "Wir bieten Mittagstisch nur Montag bis Donnerstag." },
      sourceReference: "exec_2",
      now: "2026-10-01T12:00:00.000Z",
    });
    const read = projectBusinessFactRead(conflict.memories, ORG);
    expect(read.facts).toHaveLength(0);
    expect(read.needsAttention).toEqual([
      expect.objectContaining({
        authoritative: false,
        conflict: true,
        status: "VERIFIED",
        statement: "Wir bieten Mittagstisch nur Montag bis Donnerstag.",
        previous: {
          statement: FACT.statement,
          status: "VERIFIED",
          recordedAt: "2026-09-30T12:00:00.000Z",
        },
      }),
    ]);
    expect(supportFromMemories(conflict.memories, ORG)).toHaveLength(0);
  });

  it("shows a stored stale fact as non-authoritative", () => {
    const saved = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const stale = withStatus(saved.memories[0]!, "STALE");
    const read = projectBusinessFactRead([stale], ORG);
    expect(read.facts).toHaveLength(0);
    expect(read.needsAttention[0]).toEqual(expect.objectContaining({
      authoritative: false,
      status: "STALE",
    }));
    expect(supportFromMemories([stale], ORG)).toHaveLength(0);
  });

  it("shows a stored rejected fact as non-authoritative", () => {
    const saved = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const rejected = withStatus(saved.memories[0]!, "REJECTED");
    const read = projectBusinessFactRead([rejected], ORG);
    expect(read.facts).toHaveLength(0);
    expect(read.needsAttention[0]).toEqual(expect.objectContaining({
      authoritative: false,
      status: "REJECTED",
    }));
    expect(supportFromMemories([rejected], ORG)).toHaveLength(0);
  });

  it("does not return a fact stored for another organization", () => {
    const saved = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const foreign = { ...saved.memories[0]!, id: "mem_foreign", organizationId: OTHER };
    const asOwner = projectBusinessFactRead([foreign, saved.memories[0]!], ORG);
    expect(asOwner.facts.map((fact) => fact.memoryId)).toEqual([saved.memoryId]);
    expect(asOwner.needsAttention).toHaveLength(0);
    const asOther = projectBusinessFactRead([foreign, saved.memories[0]!], OTHER);
    expect(asOther.facts.map((fact) => fact.memoryId)).toEqual(["mem_foreign"]);
    expect(asOther.facts.some((fact) => fact.memoryId === saved.memoryId)).toBe(false);
    expect(projectBusinessFactRead([foreign], ORG).facts).toHaveLength(0);
    expect(projectBusinessFactRead([foreign], ORG).needsAttention).toHaveLength(0);
  });

  it("does not let a forged authoritative flag override a withheld fact", () => {
    const first = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const conflict = applyConfirmedBusinessFact({
      memories: first.memories,
      organizationId: ORG,
      fact: { ...FACT, statement: "A different offer." },
      sourceReference: "exec_2",
    });
    const stored = conflict.memories[0]!;
    const forged = {
      ...stored,
      value: { ...(stored.value as object), authoritative: true, organizationId: OTHER },
    };
    const read = projectBusinessFactRead([forged], ORG);
    expect(read.facts).toHaveLength(0);
    expect(read.needsAttention[0]?.authoritative).toBe(false);
    const route = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/business-facts/route.ts"), "utf8");
    expect(route).toContain('void url.searchParams.get("organizationId")');
    expect(route).toContain('void url.searchParams.get("authoritative")');
    expect(route).toContain('void url.searchParams.get("status")');
    expect(route).toContain('void url.searchParams.get("provenance")');
    expect(route).toContain("requireCurrentActor()");
  });

  it("replays the same confirmation without a second memory", () => {
    const first = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const replay = applyConfirmedBusinessFact({
      memories: first.memories,
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_2",
    });
    expect(replay.created).toBe(false);
    expect(replay.memories).toHaveLength(1);
    expect(replay.authoritative).toBe(true);
  });

  it("keeps a Phase 25 pass valid until the draft or fact context changes", () => {
    const saved = applyConfirmedBusinessFact({
      memories: [],
      organizationId: ORG,
      fact: FACT,
      sourceReference: "exec_1",
    });
    const plan = {
      strategy: FACT.statement,
      audience: "",
      offer: "",
      contentThemes: [] as string[],
      contentItems: [],
    };
    const draftHash = claimContentHash(plan);
    const factsHash = factContextHash(factContextRefs(supportFromMemories(saved.memories, ORG)));
    const stored = {
      organizationId: ORG,
      planId: "plan-1",
      result: "PASS",
      version: CLAIM_GATE_VERSION,
      draftHash,
      factContextHash: factsHash,
      checkId: claimGateCheckId(draftHash, factsHash),
      invalidated: false,
    };
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash,
      factContextHash: factsHash,
      stored,
      clientClaimGatePassed: false,
    }).ok).toBe(true);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: claimContentHash({ ...plan, strategy: "A different draft." }),
      factContextHash: factsHash,
      stored,
    }).ok).toBe(false);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash,
      factContextHash: factContextHash([]),
      stored,
    }).ok).toBe(false);
    expect(CLAIM_GATE_VERSION).toBe("v1");
    const gate = readFileSync(path.join(ROOT, "app/lib/marketing/claimGate.ts"), "utf8");
    expect(gate).toContain("isAuthoritativeBusinessFact");
    expect(gate).toContain("[CLAIM_GATE_VERSION, draftHashValue, factsHash].join");
  });

  it("does not read billing, CRM, finance, email, social, or creative systems", () => {
    const route = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/business-facts/route.ts"), "utf8");
    const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
    for (const token of ["stripe", "prisma", "sendEmail", "youtube", "linkedin", "generateImage", "invoice"]) {
      expect(get.toLowerCase()).not.toContain(token.toLowerCase());
    }
    const projection = readFileSync(path.join(ROOT, "app/lib/marketing/businessFact.ts"), "utf8");
    expect(projection).not.toContain("stripe");
    expect(projection).not.toContain("prisma");
    const before = JSON.stringify(FACT);
    projectBusinessFactRead([], ORG);
    expect(JSON.stringify(FACT)).toBe(before);
    const server = readFileSync(path.join(ROOT, "app/lib/marketing/businessFactServer.ts"), "utf8");
    expect(server).toContain("BUSINESS_FACT_CAPABILITY");
    expect(server).toContain("projectBusinessFactRead");
    const list = server.slice(server.indexOf("export async function listBusinessFactsForActor"), server.indexOf("export async function confirmBusinessFactForActor"));
    expect(list).not.toContain("prisma.");
    expect(list).not.toContain("putAgentOsStateForActor");
  });
});
