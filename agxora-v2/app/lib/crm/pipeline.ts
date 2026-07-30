import type { PipelineDeal, PipelineStage } from "./types";

export const PIPELINE_ORDER: readonly PipelineStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export function groupDealsByStage(
  deals: readonly PipelineDeal[],
): Record<PipelineStage, PipelineDeal[]> {
  const groups: Record<PipelineStage, PipelineDeal[]> = {
    lead: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  };
  for (const deal of deals) {
    groups[deal.stage].push(deal);
  }
  return groups;
}

export function moveDealStage(
  deals: readonly PipelineDeal[],
  dealId: string,
  stage: PipelineStage,
): PipelineDeal[] {
  return deals.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal));
}
