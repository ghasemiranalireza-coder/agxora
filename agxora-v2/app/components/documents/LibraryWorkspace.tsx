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
  formatBytes,
  formatDate,
  LIBRARY_VIEWS,
  statusLabel,
} from "../../lib/documents";
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

const FolderTree = memo(function FolderTree({
  folders,
  selectedId,
  onSelect,
}: {
  readonly folders: readonly DocumentFolder[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
}): JSX.Element {
  const roots = folders.filter((f) => f.parentId == null);
  const childrenOf = (id: string) => folders.filter((f) => f.parentId === id);

  const renderNode = (folder: DocumentFolder, depth: number): JSX.Element => {
    const active = selectedId === folder.id;
    return (
      <li key={folder.id}>
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
          {folder.smart ? <Badge tone="accent">Smart</Badge> : null}
          {folder.collection && !folder.smart ? <Badge>Collection</Badge> : null}
          {folder.pinned ? <Badge tone="warning">Pinned</Badge> : null}
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
        className="w-full rounded-xl px-2.5 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
        All folders
      </button>
      <ul className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
        {roots.map((f) => renderNode(f, 0))}
      </ul>
    </div>
  );
});

export function LibraryWorkspace({
  documents,
  folders,
}: {
  readonly documents: readonly KnowledgeDocument[];
  readonly folders: readonly DocumentFolder[];
}): JSX.Element {
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
  const [uploadNotice, setUploadNotice] = useState(
    "Drag & drop upload is a storage API reserved.",
  );

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
          if (!doc.tags.some((t) => ["policy", "process", "faq", "wiki", "manual"].includes(t))) {
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
        ? `${count} file(s) staged for upload (no storage write).`
        : "Drop received (no storage write).",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Library views">
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
            {item.label}
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
        Drag & drop files here to stage an upload. {uploadNotice}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-3 space-y-3" padding="16px" hover={false}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--agx-ds-text)" }}>
            Folders & Collections
          </h3>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Nested folders, collections, smart collections, tags, pinned & favorites.
          </p>
          <FolderTree folders={folders} selectedId={folderId} onSelect={setFolderId} />
        </Card>

        <Card className="xl:col-span-5 space-y-3" padding="16px" hover={false}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
                Document Library
              </h3>
              <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {sorted.length} result{sorted.length === 1 ? "" : "s"}
                {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedIds.size === 0}
              onClick={() =>
                setUploadNotice(`Bulk action queued for ${selectedIds.size} item(s).`)
              }
            >
              Bulk action
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SearchField
              label="Global Search"
              value={query}
              onChange={setQuery}
              placeholder="Name, tags, owner, AI summary…"
            />
            <FilterSelect
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentFileType | "all")}
            >
              <option value="all">All types</option>
              {DOCUMENT_FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {fileTypeLabel(t)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as DocumentStatus | "all")}
            >
              <option value="all">All statuses</option>
              {(["draft", "in_review", "approved", "rejected", "archived"] as const).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="all">All owners</option>
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
              Favorites only
            </label>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title="No documents to show"
              description="Adjust filters, clear search, or add knowledge assets to grow the library."
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
                      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                        aria-label={`Select ${doc.name}`}
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
                          {fileTypeLabel(doc.fileType)} · {formatBytes(doc.sizeBytes)} ·{" "}
                          {doc.owner} · {formatDate(doc.updatedAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {doc.favorite ? <Badge tone="warning">Favorite</Badge> : null}
                          {doc.pinned ? <Badge tone="accent">Pinned</Badge> : null}
                          {doc.shared ? <Badge>Shared</Badge> : null}
                          {doc.tags.slice(0, 3).map((t) => (
                            <Badge key={t}>{t}</Badge>
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
        title="Version History"
        onClose={() => setVersionsOpen(false)}
        wide
        footer={
          <Button variant="secondary" onClick={() => setVersionsOpen(false)}>
            Close
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
          onAction={(label) => {
            setUploadNotice(`${label} action for ${contextMenu.id}.`);
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
  readonly onAction: (label: string) => void;
  readonly onClose: () => void;
}): JSX.Element {
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
      {["Open", "Share", "Favorite", "Move", "Delete"].map((label) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
          style={{ color: "var(--agx-ds-text)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "color-mix(in srgb, var(--agx-ds-accent) 12%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          onClick={() => onAction(label)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs"
        style={{ color: "var(--agx-ds-text-muted)" }}
        onClick={onClose}
      >
        Dismiss
      </button>
    </div>
  );
}
