/**
 * Recognize a marketing-plan goal without treating it as a publish request.
 */

import { isCrmFollowUpGoal, isCustomerReplyGoal } from "../orchestration/goalPlan";

const MARKETING_GOAL =
  /marketing|content plan|content-plan|instagram|social media|mehr kunden|mehr g[aä]ste|kunden gewinnen|g[aä]ste gewinnen|marketingplan|social content|werbung|anzeigen schalten/i;

const PUBLISH_OR_ADS =
  /publish|ver[oö]ffentlichen|buy ads|advertise|werbung schalten|anzeigen schalten|sofort posten/i;

export function asksToPublishOrAdvertise(statement: string): boolean {
  return PUBLISH_OR_ADS.test(statement);
}

export function isMarketingPlanGoal(statement: string): boolean {
  const text = statement.trim();
  if (!text || !MARKETING_GOAL.test(text)) return false;
  if (isCustomerReplyGoal(text)) return false;
  if (isCrmFollowUpGoal(text)) return false;
  return true;
}
