/**
 * Knowledge engine — company docs, CRM, policies; vector/RAG placeholders.
 */

import type { KnowledgeDocument, KnowledgeSourceKind } from "../types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

export function createKnowledgeDocument(input: {
  readonly organizationId: string;
  readonly kind: KnowledgeSourceKind;
  readonly title: string;
  readonly summary: string;
  readonly sourceRef?: string;
  readonly tags?: readonly string[];
}): KnowledgeDocument {
  return {
    id: createId("know"),
    organizationId: input.organizationId,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    sourceRef: input.sourceRef,
    tags: input.tags ?? [],
    updatedAt: new Date().toISOString(),
  };
}

/** Placeholder retrieval — future vector DB / RAG. */
export function retrieveKnowledge(
  docs: readonly KnowledgeDocument[],
  query: string,
  kinds?: readonly KnowledgeSourceKind[],
): readonly KnowledgeDocument[] {
  const q = query.toLowerCase();
  return docs
    .filter((d) => {
      if (kinds && !kinds.includes(d.kind)) return false;
      if (d.kind === "vector" || d.kind === "rag") {
        // Placeholder: include RAG/vector docs when kinds allow
        return true;
      }
      return (
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .slice(0, 12);
}

export function seedKnowledge(
  organizationId: string,
): readonly KnowledgeDocument[] {
  return [
    createKnowledgeDocument({
      organizationId,
      kind: "company",
      title: "AGXORA Operating Principles",
      summary: "Enterprise OS principles for modular, secure AI agents.",
      tags: ["company", "principles"],
    }),
    createKnowledgeDocument({
      organizationId,
      kind: "policies",
      title: "Data Handling Policy",
      summary: "Sensitive tool isolation and least-privilege access.",
      tags: ["policy", "security"],
    }),
    createKnowledgeDocument({
      organizationId,
      kind: "procedures",
      title: "Customer Escalation Procedure",
      summary: "Support assistant escalation path for low-confidence cases.",
      tags: ["support", "procedure"],
    }),
    createKnowledgeDocument({
      organizationId,
      kind: "rag",
      title: "RAG Index Placeholder",
      summary: "Future vector retrieval over documents and CRM notes.",
      tags: ["rag", "vector"],
    }),
  ];
}
