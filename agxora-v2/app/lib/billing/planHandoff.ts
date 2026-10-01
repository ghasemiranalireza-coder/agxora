/**
 * Browser handoff for the plan the customer chose.
 * The stored value is a catalog code and interval, never an amount or Stripe price.
 */

import {
  checkoutSettingsHref,
  resolveSelectedInterval,
  resolveSelectedPlan,
} from "./planIntent";
import type { BillingInterval, PlanCode } from "./catalog";

const STORAGE_KEY = "agxora.selectedPlan";

export interface SelectedPlanIntent {
  readonly plan: PlanCode;
  readonly interval: BillingInterval;
}

function storage(): Storage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

export function encodePlanIntent(intent: SelectedPlanIntent): string {
  return `${intent.plan}:${intent.interval}`;
}

export function decodePlanIntent(value: string | null | undefined): SelectedPlanIntent | null {
  if (!value) return null;
  const [planToken, intervalToken] = value.split(":");
  const plan = resolveSelectedPlan(planToken);
  const interval = resolveSelectedInterval(intervalToken) ?? "month";
  if (!plan) return null;
  return { plan, interval };
}

export function rememberPlanSearch(params: URLSearchParams): SelectedPlanIntent | null {
  const plan = resolveSelectedPlan(params.get("plan"));
  if (!plan) return null;
  const interval = resolveSelectedInterval(params.get("interval")) ?? "month";
  const intent = { plan, interval };
  storage()?.setItem(STORAGE_KEY, encodePlanIntent(intent));
  return intent;
}

export function readPlanIntent(params?: URLSearchParams): SelectedPlanIntent | null {
  const fromQuery = params ? rememberPlanSearch(params) : null;
  if (fromQuery) return fromQuery;
  return decodePlanIntent(storage()?.getItem(STORAGE_KEY));
}

export function checkoutHrefForIntent(intent: SelectedPlanIntent): string {
  return checkoutSettingsHref(intent.plan, intent.interval);
}

export function pathWithPlan(path: string, intent: SelectedPlanIntent | null): string {
  if (!intent) return path;
  const [base, hash] = path.split("#");
  const join = base.includes("?") ? "&" : "?";
  const next = `${base}${join}plan=${intent.plan}&interval=${intent.interval}`;
  return hash ? `${next}#${hash}` : next;
}
