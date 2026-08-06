"use client";

import { useMemo, useState, type JSX } from "react";
import type { MediaAsset, MediaKind } from "../../lib/creator-studio";
import { formatDate, mediaKindLabel } from "../../lib/creator-studio";
import { Badge, Card, DataTable, FilterSelect, SearchField } from "../ui";
import type { DataTableColumn } from "../ui";

const COLUMNS: readonly DataTableColumn<MediaAsset>[] = [
  {
    key: "name",
    header: "Asset",
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "kind",
    header: "Type",
    render: (row) => <Badge tone="accent">{mediaKindLabel(row.kind)}</Badge>,
  },
  { key: "folder", header: "Folder", render: (row) => row.folder },
  {
    key: "tags",
    header: "Tags",
    render: (row) => (
      <div className="flex flex-wrap gap-1.5">
        {row.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    render: (row) => <span className="tabular-nums">{formatDate(row.updatedAt)}</span>,
  },
];

export function MediaLibrary({
  assets,
}: {
  readonly assets: readonly MediaAsset[];
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (kind !== "all" && asset.kind !== kind) return false;
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.folder.toLowerCase().includes(q) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [assets, query, kind]);

  return (
    <Card padding="24px">
      <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        Media Library
      </h3>
      <DataTable
        columns={COLUMNS}
        rows={filtered}
        rowKey={(row) => row.id}
        minWidth={760}
        page={page}
        pageSize={8}
        onPageChange={setPage}
        emptyTitle="No media"
        emptyDescription="Images, videos, documents, logos, and templates will appear here."
        toolbar={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search assets, folders, tags…"
            />
            <FilterSelect
              label="Type"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as MediaKind | "all");
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="logo">Brand Logos</option>
              <option value="template">Templates</option>
            </FilterSelect>
          </div>
        }
      />
    </Card>
  );
}
