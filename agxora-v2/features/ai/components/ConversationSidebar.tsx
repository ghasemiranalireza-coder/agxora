"use client";

import {
  useMemo,
  useState,
  type JSX,
  type MouseEvent,
} from "react";
import { Button, SearchField } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { aiConversationStore } from "../store/conversationStore";
import { useAiConversationSummaries } from "../hooks/useAiConversations";
import type { AiConversationSummary } from "../types";

export interface ConversationSidebarProps {
  readonly activeId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onCreate: () => void;
}

export function ConversationSidebar({
  activeId,
  onSelect,
  onCreate,
}: ConversationSidebarProps): JSX.Element {
  const t = useT();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const summaries = useAiConversationSummaries(query, showArchived);

  const pinned = useMemo(
    () => summaries.filter((s) => s.pinned),
    [summaries],
  );
  const rest = useMemo(
    () => summaries.filter((s) => !s.pinned),
    [summaries],
  );

  const startRename = (row: AiConversationSummary, event: MouseEvent) => {
    event.stopPropagation();
    setRenamingId(row.id);
    setRenameValue(row.title);
  };

  const commitRename = () => {
    if (renamingId) {
      aiConversationStore.renameConversation(renamingId, renameValue);
    }
    setRenamingId(null);
  };

  const renderRow = (row: AiConversationSummary) => {
    const active = row.id === activeId;
    return (
      <div
        key={row.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(row.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(row.id);
        }}
        className="group rounded-xl px-2.5 py-2 text-left transition"
        style={{
          background: active
            ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 14%, transparent)"
            : "transparent",
          border: active
            ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 30%, transparent)"
            : "1px solid transparent",
          cursor: "pointer",
        }}
      >
        {renamingId === row.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenamingId(null);
            }}
            className="w-full rounded-md bg-transparent px-1 text-sm outline-none"
            style={{
              color: "var(--agx-text, #f8fafc)",
              border:
                "1px solid color-mix(in srgb, var(--agx-border, #334155) 80%, transparent)",
            }}
          />
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="truncate text-sm font-medium"
                style={{ color: "var(--agx-text, #f8fafc)" }}
              >
                {row.pinned ? (
                  <span
                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--agx-accent, #22d3ee)" }}
                    aria-hidden
                  />
                ) : null}
                {row.title}
              </p>
              <p
                className="mt-0.5 line-clamp-1 text-[11px]"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {row.preview || t("ai.conversationSidebar.emptyPreview")}
              </p>
            </div>
          </div>
        )}
        <div
          className="mt-1.5 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          <Action
            label={row.pinned ? t("ai.conversationSidebar.unpin") : t("ai.conversationSidebar.pin")}
            onClick={(e) => {
              e.stopPropagation();
              aiConversationStore.pinConversation(row.id, !row.pinned);
            }}
          />
          <Action label={t("ai.conversationSidebar.rename")} onClick={(e) => startRename(row, e)} />
          <Action
            label={row.archived ? t("ai.conversationSidebar.unarchive") : t("ai.conversationSidebar.archive")}
            onClick={(e) => {
              e.stopPropagation();
              aiConversationStore.archiveConversation(row.id, !row.archived);
            }}
          />
          <Action
            label={t("ai.conversationSidebar.delete")}
            onClick={(e) => {
              e.stopPropagation();
              aiConversationStore.deleteConversation(row.id);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("ai.conversationSidebar.title")}
        </p>
        <Button size="sm" variant="primary" onClick={onCreate}>
          {t("ai.conversationSidebar.new")}
        </Button>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t("ai.conversationSidebar.searchPlaceholder")}
        aria-label={t("ai.conversationSidebar.searchAria")}
      />
      <label
        className="flex items-center gap-2 text-[11px]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        {t("ai.conversationSidebar.showArchived")}
      </label>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {pinned.length > 0 ? (
          <section className="mb-2 space-y-1">
            <p
              className="px-1 text-[10px] uppercase tracking-wider"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t("ai.conversationSidebar.pinned")}
            </p>
            {pinned.map(renderRow)}
          </section>
        ) : null}
        {rest.map(renderRow)}
        {summaries.length === 0 ? (
          <p
            className="px-1 py-6 text-center text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("ai.conversationSidebar.noConversations")}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function Action({
  label,
  onClick,
}: {
  label: string;
  onClick: (e: MouseEvent) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className="rounded px-1.5 py-0.5 text-[10px] hover:opacity-100"
      style={{
        background:
          "color-mix(in srgb, var(--agx-bg-elevated, #0f172a) 70%, transparent)",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
