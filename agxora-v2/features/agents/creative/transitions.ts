/**
 * Phase 58 — Creative status transitions (deterministic).
 */

import type { CreativeStatus } from "./types";

const ALLOWED: Readonly<Record<CreativeStatus, readonly CreativeStatus[]>> = {
  PLANNED: ["READY_FOR_APPROVAL", "BLOCKED"],
  READY_FOR_APPROVAL: ["APPROVED", "QUEUED", "BLOCKED", "PLANNED"],
  APPROVED: ["QUEUED", "RUNNING", "BLOCKED"],
  QUEUED: ["RUNNING", "APPROVED", "BLOCKED", "FAILED"],
  RUNNING: ["COMPLETED", "FAILED", "PROVIDER_UNAVAILABLE", "BLOCKED"],
  COMPLETED: [],
  FAILED: ["QUEUED", "READY_FOR_APPROVAL", "BLOCKED"],
  BLOCKED: ["READY_FOR_APPROVAL", "PLANNED"],
  PROVIDER_UNAVAILABLE: ["READY_FOR_APPROVAL", "QUEUED", "BLOCKED"],
};

export function canTransitionCreativeStatus(
  from: CreativeStatus,
  to: CreativeStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) === true;
}

export function assertCreativeStatusTransition(
  from: CreativeStatus,
  to: CreativeStatus,
): void {
  if (!canTransitionCreativeStatus(from, to)) {
    throw new Error(`Invalid creative status transition: ${from} → ${to}`);
  }
}
