/**
 * AGXORA AI Workspace — Universal Search OS layer types.
 * Connects every module without mutating module implementations.
 */

export type SearchGroup =
  | "crm"
  | "finance"
  | "documents"
  | "automation"
  | "projects"
  | "creator"
  | "settings"
  | "commands"
  | "actions";

export type SearchResultKind =
  | "customer"
  | "invoice"
  | "document"
  | "project"
  | "workflow"
  | "template"
  | "automation_run"
  | "settings"
  | "team_member"
  | "creator_asset"
  | "knowledge_article"
  | "module"
  | "action";

export interface SearchResult {
  readonly id: string;
  readonly kind: SearchResultKind;
  readonly group: SearchGroup;
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
  readonly keywords: readonly string[];
  readonly meta?: Readonly<Record<string, string>>;
  readonly relatedIds?: readonly string[];
  readonly preview?: string;
  readonly pinnable?: boolean;
}

export interface SearchGroupBlock {
  readonly group: SearchGroup;
  readonly label: string;
  readonly items: readonly SearchResult[];
}

export interface QuickAction {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
  readonly keywords: readonly string[];
}

export interface RecentActivityItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly href: string;
  readonly kind: SearchResultKind;
  readonly at: string;
}

export interface AiSearchCapability {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: "planned" | "architecture";
}
