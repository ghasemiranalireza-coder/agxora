/**
 * Server-built marketing image brief.
 * Draft copy, CRM, finance, and performance language never enter the prompt.
 */

import type { MarketingChannelIntent, MarketingContentItem, MarketingPlanDocument } from "@/features/agents/marketing/planSchema";
import { mapAspectRatioToOpenAISize } from "@/app/lib/creative/prompt";

const PROHIBITIONS = [
  "Do not invent facts.",
  "Do not invent products.",
  "Do not invent prices.",
  "Do not invent discounts.",
  "Do not invent reviews.",
  "Do not invent testimonials.",
  "Do not invent ratings.",
  "Do not invent customer counts.",
  "Do not invent performance metrics.",
  "Do not invent business claims.",
  "Do not imply publication.",
  "Do not imply results.",
].join(" ");

export function aspectForChannel(channel: MarketingChannelIntent): "1:1" | "16:9" | "4:5" {
  if (channel === "website") return "16:9";
  if (channel === "facebook") return "4:5";
  return "1:1";
}

export function marketingImageIdempotencyKey(input: {
  readonly organizationId: string;
  readonly goalId: string;
  readonly planId: string;
  readonly day: number;
  readonly mode: "generate" | "regenerate";
  readonly priorExecutionId?: string;
}): string {
  const base = `mktimg:v1:${input.organizationId}:${input.goalId}:${input.planId}:${input.day}`;
  if (input.mode === "regenerate") {
    return `${base}:regen:${input.priorExecutionId ?? ""}`;
  }
  return `${base}:generate`;
}

export function buildMarketingImageBrief(input: {
  readonly organizationName: string;
  readonly plan: MarketingPlanDocument;
  readonly item: MarketingContentItem;
}): { readonly prompt: string; readonly size: "1024x1024" | "1024x1536" | "1536x1024" } {
  const aspect = aspectForChannel(input.plan.channelIntent);
  const prompt = [
    "Create one marketing image for an approved plan item.",
    `Organization: ${input.organizationName.trim()}.`,
    `Offer: ${input.plan.offer.trim()}.`,
    `Audience: ${input.plan.audience.trim() || "Not specified"}.`,
    `Day: ${input.item.day}.`,
    `Theme: ${input.item.theme.trim()}.`,
    `Call to action: ${input.item.callToAction.trim()}.`,
    `Channel intent: ${input.plan.channelIntent}.`,
    `Aspect ratio: ${aspect}.`,
    PROHIBITIONS,
    "Do not use tools, capabilities, approvals, CRM, email, publishing, or billing.",
    "This image is a draft preview. It is not published.",
  ].join(" ");
  if (prompt.includes(input.item.draftCopy)) {
    throw new Error("Marketing image brief included draft copy.");
  }
  return { prompt, size: mapAspectRatioToOpenAISize(aspect) };
}
