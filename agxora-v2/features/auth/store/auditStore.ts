/**
 * IAM audit log — persistent LocalStorage + in-memory mirror.
 * Backend integration: replace writer with API without changing callers.
 */

import type { IamAuditAction, IamAuditEvent } from "../types";

const STORAGE_KEY = "agxora-iam-audit-v1";
const MAX_EVENTS = 300;

type Listener = () => void;

const listeners = new Set<Listener>();
let events: IamAuditEvent[] = [];
let hydrated = false;

function emit(): void {
  listeners.forEach((l) => l());
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `iam_audit_${crypto.randomUUID()}`;
  }
  return `iam_audit_${Date.now().toString(36)}`;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") {
    hydrated = true;
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IamAuditEvent[];
      if (Array.isArray(parsed)) events = parsed.slice(0, MAX_EVENTS);
    }
  } catch {
    events = [];
  }
  hydrated = true;
}

export const iamAuditStore = {
  hydrate,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  list(): readonly IamAuditEvent[] {
    hydrate();
    return events;
  },
  log(input: {
    readonly action: IamAuditAction;
    readonly actorUserId?: string;
    readonly organizationId?: string;
    readonly workspaceId?: string;
    readonly resource?: string;
    readonly resourceId?: string;
    readonly metadata?: Readonly<Record<string, string>>;
  }): IamAuditEvent {
    hydrate();
    const row: IamAuditEvent = {
      id: createId(),
      action: input.action,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      resource: input.resource ?? input.action.split(".")[0] ?? "iam",
      resourceId: input.resourceId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };
    events = [row, ...events].slice(0, MAX_EVENTS);
    persist();
    emit();
    return row;
  },
  clear(): void {
    events = [];
    persist();
    emit();
  },
};

export function iamAuditLog(
  input: Parameters<typeof iamAuditStore.log>[0],
): IamAuditEvent {
  return iamAuditStore.log(input);
}
