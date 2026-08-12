/**
 * AGXORA AI Documents & Knowledge Hub — domain types.
 * Central knowledge system architecture. Future API ready.
 */

export type DocumentFileType =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "image"
  | "video"
  | "audio"
  | "markdown"
  | "text"
  | "json"
  | "csv"
  | "other";

export type DocumentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "archived";

export type ShareScope =
  | "private"
  | "organization"
  | "department"
  | "specific_users"
  | "public_link";

export type LinkedModuleKey =
  | "crm"
  | "finance"
  | "automation"
  | "creator"
  | "hr"
  | "projects";

export type KnowledgeKind =
  | "article"
  | "policy"
  | "process"
  | "manual"
  | "faq"
  | "wiki";

export type ActivityKind =
  | "change"
  | "upload"
  | "view"
  | "share"
  | "audit";

export type IntegrationStatus = "connected" | "beta" | "planned" | "coming_soon" | "disabled";

export type LibraryView =
  | "all"
  | "recent"
  | "favorites"
  | "shared"
  | "archived"
  | "trash"
  | "knowledge";

export interface DocumentsKpi {
  readonly id: string;
  readonly label: string;
  /**
   * Display value: raw number (format at render) or ready-made string
   * for non-numeric scores.
   */
  readonly value: string | number;
  /** When set, value is treated as byte size for formatBytes. */
  readonly valueBytes?: number;
  readonly caption: string;
  readonly delta?: {
    readonly positive: boolean;
    readonly count?: number;
    readonly sizeBytes?: number;
    readonly percent?: number;
  };
}

export interface DocumentFolder {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly pinned?: boolean;
  readonly favorite?: boolean;
  readonly smart?: boolean;
  readonly collection?: boolean;
  readonly tags?: readonly string[];
  readonly category?: string;
}

export interface DocumentVersion {
  readonly id: string;
  readonly version: string;
  readonly createdAt: string;
  readonly author: string;
  readonly notes: string;
  readonly sizeBytes: number;
}

export interface DocumentAiInsights {
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly classification: string;
  readonly suggestedTags: readonly string[];
  readonly suggestedFolder: string;
  readonly relatedDocumentIds: readonly string[];
  readonly duplicateOfId?: string;
  readonly translationReady: boolean;
  readonly ocrReady: boolean;
}

export interface KnowledgeDocument {
  readonly id: string;
  readonly name: string;
  readonly fileType: DocumentFileType;
  readonly sizeBytes: number;
  readonly owner: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly category: string;
  readonly department: string;
  readonly status: DocumentStatus;
  readonly retention: string;
  readonly version: string;
  readonly tags: readonly string[];
  readonly folderId: string;
  readonly favorite: boolean;
  readonly pinned: boolean;
  readonly shared: boolean;
  readonly archived: boolean;
  readonly trashed: boolean;
  readonly shareScope: ShareScope;
  readonly linkedModules: readonly LinkedModuleKey[];
  readonly pages: number;
  readonly previewText: string;
  readonly versions: readonly DocumentVersion[];
  readonly ai: DocumentAiInsights;
}

export interface KnowledgeArticle {
  readonly id: string;
  readonly title: string;
  readonly kind: KnowledgeKind;
  readonly summary: string;
  readonly owner: string;
  readonly updatedAt: string;
  readonly tags: readonly string[];
  readonly status: DocumentStatus;
}

export interface DocumentActivity {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly detail: string;
  readonly actor: string;
  readonly at: string;
  readonly documentId?: string;
}

export interface DocumentIntegration {
  readonly id: string;
  readonly name: string;
  readonly adapter: string;
  readonly status: IntegrationStatus;
  readonly description: string;
}

export interface SecurityControl {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: "enabled" | "placeholder" | "planned";
}
