/**
 * Public landing diagrams. Statuses describe the product, not a tenant.
 * Live is only the Customer Communication workforce.
 * Available matches the provider registry (Gmail, YouTube) and does not mean connected.
 * Workspace marks in-product modules. Direction marks future architecture.
 */

export const WORKFORCE_NODES = [
  { id: "customerCommunication", status: "live" },
  { id: "marketing", status: "direction" },
  { id: "finance", status: "direction" },
  { id: "operations", status: "direction" },
] as const;

export const SYSTEM_NODES = [
  { id: "crm", status: "workspace" },
  { id: "finance", status: "workspace" },
  { id: "gmail", status: "available" },
  { id: "youtube", status: "available" },
  { id: "moreSystems", status: "direction" },
] as const;

export const SURFACE_PATH = ["goal", "plan", "approval", "execute", "verify"] as const;

export const INTELLIGENCE_STEPS = [
  { id: "context", title: "businessContext", detail: "customerHistoryGoal" },
  { id: "understand", title: "agxora", detail: "understands" },
  { id: "plan", title: "plan", detail: "nextAction" },
  { id: "approval", title: "approvalRequired", detail: "governance" },
  { id: "result", title: "verifiedResult", detail: "evidence" },
] as const;

export const LOOP_STEPS = [
  "business",
  "goal",
  "plan",
  "approval",
  "execute",
  "verify",
  "evidence",
  "memory",
  "nextGoal",
] as const;

export const MARKETING_STEPS = [
  "businessContext",
  "marketingGoal",
  "strategy",
  "campaign",
  "content",
  "creative",
  "approval",
  "publish",
  "measure",
  "optimize",
] as const;

export type VisualStatus = "live" | "direction" | "workspace" | "available";
