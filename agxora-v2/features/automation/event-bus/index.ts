/**
 * Internal domain event bus — modules publish, workflows subscribe.
 * Loose coupling; queue-ready for future distributed delivery.
 */

import type { DomainEvent } from "../types";

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

type Unsubscribe = () => void;

const handlers = new Map<string, Set<EventHandler>>();
const wildcard = new Set<EventHandler>();
const history: DomainEvent[] = [];
const MAX_HISTORY = 200;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `evt_${crypto.randomUUID()}`;
  }
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function publishDomainEvent(
  input: Omit<DomainEvent, "id" | "occurredAt"> & {
    readonly occurredAt?: string;
  },
): DomainEvent {
  const event: DomainEvent = {
    id: createId(),
    type: input.type,
    organizationId: input.organizationId,
    source: input.source,
    payload: input.payload,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    correlationId: input.correlationId,
  };

  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();

  const typed = handlers.get(event.type);
  const targets = [
    ...(typed ? Array.from(typed) : []),
    ...Array.from(wildcard),
  ];

  for (const handler of targets) {
    try {
      void Promise.resolve(handler(event)).catch(() => {
        // Isolated handler failures must not break the bus.
      });
    } catch {
      // sync handler failure
    }
  }

  return event;
}

export function subscribeDomainEvent(
  type: string | "*",
  handler: EventHandler,
): Unsubscribe {
  if (type === "*") {
    wildcard.add(handler);
    return () => {
      wildcard.delete(handler);
    };
  }
  let set = handlers.get(type);
  if (!set) {
    set = new Set();
    handlers.set(type, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

export function listRecentDomainEvents(
  organizationId?: string,
  limit = 50,
): readonly DomainEvent[] {
  const filtered = organizationId
    ? history.filter((e) => e.organizationId === organizationId)
    : history;
  return filtered.slice(-limit).reverse();
}

export function clearDomainEventHistory(): void {
  history.length = 0;
}

/** Map trigger types to canonical event type strings. */
export const TRIGGER_EVENT_MAP = {
  "customer.created": "customer.created",
  "project.created": "project.created",
  "invoice.issued": "invoice.issued",
  "task.completed": "task.completed",
  "document.uploaded": "document.uploaded",
  "user.invited": "user.invited",
  schedule: "automation.schedule",
  webhook: "automation.webhook",
  "api.event": "api.event",
  "ai.event": "ai.event",
  manual: "automation.manual",
} as const;
