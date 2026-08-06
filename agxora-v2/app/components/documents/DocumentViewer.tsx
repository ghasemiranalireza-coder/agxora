"use client";

import { useMemo, useState, type JSX, type ReactNode } from "react";
import type { KnowledgeDocument } from "../../lib/documents";
import {
  fileTypeLabel,
  formatBytes,
  formatDateTime,
  moduleLabel,
  shareLabel,
} from "../../lib/documents";
import { Badge, Button, Card, EmptyState } from "../ui";
import { DocStatusBadge } from "./shared/StatusBadges";

export function DocumentViewer({
  document,
  onOpenVersions,
}: {
  readonly document: KnowledgeDocument | null;
  readonly onOpenVersions?: (doc: KnowledgeDocument) => void;
}): JSX.Element {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const hit = useMemo(() => {
    if (!document || !query.trim()) return null;
    const idx = document.previewText.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return "No matches in preview text.";
    const start = Math.max(0, idx - 40);
    const end = Math.min(document.previewText.length, idx + query.length + 40);
    return `…${document.previewText.slice(start, end)}…`;
  }, [document, query]);

  if (!document) {
    return (
      <Card className="h-full" padding="24px" hover={false}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          Document Viewer
        </h3>
        <EmptyState
          title="Select a document"
          description="Choose a file from the library to preview content, metadata, tags, versions, and linked modules."
        />
      </Card>
    );
  }

  return (
    <Card className="h-full space-y-4" padding="24px" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {document.name}
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {fileTypeLabel(document.fileType)} · {formatBytes(document.sizeBytes)} ·{" "}
            {document.version}
          </p>
        </div>
        <DocStatusBadge status={document.status} />
      </div>

      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border p-2"
        style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
      >
        <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(60, z - 10))}>
          Zoom −
        </Button>
        <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {zoom}%
        </span>
        <Button size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(160, z + 10))}>
          Zoom +
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <span className="text-xs tabular-nums" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Page {page} / {document.pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= document.pages}
          onClick={() => setPage((p) => Math.min(document.pages, p + 1))}
        >
          Next
        </Button>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Search inside
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find in preview…"
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            outlineColor: "var(--agx-accent, #22d3ee)",
            borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
            background: "rgba(0,0,0,0.2)",
            color: "var(--agx-text, #f8fafc)",
          }}
        />
      </label>

      <div
        className="min-h-[180px] overflow-auto rounded-2xl border p-4 transition-transform"
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
          background: "rgba(0,0,0,0.22)",
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {document.previewText}
        </p>
        {hit ? (
          <p className="mt-3 text-xs" style={{ color: "var(--agx-accent, #22d3ee)" }}>
            {hit}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Meta label="Owner" value={document.owner} />
        <Meta label="Created" value={formatDateTime(document.createdAt)} />
        <Meta label="Updated" value={formatDateTime(document.updatedAt)} />
        <Meta label="File Type" value={fileTypeLabel(document.fileType)} />
        <Meta label="Size" value={formatBytes(document.sizeBytes)} />
        <Meta label="Category" value={document.category} />
        <Meta label="Department" value={document.department} />
        <Meta label="Status" value={<DocStatusBadge status={document.status} />} />
        <Meta label="Retention" value={document.retention} />
        <Meta label="Version" value={document.version} />
        <Meta label="Sharing" value={shareLabel(document.shareScope)} />
      </dl>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Tags
        </p>
        <div className="flex flex-wrap gap-1.5">
          {document.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Linked Modules
        </p>
        <div className="flex flex-wrap gap-1.5">
          {document.linkedModules.length > 0 ? (
            document.linkedModules.map((m) => (
              <Badge key={m} tone="accent">
                {moduleLabel(m)}
              </Badge>
            ))
          ) : (
            <span className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              No module links yet
            </span>
          )}
        </div>
      </div>

      {onOpenVersions ? (
        <Button variant="primary" size="sm" onClick={() => onOpenVersions(document)}>
          Version History
        </Button>
      ) : null}
    </Card>
  );
}

function Meta({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}): JSX.Element {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b py-2"
      style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.06))" }}
    >
      <dt style={{ color: "var(--agx-text-muted, #94a3b8)" }}>{label}</dt>
      <dd className="max-w-[60%] text-right" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {value}
      </dd>
    </div>
  );
}
