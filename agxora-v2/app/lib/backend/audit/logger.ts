/**
 * Audit logging interfaces — architecture only.
 */

import type { AuditEvent, EntityId } from "../types";

type Listener = () => void;

const listeners = new Set<Listener>();
let events: AuditEvent[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `audit_${crypto.randomUUID()}`;
  }
  return `audit_${Date.now().toString(36)}`;
}

export interface AuditLogger {
  log(input: {
    readonly action: string;
    readonly resource: string;
    readonly resourceId?: EntityId;
    readonly organizationId?: EntityId;
    readonly actorUserId?: EntityId;
    readonly metadata?: Readonly<Record<string, string>>;
  }): AuditEvent;
  list(): readonly AuditEvent[];
  subscribe(listener: Listener): () => void;
}

export const auditLogger: AuditLogger = {
  log(input) {
    const row: AuditEvent = {
      id: createId(),
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
    events = [row, ...events].slice(0, 200);
    emit();
    return row;
  },
  list() {
    return events;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function auditLog(
  input: Parameters<AuditLogger["log"]>[0],
): AuditEvent {
  return auditLogger.log(input);
}
