"use client";

import { memo, useEffect, useMemo, useState, type DragEvent, type JSX } from "react";
import type {
  DocumentFileType,
  DocumentFolder,
  DocumentStatus,
  KnowledgeDocument,
  LibraryView,
} from "../../lib/documents";
import {
  DOCUMENT_FILE_TYPES,
  fileTypeLabel,
  formatBytesLocalized,
  formatDate,
  LIBRARY_VIEWS,
  statusLabel,
} from "../../lib/documents";
import { formatNumber, useLocale } from "../../lib/i18n";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterSelect,
  OVERLAY_Z,
  SearchField,
  isTopOverlay,
  pushOverlay,
} from "../ui";
import { DocumentViewer } from "./DocumentViewer";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { DocStatusBadge } from "./shared/StatusBadges";
import { DocumentsDialog } from "./shared/DocumentsDialog";

type ContextAction = "open" | "share" | "favorite" | "move" | "delete";

type UploadNotice =
  | { readonly kind: "uploadReserved" }
  | { readonly kind: "filesStaged"; readonly count: number }
  | { readonly kind: "dropReceived" }
  | { readonly kind: "bulkUnavailable"; readonly count: number }
  | {
      readonly kind: "contextUnavailable";
      readonly action: ContextAction;
      readonly id: string;
    };

const CONTEXT_ACTIONS: readonly ContextAction[] = [
  "open",
  "share",
  "favorite",
  "move",
  "delete",
];

