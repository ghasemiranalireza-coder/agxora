/**
 * Customer edits to a draft marketing plan before approval.
 * Edits stay on the prepare step. They do not approve or store the plan.
 */

import { updatePlanStep } from "../planning";
import { agentsStore } from "../store";
import type { MarketingContentItem, MarketingPlanDocument } from "./planSchema";

function asPlan(value: unknown): MarketingPlanDocument | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as MarketingPlanDocument;
  if (!Array.isArray(record.contentItems) || record.simulated !== false) return null;
  return record;
}

export function editMarketingDraft(input: {
  readonly organizationId: string;
  readonly planId: string;
  readonly strategy?: string;
  readonly audience?: string;
  readonly itemIndex?: number;
  readonly draftCopy?: string;
  readonly callToAction?: string;
  readonly theme?: string;
}): void {
  const plan = agentsStore.getSnapshot().plans.find(
    (item) => item.id === input.planId && item.organizationId === input.organizationId,
  );
  if (!plan) return;
  const recordStep = plan.steps.find((step) => step.capabilityId === "MARKETING_RECORD_PLAN");
  if (recordStep && recordStep.status === "completed") return;
  const prepare = plan.steps.find((step) => step.capabilityId === "MARKETING_PREPARE_PLAN");
  const current = asPlan(
    prepare?.result && typeof prepare.result === "object"
      ? (prepare.result as { plan?: unknown }).plan
      : undefined,
  );
  if (!prepare || !current) return;
  const items: MarketingContentItem[] = current.contentItems.map((item, index) => {
    if (index !== input.itemIndex) return item;
    return {
      ...item,
      theme: input.theme !== undefined ? input.theme : item.theme,
      draftCopy: input.draftCopy !== undefined ? input.draftCopy : item.draftCopy,
      callToAction: input.callToAction !== undefined ? input.callToAction : item.callToAction,
    };
  });
  const next: MarketingPlanDocument = {
    ...current,
    strategy: input.strategy !== undefined ? input.strategy : current.strategy,
    audience: input.audience !== undefined ? input.audience : current.audience,
    contentItems: items,
    status: "draft",
  };
  agentsStore.upsertPlan(
    updatePlanStep(plan, prepare.id, {
      result: { ...(typeof prepare.result === "object" && prepare.result ? prepare.result : {}), plan: next },
    }),
  );
}
