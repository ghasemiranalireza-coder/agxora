import type {
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeWriteInput,
} from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `know_${crypto.randomUUID()}`;
  }
  return `know_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Company Knowledge Store — in-memory architecture.
 * Persistence adapters can replace this store later.
 */
export class CompanyKnowledgeStore {
  private readonly entries = new Map<string, KnowledgeEntry>();

  write(input: KnowledgeWriteInput): KnowledgeEntry {
    const now = new Date().toISOString();
    const entry: KnowledgeEntry = {
      id: createId(),
      organizationId: input.organizationId,
      businessType: input.businessType,
      kind: input.kind,
      title: input.title.trim(),
      content: input.content.trim(),
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  upsertByTitle(input: KnowledgeWriteInput): KnowledgeEntry {
    const existing = [...this.entries.values()].find(
      (entry) =>
        entry.organizationId === input.organizationId &&
        entry.title === input.title.trim(),
    );
    if (!existing) return this.write(input);

    const updated: KnowledgeEntry = {
      ...existing,
      content: input.content.trim(),
      kind: input.kind,
      businessType: input.businessType ?? existing.businessType,
      tags: input.tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(existing.id, updated);
    return updated;
  }

  get(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  query(query: KnowledgeQuery): readonly KnowledgeEntry[] {
    let results = [...this.entries.values()].filter(
      (entry) => entry.organizationId === query.organizationId,
    );
    if (query.kind) {
      results = results.filter((entry) => entry.kind === query.kind);
    }
    if (query.tag) {
      results = results.filter((entry) => entry.tags.includes(query.tag!));
    }
    results = results.sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }
    return results;
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  clearOrganization(organizationId: string): void {
    for (const [id, entry] of [...this.entries]) {
      if (entry.organizationId === organizationId) {
        this.entries.delete(id);
      }
    }
  }

  snapshot(): readonly KnowledgeEntry[] {
    return [...this.entries.values()];
  }
}

export const companyKnowledgeStore = new CompanyKnowledgeStore();
