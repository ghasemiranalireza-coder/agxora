"use client";

import { useMemo, useState, type JSX } from "react";
import type { MediaAsset, MediaKind } from "../../lib/creator-studio";
import { formatDate, mediaKindLabel } from "../../lib/creator-studio";
import { useT } from "../../lib/i18n";
import { Badge, Card, DataTable, FilterSelect, SearchField } from "../ui";
import type { DataTableColumn } from "../ui";

export function MediaLibrary({
  assets,
}: {
  readonly assets: readonly MediaAsset[];
}): JSX.Element {
  const t = useT();
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

  const columns = useMemo<readonly DataTableColumn<MediaAsset>[]>(
    () => [
      {
        key: "name",
        header: t("creator.media.columns.asset"),
        render: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "kind",
        header: t("creator.media.columns.type"),
        render: (row) => <Badge tone="accent">{mediaKindLabel(row.kind)}</Badge>,
      },
      {
        key: "folder",
        header: t("creator.media.columns.folder"),
        render: (row) => row.folder,
      },
      {
        key: "tags",
        header: t("creator.media.columns.tags"),
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
        header: t("creator.media.columns.updated"),
        render: (row) => <span className="tabular-nums">{formatDate(row.updatedAt)}</span>,
      },
    ],
    [t],
  );

  return (
    <Card padding="24px">
      <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
        {t("creator.media.title")}
      </h3>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        minWidth={760}
        page={page}
        pageSize={8}
        onPageChange={setPage}
        emptyTitle={t("creator.media.emptyTitle")}
        emptyDescription={t("creator.media.emptyDescription")}
        toolbar={
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <SearchField
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder={t("creator.media.searchPlaceholder")}
            />
            <FilterSelect
              label={t("creator.media.typeFilter")}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as MediaKind | "all");
                setPage(1);
              }}
            >
              <option value="all">{t("creator.media.allTypes")}</option>
              <option value="image">{t("creator.media.images")}</option>
              <option value="video">{t("creator.media.videos")}</option>
              <option value="document">{t("creator.media.documents")}</option>
              <option value="logo">{t("creator.media.logos")}</option>
              <option value="template">{t("creator.media.templates")}</option>
            </FilterSelect>
          </div>
        }
      />
    </Card>
  );
}
