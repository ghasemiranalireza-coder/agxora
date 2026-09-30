/**
 * Marketing plan steps. Load and prepare are reads. Record stores only an approved plan.
 * The model call stays on the server. This module does not publish or write CRM.
 */

import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import type { MarketingPlanDocument } from "./planSchema";

export interface MarketingContextResult {
  readonly ok: boolean;
  readonly verified: boolean;
  readonly organizationName?: string;
  readonly facts?: readonly { readonly key: string; readonly text: string }[];
  readonly contextRecordIds?: readonly string[];
  readonly missingFacts?: readonly string[];
  readonly error?: string;
}

export interface MarketingPrepareResult {
  readonly ok: boolean;
  readonly simulated?: boolean;
  readonly plan?: MarketingPlanDocument;
  readonly modelId?: string;
  readonly missingFacts?: readonly string[];
  readonly error?: string;
}

export interface MarketingRecordResult {
  readonly ok: boolean;
  readonly stored?: boolean;
  readonly replayed?: boolean;
  readonly planRecordId?: string;
  readonly plan?: MarketingPlanDocument;
  readonly error?: string;
}

export interface MarketingVerifyResult {
  readonly ok: boolean;
  readonly verified?: boolean;
  readonly planRecordId?: string;
  readonly evidenceId?: string;
  readonly error?: string;
}

export interface MarketingTransport {
  loadContext(input: {
    readonly statement: string;
    readonly offer: string;
  }): Promise<MarketingContextResult>;
  prepare(input: {
    readonly statement: string;
    readonly offer: string;
    readonly channelIntent?: string;
  }): Promise<MarketingPrepareResult>;
  record(input: {
    readonly idempotencyKey: string;
    readonly executionId: string;
    readonly stepId: string;
    readonly planId: string;
    readonly plan: unknown;
  }): Promise<MarketingRecordResult>;
  verify(input: {
    readonly planRecordId: string;
    readonly executionId: string;
    readonly stepId: string;
  }): Promise<MarketingVerifyResult>;
}

function readString(params: Readonly<Record<string, unknown>>, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

async function httpTransport(): Promise<MarketingTransport> {
  async function post<T>(path: string, body: unknown): Promise<T & { ok?: boolean; error?: string; message?: string }> {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as (T & { ok?: boolean; error?: string; message?: string }) | null;
    if (!payload) return { ok: false, error: "Marketing request failed." } as T & { ok: boolean; error: string };
    if (!response.ok) {
      return { ...payload, ok: false, error: payload.error ?? payload.message ?? "Marketing request failed." };
    }
    return payload;
  }
  return {
    loadContext: (input) => post("/api/v1/agents/marketing/context", input),
    prepare: (input) => post("/api/v1/agents/marketing/prepare", input),
    record: (input) => post("/api/v1/agents/marketing/record", input),
    verify: (input) => post("/api/v1/agents/marketing/verify", input),
  };
}

let transportOverride: MarketingTransport | null = null;

export function setMarketingTransportForTests(next: MarketingTransport | null): void {
  transportOverride = next;
}

async function transport(): Promise<MarketingTransport> {
  return transportOverride ?? httpTransport();
}

export async function handleMarketingTool(ctx: ToolInvocationContext): Promise<ToolInvocationResult> {
  const started = Date.now();
  const action = readString(ctx.params, "action");
  const goal = readString(ctx.params, "goal");
  const offer = readString(ctx.params, "marketingOffer");
  const client = await transport();

  if (action === "load_business_context") {
    const loaded = await client.loadContext({ statement: goal, offer });
    if (!loaded.ok || loaded.verified !== true) {
      return {
        ok: false,
        error: loaded.error ?? "Business context could not be read.",
        output: { action, mutated: false, verified: false },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        verified: true,
        organizationName: loaded.organizationName,
        facts: loaded.facts ?? [],
        contextRecordIds: loaded.contextRecordIds ?? [],
        missingFacts: loaded.missingFacts ?? [],
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "prepare_marketing_plan") {
    if (!offer) {
      return {
        ok: false,
        error: "An offer is required before a marketing plan can be prepared.",
        output: { action, mutated: false, missingFacts: ["offer"] },
        durationMs: Date.now() - started,
      };
    }
    const prepared = await client.prepare({
      statement: goal,
      offer,
      channelIntent: readString(ctx.params, "channelIntent") || undefined,
    });
    if (!prepared.ok || !prepared.plan || prepared.simulated === true || prepared.plan.simulated !== false) {
      return {
        ok: false,
        error: prepared.error ?? "The marketing plan could not be prepared.",
        output: { action, mutated: false, simulated: prepared.simulated === true },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        simulated: false,
        modelId: prepared.modelId ?? prepared.plan.modelId,
        plan: prepared.plan,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "record_marketing_plan") {
    const plan = ctx.params.marketingPlan;
    const recorded = await client.record({
      idempotencyKey: readString(ctx.params, "idempotencyKey"),
      executionId: readString(ctx.params, "executionId"),
      stepId: readString(ctx.params, "stepId"),
      planId: readString(ctx.params, "planId"),
      plan,
    });
    if (!recorded.ok || recorded.stored !== true || !recorded.planRecordId) {
      return {
        ok: false,
        error: recorded.error ?? "Marketing plan was not stored.",
        output: { action, mutated: false, stored: false },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        mutated: true,
        stored: true,
        replayed: recorded.replayed === true,
        planRecordId: recorded.planRecordId,
        plan: recorded.plan,
      },
      durationMs: Date.now() - started,
    };
  }

  if (action === "verify_marketing_plan") {
    const planRecordId = readString(ctx.params, "planRecordId");
    const verified = await client.verify({
      planRecordId,
      executionId: readString(ctx.params, "executionId"),
      stepId: readString(ctx.params, "stepId"),
    });
    if (!verified.ok || verified.verified !== true) {
      return {
        ok: false,
        error: verified.error ?? "Marketing plan was not read back.",
        output: { action, mutated: false, verified: false },
        durationMs: Date.now() - started,
      };
    }
    return {
      ok: true,
      output: {
        action,
        readOnly: true,
        mutated: false,
        verified: true,
        planRecordId: verified.planRecordId ?? planRecordId,
        evidenceId: verified.evidenceId,
      },
      durationMs: Date.now() - started,
    };
  }

  return {
    ok: false,
    error: "Marketing action is not available.",
    output: { action, mutated: false },
    durationMs: Date.now() - started,
  };
}
