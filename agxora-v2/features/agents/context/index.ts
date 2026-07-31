/**
 * Centralized agent context engine.
 */

import type { AgentContextBundle } from "../types";

export function createContextBundle(
  partial: AgentContextBundle,
): AgentContextBundle {
  return {
    organizationId: partial.organizationId,
    workspaceId: partial.workspaceId,
    business: partial.business ?? {},
    workflow: partial.workflow ?? {},
    customer: partial.customer ?? {},
    project: partial.project ?? {},
    extras: partial.extras ?? {},
  };
}

export function mergeContext(
  base: AgentContextBundle,
  patch: Partial<AgentContextBundle>,
): AgentContextBundle {
  return {
    organizationId: patch.organizationId ?? base.organizationId,
    workspaceId: patch.workspaceId ?? base.workspaceId,
    business: { ...(base.business ?? {}), ...(patch.business ?? {}) },
    workflow: { ...(base.workflow ?? {}), ...(patch.workflow ?? {}) },
    customer: { ...(base.customer ?? {}), ...(patch.customer ?? {}) },
    project: { ...(base.project ?? {}), ...(patch.project ?? {}) },
    extras: { ...(base.extras ?? {}), ...(patch.extras ?? {}) },
  };
}
