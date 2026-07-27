export type KnowledgeKind =
  | "profile"
  | "policy"
  | "process"
  | "product"
  | "faq"
  | "metric"
  | "note";

export interface KnowledgeEntry {
  readonly id: string;
  readonly organizationId: string;
  readonly businessType?: string;
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface KnowledgeWriteInput {
  readonly organizationId: string;
  readonly businessType?: string;
  readonly kind: KnowledgeKind;
  readonly title: string;
  readonly content: string;
  readonly tags?: readonly string[];
}

export interface KnowledgeQuery {
  readonly organizationId: string;
  readonly kind?: KnowledgeKind;
  readonly tag?: string;
  readonly limit?: number;
}
