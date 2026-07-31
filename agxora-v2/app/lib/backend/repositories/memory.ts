import type { EntityId, Paginated } from "../types";
import type { CrudRepository, RepositoryQuery } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

/**
 * In-memory CRUD repository — swap for HTTP/SQL implementations later.
 */
export function createMemoryRepository<
  T extends { readonly id: EntityId; readonly createdAt: string; readonly updatedAt: string },
>(
  prefix: string,
  seed: readonly T[] = [],
): CrudRepository<T> {
  const rows = new Map<string, T>(seed.map((item) => [item.id, item]));

  return {
    async list(query?: RepositoryQuery): Promise<Paginated<T>> {
      let items = Array.from(rows.values());
      if (query?.organizationId) {
        items = items.filter((item) => {
          const org = (item as { organizationId?: string }).organizationId;
          return !org || org === query.organizationId;
        });
      }
      if (query?.search) {
        const q = query.search.toLowerCase();
        items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
      }
      const page = query?.page ?? 1;
      const pageSize = query?.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        total: items.length,
        page,
        pageSize,
      };
    },

    async getById(id: EntityId): Promise<T | null> {
      return rows.get(id) ?? null;
    },

    async create(input): Promise<T> {
      const id = (input.id as string | undefined) ?? createId(prefix);
      const stamp = nowIso();
      const row = {
        ...(input as object),
        id,
        createdAt: stamp,
        updatedAt: stamp,
      } as T;
      rows.set(id, row);
      return row;
    },

    async update(id: EntityId, patch: Partial<T>): Promise<T> {
      const existing = rows.get(id);
      if (!existing) throw new Error(`${prefix} not found: ${id}`);
      const next = {
        ...existing,
        ...patch,
        id,
        updatedAt: nowIso(),
      } as T;
      rows.set(id, next);
      return next;
    },

    async delete(id: EntityId): Promise<void> {
      rows.delete(id);
    },
  };
}
