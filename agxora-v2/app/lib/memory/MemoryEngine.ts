import { createMemoryStore, type MemoryStore } from "./MemoryStore";
import type {
  MemoryContextPacket,
  MemoryEntry,
  MemoryQuery,
  MemoryScope,
  MemoryWriteInput,
} from "./MemoryTypes";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * MemoryEngine — architectural gateway for conversation and org context.
 * Every chat turn must pass through this engine before response generation.
 * Persistence adapters plug in later without changing callers.
 */
export class MemoryEngine {
  constructor(private readonly store: MemoryStore = createMemoryStore()) {}

  remember(input: MemoryWriteInput): MemoryEntry {
    const now = new Date().toISOString();
    const existing = this.store.query({
      scope: input.scope,
      key: input.key,
      kind: input.kind,
      limit: 1,
    })[0];

    if (existing) {
      const updated: MemoryEntry = {
        ...existing,
        content: input.content,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: now,
        expiresAt: input.expiresAt,
      };
      return this.store.upsert(updated);
    }

    const entry: MemoryEntry = {
      id: createId("mem"),
      scope: input.scope,
      kind: input.kind,
      key: input.key,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt,
    };

    return this.store.upsert(entry);
  }

  recall(query: MemoryQuery): readonly MemoryEntry[] {
    return this.store.query(query);
  }

  forget(id: string): boolean {
    return this.store.remove(id);
  }

  clearScope(scope: MemoryScope): void {
    this.store.clearScope(scope);
  }

  /**
   * Build a context packet for AI providers.
   * Called before every assistant generation.
   */
  buildContext(
    scope: MemoryScope,
    options?: { limit?: number },
  ): MemoryContextPacket {
    const entries = this.store.query({
      scope,
      limit: options?.limit ?? 24,
    });

    return {
      scope,
      entries,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Record a chat message into conversation memory before generation.
   */
  recordMessage(input: {
    conversationId: string;
    messageId: string;
    role: string;
    content: string;
    organizationId?: string | null;
    workspaceId?: string | null;
  }): MemoryEntry {
    return this.remember({
      scope: {
        kind: "conversation",
        id: input.conversationId,
      },
      kind: "message",
      key: input.messageId,
      content: input.content,
      metadata: {
        role: input.role,
        organizationId: input.organizationId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    });
  }

  getStoreSnapshot(): readonly MemoryEntry[] {
    return this.store.snapshot();
  }
}

export const defaultMemoryEngine = new MemoryEngine();
