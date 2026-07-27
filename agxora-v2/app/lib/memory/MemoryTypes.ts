/**
 * Memory architecture types — no persistence yet.
 * Scopes are universal across industries and organizations.
 */

export type MemoryScopeKind =
  | "workspace"
  | "organization"
  | "user"
  | "preferences"
  | "history"
  | "knowledge"
  | "context"
  | "conversation";

export interface MemoryScope {
  readonly kind: MemoryScopeKind;
  readonly id: string;
}

export type MemoryEntryKind =
  | "message"
  | "preference"
  | "fact"
  | "summary"
  | "context"
  | "event";

export interface MemoryEntry {
  readonly id: string;
  readonly scope: MemoryScope;
  readonly kind: MemoryEntryKind;
  readonly key: string;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt?: string;
}

export interface MemoryWriteInput {
  readonly scope: MemoryScope;
  readonly kind: MemoryEntryKind;
  readonly key: string;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly expiresAt?: string;
}

export interface MemoryQuery {
  readonly scope: MemoryScope;
  readonly kind?: MemoryEntryKind;
  readonly key?: string;
  readonly limit?: number;
}

export interface MemoryContextPacket {
  readonly scope: MemoryScope;
  readonly entries: readonly MemoryEntry[];
  readonly generatedAt: string;
}
