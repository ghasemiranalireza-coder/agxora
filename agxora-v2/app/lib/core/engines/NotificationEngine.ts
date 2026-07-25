/**
 * Notification Architecture — in-process store + event-ready surface.
 */

import { asNotificationId, createId } from "../ids";
import type { NotificationLevel, NotificationRecord } from "../types";

export type NotificationListener = (notifications: readonly NotificationRecord[]) => void;

export interface CreateNotificationInput {
  readonly level?: NotificationLevel;
  readonly title: string;
  readonly body?: string;
  readonly moduleId?: NotificationRecord["moduleId"];
  readonly workspaceId?: string;
  readonly href?: string;
  readonly meta?: Record<string, unknown>;
}

export interface NotificationEngine {
  create(input: CreateNotificationInput): NotificationRecord;
  list(workspaceId?: string): readonly NotificationRecord[];
  listUnread(workspaceId?: string): readonly NotificationRecord[];
  markRead(id: string): void;
  markAllRead(workspaceId?: string): void;
  dismiss(id: string): boolean;
  subscribe(listener: NotificationListener): () => void;
}

export function createNotificationEngine(): NotificationEngine {
  const items: NotificationRecord[] = [];
  const listeners = new Set<NotificationListener>();

  const emit = (): void => {
    const snapshot = [...items];
    for (const listener of [...listeners]) listener(snapshot);
  };

  return {
    create(input) {
      const record: NotificationRecord = {
        id: asNotificationId(createId("ntf")),
        level: input.level ?? "info",
        title: input.title,
        body: input.body,
        moduleId: input.moduleId,
        workspaceId: input.workspaceId,
        read: false,
        createdAt: new Date().toISOString(),
        href: input.href,
        meta: input.meta,
      };
      items.unshift(record);
      emit();
      return record;
    },

    list(workspaceId) {
      if (!workspaceId) return [...items];
      return items.filter((n) => n.workspaceId === workspaceId);
    },

    listUnread(workspaceId) {
      return this.list(workspaceId).filter((n) => !n.read);
    },

    markRead(id) {
      const idx = items.findIndex((n) => n.id === id);
      if (idx < 0) return;
      items[idx] = { ...items[idx], read: true };
      emit();
    },

    markAllRead(workspaceId) {
      for (let i = 0; i < items.length; i += 1) {
        if (!workspaceId || items[i].workspaceId === workspaceId) {
          items[i] = { ...items[i], read: true };
        }
      }
      emit();
    },

    dismiss(id) {
      const idx = items.findIndex((n) => n.id === id);
      if (idx < 0) return false;
      items.splice(idx, 1);
      emit();
      return true;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
