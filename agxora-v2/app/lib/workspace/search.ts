import type { SearchGroup, SearchGroupBlock, SearchResult } from "./types";

export const GROUP_LABELS: Record<SearchGroup, string> = {
  crm: "CRM",
  finance: "Finance",
  documents: "Documents",
  automation: "Automation",
  projects: "Projects",
  creator: "Creator Studio",
  settings: "Settings",
  commands: "Commands",
  actions: "Quick Actions",
};

const GROUP_ORDER: readonly SearchGroup[] = [
  "actions",
  "commands",
  "crm",
  "finance",
  "documents",
  "automation",
  "projects",
  "creator",
  "settings",
];

function scoreResult(item: SearchResult, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  const hay = [item.title, item.subtitle, ...item.keywords, item.preview ?? ""]
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (item.title.toLowerCase().startsWith(token)) score += 12;
    else if (item.title.toLowerCase().includes(token)) score += 8;
    if (item.subtitle.toLowerCase().includes(token)) score += 3;
    if (item.keywords.some((k) => k.toLowerCase().includes(token))) score += 4;
    if (hay.includes(token)) score += 1;
  }
  return score;
}

export function searchIndex(
  index: readonly SearchResult[],
  query: string,
  options?: { readonly limit?: number },
): readonly SearchResult[] {
  const q = query.trim().toLowerCase();
  const limit = options?.limit ?? 80;
  if (!q) return index.slice(0, limit);

  const tokens = q.split(/\s+/).filter(Boolean);
  return index
    .map((item) => ({ item, score: scoreResult(item, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((row) => row.item);
}

export function groupResults(results: readonly SearchResult[]): readonly SearchGroupBlock[] {
  const map = new Map<SearchGroup, SearchResult[]>();
  for (const item of results) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return GROUP_ORDER.filter((g) => (map.get(g)?.length ?? 0) > 0).map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: map.get(group) ?? [],
  }));
}

export function resolveRelated(
  index: readonly SearchResult[],
  item: SearchResult | null,
): readonly SearchResult[] {
  if (!item?.relatedIds?.length) return [];
  const byId = new Map(index.map((r) => [r.id, r]));
  return item.relatedIds
    .map((id) => byId.get(id))
    .filter((r): r is SearchResult => Boolean(r))
    .slice(0, 6);
}

export const AI_SEARCH_CAPABILITIES = [
  {
    id: "ai-search",
    title: "AI Search",
    description: "Rank results with a future retrieval model across modules.",
    status: "architecture" as const,
  },
  {
    id: "semantic",
    title: "Semantic Search",
    description: "Vector similarity over documents, invoices, and knowledge.",
    status: "planned" as const,
  },
  {
    id: "nl",
    title: "Natural Language Search",
    description: "Parse intents like “overdue invoices for Nordlicht”.",
    status: "planned" as const,
  },
  {
    id: "rag",
    title: "Knowledge Retrieval",
    description: "Ground answers in the Documents Knowledge Hub corpus.",
    status: "architecture" as const,
  },
] as const;
