/**
 * Global activity feed — architecture store.
 */

import type { Activity, ActivityKind, EntityId } from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();
let feed: Activity[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `activity_${crypto.randomUUID()}`;
  }
  return `activity_${Date.now().toString(36)}`;
}

export function getActivityFeed(): readonly Activity[] {
  return feed;
}

export function subscribeActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordActivity(input: {
  readonly kind: ActivityKind;
  readonly title: string;
  readonly detail: string;
  readonly organizationId?: EntityId;
  readonly actorUserId?: EntityId;
  readonly entityId?: EntityId;
  readonly href?: string;
}): Activity {
  const stamp = new Date().toISOString();
  const row: Activity = {
    id: createId(),
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entityId: input.entityId,
    href: input.href,
    createdAt: stamp,
    updatedAt: stamp,
  };
  feed = [row, ...feed].slice(0, 100);
  emit();
  return row;
}

export function clearActivityFeed(): void {
  feed = [];
  emit();
}
