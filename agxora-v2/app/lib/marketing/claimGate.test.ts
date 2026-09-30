import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createMemoryRecord } from "@/features/agents/memory";
import type { BusinessFactCategory, BusinessMemoryValue } from "@/features/agents/memory/businessContext";
import type { MarketingContentItem, MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import {
  CLAIM_GATE_RECHECK_MESSAGE,
  assessClaimGateApproval,
  claimContentHash,
  claimGateAllowsStore,
  claimGateCheckId,
  claimGateIdempotencyKey,
  evaluateMarketingClaims,
  factContextHash,
  factContextRefs,
  factStatementHash,
  supportConfirmedByProofs,
  supportFromMemories,
  type StoredClaimGateCheck,
} from "./claimGate";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ROOT = path.resolve(__dirname, "../../..");
const LUNCH = "Wir bieten täglich einen wechselnden Mittagstisch.";

function fact(input: {
  id?: string;
  organizationId?: string;
  content: string;
  status?: BusinessMemoryValue["status"];
  conflict?: boolean;
  category?: BusinessFactCategory;
  allowedForMarketing?: boolean;
}): ReturnType<typeof createMemoryRecord> {
  const now = "2026-09-30T00:00:00.000Z";
  const value: BusinessMemoryValue = {
    kind: "business_memory",
    subjectType: "organization",
    memoryType: "BUSINESS_FACT",
    content: input.content,
    status: input.status ?? "VERIFIED",
    provenance: "USER_INPUT",
    conflict: input.conflict ?? false,
    history: [],
    verifiedAt: now,
    updatedAt: now,
    fact: {
      category: input.category ?? "OFFER",
      statement: input.content,
      allowedForMarketing: input.allowedForMarketing ?? true,
      source: "customer_confirmation",
    },
  };
  const record = createMemoryRecord({
    organizationId: input.organizationId ?? ORG,
    scope: "business",
    key: `fact:${input.content}`,
    value,
  });
  return input.id ? { ...record, id: input.id } : record;
}

function item(day: number, draftCopy: string): MarketingContentItem {
  return { day, theme: "Mittag", draftCopy, callToAction: "Schau vorbei" };
}

function plan(overrides: Partial<MarketingPlanDocument> & { draftCopy?: string; strategy?: string }): MarketingPlanDocument {
  const draftCopy = overrides.draftCopy ?? "Entdecken Sie unseren täglich wechselnden Mittagstisch.";
  const items = Array.from({ length: 7 }, (_, index) => item(index + 1, index === 0 ? draftCopy : "Entdecke deinen neuen Lieblingsmittag."));
  return {
    goalStatement: "Prepare a seven-day marketing plan.",
    planWindow: { days: 7, label: "next_7_days" },
    businessFactsUsed: [],
    missingFacts: [],
    strategy: overrides.strategy ?? "Entdecken Sie unseren täglich wechselnden Mittagstisch.",
    audience: overrides.audience ?? "",
    offer: overrides.offer ?? LUNCH,
    channelIntent: "in_store",
    contentThemes: overrides.contentThemes ?? ["Mittagstisch"],
    contentItems: overrides.contentItems ?? items,
    status: "draft",
    provenance: "model_proposal",
    modelId: "gpt-test",
    simulated: false,
    contextRecordIds: [],
    narrowedFromPublish: false,
  };
}

function evaluate(memories: ReturnType<typeof fact>[], next = plan({})) {
  return evaluateMarketingClaims({
    plan: next,
    support: supportFromMemories(memories, ORG),
    organizationName: "Phase Fixture",
  });
}

describe("marketing claim gate", () => {
  const lunch = fact({ id: "mem_lunch", content: LUNCH });

  it("accepts a paraphrase of a verified fact", () => {
    const result = evaluate([lunch]);
    expect(result.claims.filter((claim) => claim.customerReason).map((claim) => `${claim.kind}:${claim.text}`)).toEqual([]);
    expect(result.result).toBe("PASS");
    expect(result.claims.some((claim) => claim.kind === "SUPPORTED_FACT" && claim.supportFactIds.includes("mem_lunch"))).toBe(true);
    expect(claimGateAllowsStore(result.result)).toBe(true);
  });

  it("allows marketing language that does not state a fact", () => {
    const result = evaluate([lunch], plan({
      strategy: "Entdecke deinen neuen Lieblingsmittag.",
      draftCopy: "Entdecke deinen neuen Lieblingsmittag.",
      contentThemes: ["Neu"],
      offer: "Mittagstisch",
    }));
    expect(result.result).toBe("PASS");
    expect(result.claims.every((claim) => claim.kind === "MARKETING_PERSUASION" || claim.kind === "OPINION_OR_STYLE" || claim.kind === "SUPPORTED_FACT")).toBe(true);
  });

  it("requires an edit for an unsupported preference claim", () => {
    const result = evaluate([lunch], plan({
      strategy: "Unsere Gäste lieben unseren Mittagstisch.",
      draftCopy: "Entdecke deinen neuen Lieblingsmittag.",
    }));
    expect(result.result).toBe("EDIT_REQUIRED");
    const claim = result.claims.find((item) => item.text.includes("lieben"));
    expect(claim?.kind).toBe("UNSUPPORTED_FACT");
    expect(claim?.customerReason).toBe("This statement is not supported by a verified business fact.");
    expect(claimGateAllowsStore(result.result)).toBe(false);
  });

  it("blocks a claim that matches a confirmed prohibition", () => {
    const rule = fact({
      id: "mem_rule",
      content: "Keine Preisversprechen verwenden.",
      category: "PROHIBITED_CLAIM",
    });
    const result = evaluate([lunch, rule], plan({
      strategy: "Der günstigste Reinigungsservice in Duisburg.",
      draftCopy: "Entdecke deinen neuen Lieblingsmittag.",
      offer: "Reinigung",
    }));
    expect(result.result).toBe("BLOCKED");
    expect(result.claims.some((claim) => claim.kind === "PROHIBITED_CLAIM")).toBe(true);
  });

  it("does not let a supported sentence hide an unsupported one", () => {
    const result = evaluate([lunch], plan({
      strategy: "Entdecken Sie unseren täglich wechselnden Mittagstisch. Unsere Gäste lieben unseren Mittagstisch.",
    }));
    expect(result.result).toBe("EDIT_REQUIRED");
  });

  it("ignores stale, rejected, conflicted, and foreign facts", () => {
    const stale = fact({ content: "Über 10.000 zufriedene Kunden.", status: "STALE" });
    const rejected = fact({ content: "Seit 20 Jahren Marktführer.", status: "REJECTED" });
    const conflicted = fact({ content: "Unsere Gäste lieben unseren Mittagstisch.", conflict: true });
    const foreign = fact({ content: "Über 10.000 zufriedene Kunden.", organizationId: OTHER });
    const result = evaluate([lunch, stale, rejected, conflicted, foreign], plan({
      strategy: "Über 10.000 zufriedene Kunden.",
      draftCopy: "Entdecke deinen neuen Lieblingsmittag.",
    }));
    expect(result.result).toBe("EDIT_REQUIRED");
    expect(result.supportFactIds).not.toEqual(expect.arrayContaining(["mem_foreign"]));
  });

  it("rejects invented counts, years, and testimonials", () => {
    for (const strategy of [
      "Über 10.000 zufriedene Kunden.",
      "Seit 20 Jahren Marktführer.",
      "Kunden sagen, der Mittagstisch ist ausgezeichnet.",
    ]) {
      const result = evaluate([lunch], plan({ strategy, draftCopy: "Entdecke deinen neuen Lieblingsmittag." }));
      expect(result.result === "PASS").toBe(false);
    }
  });

  it("changes the hash when the wording changes and keeps the same hash for the same wording", () => {
    const first = plan({});
    const second = plan({ strategy: "Unsere Gäste lieben unseren Mittagstisch." });
    expect(claimContentHash(first)).toBe(claimContentHash(plan({})));
    expect(claimContentHash(first)).not.toBe(claimContentHash(second));
  });

  it("requires the record and approval routes to bind the gate before storage", () => {
    const route = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/record/route.ts"), "utf8");
    const claim = readFileSync(path.join(ROOT, "app/api/v1/agents/marketing/claim-gate/route.ts"), "utf8");
    const approval = readFileSync(path.join(ROOT, "app/api/v1/agents/governed-approval/route.ts"), "utf8");
    const server = readFileSync(path.join(ROOT, "app/lib/marketing/claimGateServer.ts"), "utf8");
    expect(route.indexOf("await requirePassingClaimGate")).toBeLessThan(route.indexOf("beginGovernedMarketingRecord({"));
    expect(route).toContain("void body?.claimGatePassed");
    expect(route).toContain("void body?.draftHash");
    expect(route).toContain("void body?.factContextHash");
    expect(approval.indexOf("await requirePassingClaimGate")).toBeLessThan(approval.indexOf("appendGovernedEvidenceDb({"));
    expect(approval).toContain("void body.claimGatePassed");
    expect(approval).toContain("void body.draftHash");
    expect(approval).toContain("void body.factContextHash");
    expect(claim).toContain("requireCurrentActor");
    expect(claim).toContain("void body?.claimGatePassed");
    expect(claim).not.toContain("assertGovernedExecutionAllowed");
    expect(claim).not.toContain("canUseCapability");
    expect(server).toContain('error.code === "P2002"');
    expect(server).toContain("replayed: true");
  });
});

function checkedPass(memories: ReturnType<typeof fact>[], next: MarketingPlanDocument, planId = "plan-1"): {
  draftHash: string;
  factContextHash: string;
  checkId: string;
  stored: StoredClaimGateCheck;
} {
  const support = supportFromMemories(memories, ORG);
  const factsHash = factContextHash(factContextRefs(support), "Phase Fixture");
  const draftHash = claimContentHash(next);
  const checkId = claimGateCheckId(draftHash, factsHash);
  return {
    draftHash,
    factContextHash: factsHash,
    checkId,
    stored: {
      organizationId: ORG,
      planId,
      result: "PASS",
      version: "v1",
      draftHash,
      factContextHash: factsHash,
      checkId,
      invalidated: false,
    },
  };
}

describe("claim gate approval binding", () => {
  const lunch = fact({ id: "mem_lunch", content: LUNCH });
  const supported = plan({});
  const unsupported = plan({ strategy: "Unsere Gäste lieben unseren täglich wechselnden Mittagstisch." });

  it("allows approval when the draft and facts still match a pass", () => {
    const current = checkedPass([lunch], supported);
    const decision = assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: current.stored,
    });
    expect(decision.ok).toBe(true);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: { ...current.stored, invalidated: true },
    }).ok).toBe(false);
  });

  it("denies approval when the draft changed after a pass", () => {
    const previous = checkedPass([lunch], supported);
    const decision = assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: claimContentHash(unsupported),
      factContextHash: previous.factContextHash,
      stored: previous.stored,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.error).toBe(CLAIM_GATE_RECHECK_MESSAGE);
  });

  it("denies approval when a supporting fact is replaced", () => {
    const previous = checkedPass([lunch], supported);
    const replaced = fact({ id: "mem_lunch", content: "Wir bieten nur noch Frühstück." });
    const current = checkedPass([replaced], supported);
    expect(current.factContextHash).not.toBe(previous.factContextHash);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("denies approval when the supporting fact becomes stale", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([fact({ id: "mem_lunch", content: LUNCH, status: "STALE" })], supported);
    expect(current.factContextHash).not.toBe(previous.factContextHash);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("denies approval when the supporting fact becomes rejected", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([fact({ id: "mem_lunch", content: LUNCH, status: "REJECTED" })], supported);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("denies approval when the supporting fact is conflicted", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([fact({ id: "mem_lunch", content: LUNCH, conflict: true })], supported);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("invalidates a pass when the fact set changes and the draft does not", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([lunch, fact({ id: "mem_terrace", content: "Wir haben eine Terrasse." })], supported);
    expect(current.draftHash).toBe(previous.draftHash);
    expect(current.checkId).not.toBe(previous.checkId);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("invalidates a pass when the draft changes and the facts do not", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([lunch], unsupported);
    expect(current.factContextHash).toBe(previous.factContextHash);
    expect(current.draftHash).not.toBe(previous.draftHash);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
    }).ok).toBe(false);
  });

  it("denies a client-forged pass", () => {
    const current = checkedPass([lunch], supported);
    const decision = assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: null,
      clientClaimGatePassed: true,
    });
    expect(decision.ok).toBe(false);
  });

  it("denies a client-forged draft hash", () => {
    const previous = checkedPass([lunch], supported);
    const decision = assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: claimContentHash(unsupported),
      factContextHash: previous.factContextHash,
      stored: previous.stored,
      clientDraftHash: previous.draftHash,
    });
    expect(decision.ok).toBe(false);
  });

  it("denies a client-forged fact-context hash", () => {
    const previous = checkedPass([lunch], supported);
    const current = checkedPass([fact({ id: "mem_lunch", content: LUNCH, status: "STALE" })], supported);
    const decision = assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: previous.stored,
      clientFactContextHash: previous.factContextHash,
    });
    expect(decision.ok).toBe(false);
  });

  it("replays a pass for the same draft, facts, and plan", () => {
    const first = checkedPass([lunch], supported);
    const second = checkedPass([lunch], plan({}));
    expect(second.checkId).toBe(first.checkId);
    expect(claimGateIdempotencyKey(ORG, "plan-1", first.checkId)).toBe(claimGateIdempotencyKey(ORG, "plan-1", second.checkId));
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-1",
      draftHash: second.draftHash,
      factContextHash: second.factContextHash,
      stored: first.stored,
    }).ok).toBe(true);
    expect(assessClaimGateApproval({
      organizationId: ORG,
      planId: "plan-2",
      draftHash: second.draftHash,
      factContextHash: second.factContextHash,
      stored: first.stored,
    }).ok).toBe(false);
  });

  it("uses one idempotency key for concurrent checks of the same draft and facts", () => {
    const current = checkedPass([lunch], supported);
    const key = claimGateIdempotencyKey(ORG, "plan-1", current.checkId);
    expect(key).toBe(claimGateIdempotencyKey(ORG, "plan-1", claimGateCheckId(current.draftHash, current.factContextHash)));
    expect(key).toBe(`claimgate:v1:${ORG}:plan-1:${current.checkId}`);
  });

  it("rejects a client-forged verified fact that has no server confirmation", () => {
    const forged = fact({ id: "mem_forged", content: "Unsere Gäste lieben unseren Mittagstisch." });
    const proof = {
      memoryId: "mem_lunch",
      statement: LUNCH,
      category: "OFFER",
      allowedForMarketing: true,
      authoritative: true,
      status: "VERIFIED",
    };
    const confirmed = supportConfirmedByProofs([lunch, forged], ORG, [proof]);
    expect(confirmed.map((item) => item.id)).toEqual(["mem_lunch"]);
    const rewritten = fact({ id: "mem_lunch", content: "Unsere Gäste lieben unseren Mittagstisch." });
    expect(supportConfirmedByProofs([rewritten], ORG, [proof])).toEqual([]);
    expect(factStatementHash(LUNCH)).not.toBe(factStatementHash("Unsere Gäste lieben unseren Mittagstisch."));
  });

  it("denies a pass stored for another organization", () => {
    const current = checkedPass([lunch], supported);
    const decision = assessClaimGateApproval({
      organizationId: OTHER,
      planId: "plan-1",
      draftHash: current.draftHash,
      factContextHash: current.factContextHash,
      stored: current.stored,
    });
    expect(decision.ok).toBe(false);
  });
});
