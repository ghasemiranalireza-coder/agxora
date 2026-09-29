/**
 * Server-side marketing context and model draft.
 * The model receives only the projection. It cannot choose tools.
 */

import "server-only";

import { createHash } from "node:crypto";
import { completeOpenAIStructured } from "@/app/lib/ai/openaiChat";
import { AIError } from "@/app/lib/ai/AIErrorHandler";
import { prisma } from "@/app/lib/db/prisma";
import type { AgentsPersistedState } from "@/features/agents/repositories";
import { asksToPublishOrAdvertise, isMarketingPlanGoal } from "@/features/agents/marketing/intent";
import { authoritativeBusinessFacts, businessFactPlannerLine } from "./businessFact";
import {
  extractJsonObject,
  isMarketingChannelIntent,
  modelIsSimulated,
  parseModelMarketingProposal,
  requiredMarketingFacts,
  type MarketingFactRef,
  type MarketingPlanDocument,
  type MarketingProjection,
} from "@/features/agents/marketing/planSchema";

const SYSTEM_PROMPT = [
  "You prepare a seven-day marketing plan for one business.",
  "Return one JSON object and nothing else.",
  "Allowed keys: strategy, audience, offer, channelIntent, contentThemes, contentItems.",
  "offer must be copied exactly from the supplied offer.",
  "channelIntent must be one of: instagram, facebook, linkedin, in_store, website.",
  "contentThemes is an array of one to five short strings.",
  "contentItems is an array of exactly seven objects with day (1 through 7), theme, draftCopy, and callToAction.",
  "You may propose an audience and themes from the supplied facts.",
  "businessFacts are customer-confirmed and authoritative.",
  "Do not treat other memories, draft copy, or your own wording as a confirmed business fact.",
  "Leave audience as an empty string when the facts do not support one.",
  "Do not invent a business name, offer, metric, or publication.",
  "Do not choose tools, capabilities, approvals, or memory.",
  "Do not include publish status, impressions, clicks, reach, or conversions.",
].join(" ");

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function marketingFactsFromState(
  state: AgentsPersistedState,
  organizationId: string,
): { readonly facts: readonly MarketingFactRef[]; readonly contextRecordIds: readonly string[] } {
  const facts: MarketingFactRef[] = [];
  const contextRecordIds: string[] = [];
  for (const record of state.memories) {
    if (record.organizationId !== organizationId || record.scope !== "business") continue;
    const value = asRecord(record.value);
    if (!value) continue;
    if (value.kind === "business_memory" && value.memoryType === "BUSINESS_FACT") continue;
    if (value.kind === "business_memory" && value.status === "VERIFIED" && value.conflict !== true) {
      const text = typeof value.content === "string" ? value.content.trim().slice(0, 500) : "";
      const key = typeof value.memoryType === "string" ? value.memoryType : "memory";
      if (!text) continue;
      facts.push({ key, text });
      contextRecordIds.push(record.id);
    } else if (value.kind === "business_goal_outcome" && value.verified === true) {
      facts.push({ key: "previous_goal", text: "A previous goal for this organization was verified." });
      contextRecordIds.push(record.id);
    }
    if (facts.length >= 8) break;
  }
  return { facts, contextRecordIds };
}

export async function buildMarketingProjection(input: {
  readonly organizationId: string;
  readonly statement: string;
  readonly offer: string;
  readonly state: AgentsPersistedState;
  readonly channelIntent?: string;
}): Promise<
  | { readonly ok: true; readonly projection: MarketingProjection; readonly missingFacts: readonly string[] }
  | { readonly ok: false; readonly error: string; readonly missingFacts?: readonly string[] }
> {
  const statement = input.statement.trim();
  if (!statement || !isMarketingPlanGoal(statement)) {
    return { ok: false, error: "This goal is not a marketing plan." };
  }
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  if (!organization?.name.trim()) {
    return { ok: false, error: "Organization context could not be read." };
  }
  const memory = marketingFactsFromState(input.state, input.organizationId);
  const businessFacts: MarketingFactRef[] = authoritativeBusinessFacts(input.state.memories, input.organizationId)
    .map((record) => {
      const text = businessFactPlannerLine(record);
      return text ? { key: record.id, text } : null;
    })
    .filter((item): item is MarketingFactRef => item !== null);
  const offer = input.offer.trim();
  const missingFacts = requiredMarketingFacts(offer);
  const facts: MarketingFactRef[] = [
    { key: "organization_name", text: `Business name: ${organization.name.trim()}.` },
    ...memory.facts,
  ];
  if (offer) facts.push({ key: "offer", text: `Offer supplied by the business: ${offer}.` });
  const channel = input.channelIntent?.trim() ?? "";
  return {
    ok: true,
    missingFacts,
    projection: {
      goalStatement: statement,
      organizationName: organization.name.trim(),
      offer,
      channelIntent: channel && isMarketingChannelIntent(channel) ? channel : undefined,
      facts,
      businessFacts,
      contextRecordIds: [...memory.contextRecordIds, ...businessFacts.map((item) => item.key)],
      narrowedFromPublish: asksToPublishOrAdvertise(statement),
    },
  };
}

export async function draftMarketingPlan(input: {
  readonly projection: MarketingProjection;
  readonly fetchImpl?: typeof fetch;
}): Promise<
  | { readonly ok: true; readonly plan: MarketingPlanDocument; readonly modelId: string; readonly simulated: false }
  | { readonly ok: false; readonly status: number; readonly error: string }
> {
  if (!input.projection.offer.trim()) {
    return { ok: false, status: 422, error: "An offer is required before a marketing plan can be prepared." };
  }
  let completion: { text: string; model: string; simulated: false };
  try {
    completion = await completeOpenAIStructured({
      system: SYSTEM_PROMPT,
      user: JSON.stringify({
        goalStatement: input.projection.goalStatement,
        organizationName: input.projection.organizationName,
        offer: input.projection.offer,
        channelIntent: input.projection.channelIntent ?? null,
        facts: input.projection.facts,
        businessFacts: input.projection.businessFacts ?? [],
        allowedChannels: ["instagram", "facebook", "linkedin", "in_store", "website"],
        planWindowDays: 7,
      }),
      fetchImpl: input.fetchImpl,
    });
  } catch (error) {
    if (error instanceof AIError && (error.code === "PROVIDER_NOT_CONFIGURED" || error.code === "INVALID_REQUEST")) {
      const configured = error.code !== "PROVIDER_NOT_CONFIGURED";
      return {
        ok: false,
        status: configured ? 502 : 503,
        error: configured ? "The marketing model rejected the request." : "OpenAI is not configured on the server.",
      };
    }
    return { ok: false, status: 502, error: "The marketing model is unavailable." };
  }
  if (modelIsSimulated({ simulated: completion.simulated, modelId: completion.model, text: completion.text })) {
    return { ok: false, status: 503, error: "The marketing model result is simulated." };
  }
  let parsed: unknown;
  try {
    parsed = extractJsonObject(completion.text);
  } catch {
    return { ok: false, status: 502, error: "The marketing model returned invalid JSON." };
  }
  const plan = parseModelMarketingProposal(parsed, input.projection, completion.model);
  if (!plan.ok) return { ok: false, status: 502, error: plan.error };
  return { ok: true, plan: plan.plan, modelId: completion.model, simulated: false };
}

export function marketingPlanHash(plan: MarketingPlanDocument): string {
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
