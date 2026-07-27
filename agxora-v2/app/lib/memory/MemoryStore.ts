import type { MemoryEntry, MemoryQuery, MemoryScope } from "./MemoryTypes";

function scopeKey(scope: MemoryScope): string {
  return `${scope.kind}:${scope.id}`;
}

export interface MemoryStore {
  upsert(entry: MemoryEntry): MemoryEntry;
  get(id: string): MemoryEntry | undefined;
  query(query: MemoryQuery): readonly MemoryEntry[];
  remove(id: string): boolean;
  clearScope(scope: MemoryScope): void;
  listScopeKeys(): readonly string[];
  snapshot(): readonly MemoryEntry[];
}

export function createMemoryStore(): MemoryStore {
  const byId = new Map<string, MemoryEntry>();

  return {
    upsert(entry) {
      byId.set(entry.id, entry);
      return entry;
    },

    get(id) {
      return byId.get(id);
    },

    query(query) {
      const now = Date.now();
      let results = [...byId.values()].filter((entry) => {
        if (scopeKey(entry.scope) !== scopeKey(query.scope)) return false;
        if (query.kind && entry.kind !== query.kind) return false;
        if (query.key && entry.key !== query.key) return false;
        if (entry.expiresAt && Date.parse(entry.expiresAt) < now) return false;
        return true;
      });

      results = results.sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );

      if (query.limit !== undefined) {
        results = results.slice(0, query.limit);
      }

      return results;
    },

    remove(id) {
      return byId.delete(id);
    },

    clearScope(scope) {
      for (const [id, entry] of [...byId]) {
        if (scopeKey(entry.scope) === scopeKey(scope)) {
          byId.delete(id);
        }
      }
    },

    listScopeKeys() {
      return [...new Set([...byId.values()].map((e) => scopeKey(e.scope)))];
    },

    snapshot() {
      return [...byId.values()];
    },
  };
}