const FolderTree = memo(function FolderTree({
  folders,
  selectedId,
  onSelect,
}: {
  readonly folders: readonly DocumentFolder[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}): JSX.Element {
  const { t } = useLocale();
  const roots = folders.filter((f) => f.parentId == null);
  const childrenOf = (id: string) => folders.filter((f) => f.parentId === id);

  const renderNode = (folder: DocumentFolder, depth: number): JSX.Element => {
    const active = selectedId === folder.id;
    return (
      <li key={folder.id}>
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            outlineColor: "var(--agx-accent, #22d3ee)",
            paddingLeft: 10 + depth * 12,
            background: active
              ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
              : "transparent",
            color: active ? "var(--agx-accent, #22d3ee)" : "var(--agx-text, #f8fafc)",
          }}
        >
          <span className="truncate">{folder.name}</span>
          {folder.smart ? <Badge tone="accent">{t("documents.library.smart")}</Badge> : null}
          {folder.collection && !folder.smart ? (
            <Badge>{t("documents.library.collection")}</Badge>
          ) : null}
          {folder.pinned ? (
            <Badge tone="warning">{t("documents.library.pinned")}</Badge>
          ) : null}
        </button>
        {childrenOf(folder.id).length > 0 ? (
          <ul>{childrenOf(folder.id).map((c) => renderNode(c, depth + 1))}</ul>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="w-full rounded-xl px-2.5 py-2 text-start text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          outlineColor: "var(--agx-accent, #22d3ee)",
          background:
            selectedId == null
              ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
              : "transparent",
          color:
            selectedId == null ? "var(--agx-accent, #22d3ee)" : "var(--agx-text, #f8fafc)",
        }}
      >
        {t("documents.library.allFolders")}
      </button>
      <ul className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
        {roots.map((f) => renderNode(f, 0))}
      </ul>
    </div>
  );
});

function resolveUploadNotice(
  notice: UploadNotice,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  switch (notice.kind) {
    case "uploadReserved":
      return t("documents.library.uploadReserved");
    case "filesStaged":
      return t("documents.library.filesStaged", { count: notice.count });
    case "dropReceived":
      return t("documents.library.dropReceived");
    case "bulkUnavailable":
      return t("documents.library.bulkUnavailable", { count: notice.count });
    case "contextUnavailable":
      return t("documents.library.context.unavailable", {
        action: t(`documents.library.context.${notice.action}`),
        id: notice.id,
      });
  }
}

export function LibraryWorkspace({
  documents,
  folders,
}: {
  readonly documents: readonly KnowledgeDocument[];
  readonly folders: readonly DocumentFolder[];
}): JSX.Element {
  const { t } = useLocale();
  const [view, setView] = useState<LibraryView>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocumentFileType | "all">("all");
  const [status, setStatus] = useState<DocumentStatus | "all">("all");
  const [department, setDepartment] = useState("all");
  const [owner, setOwner] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(documents[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(
    null,
  );
  const [uploadNotice, setUploadNotice] = useState<UploadNotice>({
    kind: "uploadReserved",
  });

  const departments = useMemo(
    () => Array.from(new Set(documents.map((d) => d.department))).sort(),
    [documents],
  );
  const owners = useMemo(
    () => Array.from(new Set(documents.map((d) => d.owner))).sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (view === "recent") {
        /* keep all non-trashed; sorted later */
        if (doc.trashed) return false;
      } else if (view === "favorites") {
        if (!doc.favorite || doc.trashed) return false;
      } else if (view === "shared") {
        if (!doc.shared || doc.trashed) return false;
      } else if (view === "archived") {
        if (!doc.archived) return false;
      } else if (view === "trash") {
        if (!doc.trashed) return false;
      } else if (view === "knowledge") {
        if (doc.trashed) return false;
        if (!["Policy", "Process", "FAQ", "Manual", "Brand"].includes(doc.category) && !doc.tags.includes("policy")) {
          // show knowledge-oriented docs lightly
          if (!doc.tags.some((tag) => ["policy", "process", "faq", "wiki", "manual"].includes(tag))) {
            return false;
          }
        }
      } else if (doc.trashed || doc.archived) {
        return false;
      }

      if (folderId && doc.folderId !== folderId) return false;
      if (type !== "all" && doc.fileType !== type) return false;
      if (status !== "all" && doc.status !== status) return false;
      if (department !== "all" && doc.department !== department) return false;
      if (owner !== "all" && doc.owner !== owner) return false;
      if (favoritesOnly && !doc.favorite) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [
          doc.name,
          doc.owner,
          doc.category,
          doc.department,
          ...doc.tags,
          doc.ai.summary,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [documents, view, folderId, type, status, department, owner, favoritesOnly, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (view === "recent") {
      list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filtered, view]);

  const selected = useMemo(
    () => sorted.find((d) => d.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const toggleSelect = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const count = e.dataTransfer.files?.length ?? 0;
    setUploadNotice(
      count > 0
        ? { kind: "filesStaged", count }
        : { kind: "dropReceived" },
    );
  };

  const resultsLabel =
    sorted.length === 1
      ? t("documents.library.resultOne", { count: formatNumber(sorted.length) })
      : t("documents.library.results", { count: formatNumber(sorted.length) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("documents.library.viewsAria")}>
        {LIBRARY_VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            onClick={() => {
              setView(item.id);
              setSelectedId(null);
            }}
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              outlineColor: "var(--agx-accent, #22d3ee)",
              borderColor:
                view === item.id
                  ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                  : "var(--agx-card-border, rgba(255,255,255,0.1))",
              background:
                view === item.id
                  ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
                  : "transparent",
              color:
                view === item.id
                  ? "var(--agx-accent, #22d3ee)"
                  : "var(--agx-text-muted, #94a3b8)",
            }}
          >
            {t(`documents.library.views.${item.id}`)}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-2xl border border-dashed px-4 py-3 text-sm transition-colors"
        style={{
          borderColor: "color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)",
          color: "var(--agx-text-muted, #94a3b8)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {t("documents.library.dropzone")} {resolveUploadNotice(uploadNotice, t)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-3 space-y-3" padding="16px" hover={false}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-ds-text)" }}>
            {t("documents.library.foldersTitle")}
          </h3>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("documents.library.foldersHint")}
          </p>
          <FolderTree folders={folders} selectedId={folderId} onSelect={setFolderId} />
        </Card>

        <Card className="xl:col-span-5 space-y-3" padding="16px" hover={false}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {t("documents.library.title")}
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {resultsLabel}
                {selectedIds.size > 0
                  ? ` ${t("documents.library.selected", {
                      count: formatNumber(selectedIds.size),
                    })}`
                  : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedIds.size === 0}
              onClick={() =>
                setUploadNotice({
                  kind: "bulkUnavailable",
                  count: selectedIds.size,
                })
              }
            >
              {t("documents.library.bulkAction")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SearchField
              label={t("documents.library.searchLabel")}
              value={query}
              onChange={setQuery}
              placeholder={t("documents.library.searchPlaceholder")}
            />
            <FilterSelect
              label={t("documents.library.typeLabel")}
              value={type}
              onChange={(e) => setType(e.target.value as DocumentFileType | "all")}
            >
              <option value="all">{t("documents.library.allTypes")}</option>
              {DOCUMENT_FILE_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {t(fileTypeLabel(ft))}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("documents.library.statusLabel")}
              value={status}
              onChange={(e) => setStatus(e.target.value as DocumentStatus | "all")}
            >
              <option value="all">{t("documents.library.allStatuses")}</option>
              {(["draft", "in_review", "approved", "rejected", "archived"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(statusLabel(s))}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("documents.library.departmentLabel")}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">{t("documents.library.allDepartments")}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("documents.library.ownerLabel")}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="all">{t("documents.library.allOwners")}</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </FilterSelect>
            <label className="flex items-end gap-2 pb-2 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
              />
              {t("documents.library.favoritesOnly")}
            </label>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title={t("documents.library.emptyTitle")}
              description={t("documents.library.emptyDescription")}
            />
          ) : (
            <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1" role="listbox">
              {sorted.map((doc) => {
                const active = selected?.id === doc.id;
                const checked = selectedIds.has(doc.id);
                return (
                  <li key={doc.id}>
                    <div
                      role="option"
                      aria-selected={active}
                      tabIndex={0}
                      onClick={() => setSelectedId(doc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(doc.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, id: doc.id });
                      }}
                      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        outlineColor: "var(--agx-accent, #22d3ee)",
                        borderColor: active
                          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
                          : "var(--agx-card-border, rgba(255,255,255,0.08))",
                        background: active
                          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(doc.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("documents.library.selectAria", { name: doc.name })}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="truncate font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                            {doc.name}
                          </p>
                          <DocStatusBadge status={doc.status} />
                        </div>
                        <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          {t(fileTypeLabel(doc.fileType))} · {formatBytesLocalized(doc.sizeBytes, t)} ·{" "}
                          {doc.owner} · {formatDate(doc.updatedAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.favorite ? (
                            <Badge tone="warning">{t("documents.library.favorite")}</Badge>
                          ) : null}
                          {doc.pinned ? (
                            <Badge tone="accent">{t("documents.library.pinned")}</Badge>
                          ) : null}
                          {doc.shared ? (
                            <Badge>{t("documents.library.sharedBadge")}</Badge>
                          ) : null}
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <DocumentViewer
            document={selected}
            onOpenVersions={() => setVersionsOpen(true)}
          />
        </div>
      </div>

      <DocumentsDialog
        open={versionsOpen}
        title={t("documents.library.versionHistoryTitle")}
        onClose={() => setVersionsOpen(false)}
        wide
        footer={
          <Button variant="secondary" onClick={() => setVersionsOpen(false)}>
            {t("documents.library.close")}
          </Button>
        }
      >
        <VersionHistoryPanel document={selected} />
      </DocumentsDialog>

      {contextMenu ? (
        <LibraryContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          docId={contextMenu.id}
          onAction={(action) => {
            setUploadNotice({
              kind: "contextUnavailable",
              action,
              id: contextMenu.id,
            });
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

function LibraryContextMenu({
  x,
  y,
  docId,
  onAction,
  onClose,
}: {
  readonly x: number;
  readonly y: number;
  readonly docId: string;
  readonly onAction: (action: ContextAction) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const { t } = useLocale();

  useEffect(() => {
    const close = (): void => onClose();
    const pop = pushOverlay(close);
    const onEsc = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (!isTopOverlay(close)) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    const onPointer = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      const menu = document.getElementById(`library-ctx-${docId}`);
      if (menu && target && !menu.contains(target)) close();
    };
    window.addEventListener("keydown", onEsc, true);
    window.addEventListener("mousedown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onEsc, true);
      window.removeEventListener("mousedown", onPointer, true);
      pop();
    };
  }, [docId, onClose]);

  return (
    <div
      id={`library-ctx-${docId}`}
      role="menu"
      className="fixed min-w-[180px] rounded-xl border p-1.5 shadow-xl"
      style={{
        zIndex: OVERLAY_Z.popover,
        top: y,
        left: x,
        borderColor: "var(--agx-ds-border)",
        background: "var(--agx-ds-elevated)",
        color: "var(--agx-ds-text)",
        boxShadow: "var(--agx-ds-shadow-lg)",
      }}
    >
      {CONTEXT_ACTIONS.map((action) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          className="block w-full rounded-lg px-3 py-2 text-start text-sm transition-colors"
          style={{ color: "var(--agx-ds-text)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--agx-ds-accent) 12%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          onClick={() => onAction(action)}
        >
          {t(`documents.library.context.${action}`)}
        </button>
      ))}
      <button
        type="button"
        className="mt-1 block w-full rounded-lg px-3 py-2 text-start text-xs"
        style={{ color: "var(--agx-ds-text-muted)" }}
        onClick={onClose}
      >
        {t("documents.library.context.dismiss")}
      </button>
    </div>
  );
}
