/**
 * Memory Engine — architecture only.
 *
 * Future AI memory will use these scopes without redesigning the OS.
 * No model inference, embeddings, or retrieval pipelines here.
 */

import { createId } from "../ids";
import type { MemoryRecord, MemoryScope } from "../types";

function scopeKey(scope: MemoryScope): string {
  return `${scope.kind}:${scope.id}`;
}

export interface MemoryQuery {
  readonly scope: MemoryScope;
  readonly key?: string;
  readonly tags?: readonly string[];
  readonly limit?: number;
}

export interface MemoryEngine {
  remember(input: {
    scope: MemoryScope;
    key: string;
    value: unknown;
    tags?: readonly string[];
    expiresAt?: string;
  }): MemoryRecord;
  recall(query: MemoryQuery): readonly MemoryRecord[];
  forget(id: string): boolean;
  clearScope(scope: MemoryScope): void;
  listScopes(): readonly string[];
}

export function createMemoryEngine(): MemoryEngine {
  const records = new Map<string, MemoryRecord>();

  return {
    remember(input) {
      const now = new Date().toISOString();
      const existing = [...records.values()].find(
        (r) =>
          scopeKey(r.scope) === scopeKey(input.scope) && r.key === input.key,
      );

      if (existing) {
        const updated: MemoryRecord = {
          ...existing,
          value: input.value,
          tags: input.tags ?? existing.tags,
          updatedAt: now,
          expiresAt: input.expiresAt,
        };
        records.set(existing.id, updated);
        return updated;
      }

      const record: MemoryRecord = {
        id: createId("mem"),
        scope: input.scope,
        key: input.key,
        value: input.value,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
        expiresAt: input.expiresAt,
      };
      records.set(record.id, record);
      return record;
    },

    recall(query) {
      const now = Date.now();
      let result = [...records.values()].filter((r) => {
        if (scopeKey(r.scope) !== scopeKey(query.scope)) return false;
        if (query.key && r.key !== query.key) return false;
        if (r.expiresAt && Date.parse(r.expiresAt) < now) return false;
        if (query.tags?.length) {
          const tags = new Set(r.tags ?? []);
          if (!query.tags.every((t) => tags.has(t))) return false;
        }
        return true;
      });

      result = result.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );

      if (query.limit !== undefined) {
        result = result.slice(0, query.limit);
      }
      return result;
    },

    forget(id) {
      return records.delete(id);
    },

    clearScope(scope) {
      for (const [id, record] of [...records]) {
        if (scopeKey(record.scope) === scopeKey(scope)) {
          records.delete(id);
        }
      }
    },

    listScopes() {
      return [...new Set([...records.values()].map((r) => scopeKey(r.scope)))];
    },
  };
}
