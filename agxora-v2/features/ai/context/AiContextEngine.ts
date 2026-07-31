/**
 * Context engine — architecture only.
 * Future modules (CRM, Projects, Finance, Documents) will bind entity refs here.
 * No business logic in Phase 21.
 */

import type { AiContextEntityType, AiContextRef, AiPlatformContext } from "../types";

const EMPTY: AiPlatformContext = {
  active: { type: "none" },
  recent: [],
};

let snapshot: AiPlatformContext = { ...EMPTY, recent: [] };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function getAiPlatformContext(): AiPlatformContext {
  return snapshot;
}

export function subscribeAiPlatformContext(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Set the active grounding context (customer, project, invoice, …). */
export function setAiActiveContext(ref: AiContextRef): void {
  const nextRecent = [
    ref,
    ...snapshot.recent.filter(
      (r) => !(r.type === ref.type && r.id === ref.id),
    ),
  ].slice(0, 12);
  snapshot = { active: ref, recent: nextRecent };
  emit();
}

export function clearAiActiveContext(): void {
  snapshot = { ...snapshot, active: { type: "none" } };
  emit();
}

/** Build a system-context preamble from the active ref (architecture stub). */
export function buildContextPreamble(ctx: AiPlatformContext = snapshot): string {
  const { active } = ctx;
  if (!active || active.type === "none") return "";
  const label = active.label ?? active.id ?? active.type;
  return [
    "[AGXORA Context Engine]",
    `Active entity type: ${active.type}`,
    `Active entity: ${label}`,
    "Use this context when answering. Do not invent missing fields.",
  ].join("\n");
}

export function isContextEntityType(value: string): value is AiContextEntityType {
  return (
    value === "customer" ||
    value === "project" ||
    value === "invoice" ||
    value === "document" ||
    value === "dashboard" ||
    value === "contact" ||
    value === "none"
  );
}
