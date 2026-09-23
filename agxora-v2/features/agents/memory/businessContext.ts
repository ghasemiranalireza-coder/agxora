/**
 * Business memory extension point.
 *
 * Day 9 stores one outcome record per finished goal under the existing
 * `business` memory scope. Future planners can read these records when
 * customer history, campaigns, decisions, or approved policies should
 * shape a plan. This is not a separate memory system.
 */

export const BUSINESS_GOAL_MEMORY_PREFIX = "goal:";

export const BUSINESS_MEMORY_FUTURE_CONTEXT = [
  "customer_history",
  "previous_conversations",
  "successful_campaigns",
  "previous_agent_decisions",
  "product_performance",
  "business_preferences",
  "approved_policies",
] as const;

export function businessGoalMemoryKey(goalId: string): string {
  return `${BUSINESS_GOAL_MEMORY_PREFIX}${goalId}`;
}

export interface BusinessGoalMemoryValue {
  readonly kind: "business_goal_outcome";
  readonly goalId: string;
  readonly planId: string;
  readonly statement: string;
  readonly customerId?: string;
  readonly noteId?: string;
  readonly verified: boolean;
  readonly recordedAt: string;
}
