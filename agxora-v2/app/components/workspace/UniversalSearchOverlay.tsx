"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import {
  AI_SEARCH_CAPABILITIES,
  buildRecentActivity,
  buildSearchIndex,
  clearRecentSearches,
  getFavoriteIds,
  getRecentSearches,
  groupResults,
  GROUP_LABELS,
  pushRecentSearch,
  resolveRelated,
  searchIndex,
  toggleFavorite,
  type SearchResult,
} from "../../lib/workspace";
import { Badge, Button, EmptyState } from "../ui";
import { SearchPreview } from "./SearchPreview";
import { VirtualResultList } from "./VirtualResultList";

type FlatRow =
  | { readonly type: "header"; readonly id: string; readonly label: string }
  | { readonly type: "item"; readonly id: string; readonly item: SearchResult; readonly flatIndex: number };

/**
 * Universal Search + Command Palette — AGXORA OS layer.
 * Ctrl/Cmd+K · ESC · arrow navigation · recent · favorites · preview · smart links.
 */
export function UniversalSearchOverlay(): JSX.Element | null {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [recent, setRecent] = useState<readonly string[]>([]);
  const [favorites, setFavorites] = useState<readonly string[]>([]);

  const index = useMemo(() => buildSearchIndex(), []);
  const activity = useMemo(() => buildRecentActivity(), []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onCustom = (): void => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("agxora:command-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("agxora:command-palette", onCustom);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setRecent(getRecentSearches());
      setFavorites(getFavoriteIds());
      setActiveIndex(0);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const results = useMemo(() => searchIndex(index, query, { limit: 100 }), [index, query]);

  const pinnedResults = useMemo(() => {
    const favSet = new Set(favorites);
    return index.filter((item) => favSet.has(item.id) && item.pinnable);
  }, [index, favorites]);

  const grouped = useMemo(() => groupResults(results), [results]);

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    let flatIndex = 0;
    if (!query.trim() && pinnedResults.length > 0) {
      rows.push({ type: "header", id: "hdr-pinned", label: "Pinned Results" });
      for (const item of pinnedResults) {
        rows.push({ type: "item", id: `pin-${item.id}`, item, flatIndex });
        flatIndex += 1;
      }
    }
    for (const block of grouped) {
      rows.push({ type: "header", id: `hdr-${block.group}`, label: block.label });
      for (const item of block.items) {
        rows.push({ type: "item", id: item.id, item, flatIndex });
        flatIndex += 1;
      }
    }
    return rows;
  }, [grouped, pinnedResults, query]);

  const selectable = useMemo(
    () => flatRows.filter((row): row is Extract<FlatRow, { type: "item" }> => row.type === "item"),
    [flatRows],
  );

  const activeItem = selectable[activeIndex]?.item ?? null;
  const previewItem = useMemo(() => {
    if (hoverId) {
      return index.find((item) => item.id === hoverId) ?? activeItem;
    }
    return activeItem;
  }, [hoverId, index, activeItem]);

  const related = useMemo(
    () => resolveRelated(index, previewItem),
    [index, previewItem],
  );

  const close = useCallback((): void => {
    setOpen(false);
    setQuery("");
    setHoverId(null);
    setActiveIndex(0);
  }, []);

  const navigateTo = useCallback(
    (item: SearchResult): void => {
      if (query.trim()) setRecent(pushRecentSearch(query));
      router.push(item.href);
      close();
    },
    [close, query, router],
  );

  const onPin = useCallback((item: SearchResult): void => {
    if (!item.pinnable) return;
    setFavorites(toggleFavorite(item.id));
  }, []);

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(selectable.length - 1, i + 1));
      setHoverId(null);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      setHoverId(null);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) navigateTo(activeItem);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  if (!open) return null;

  const showHome = !query.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal search"
      className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[8vh] sm:px-6"
      style={{ background: "rgba(2,6,23,0.62)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-[24px] border shadow-2xl"
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
          background:
            "linear-gradient(165deg, var(--agx-card-bg-from, rgba(18,24,38,0.98)), var(--agx-card-bg-to, rgba(10,14,24,0.98)))",
          backdropFilter: "var(--agx-card-blur, blur(22px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}
        >
          <span aria-hidden="true" style={{ color: "var(--agx-accent, #22d3ee)" }}>
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search customers, invoices, documents, workflows, settings…"
            aria-label="Universal search query"
            aria-autocomplete="list"
            aria-controls="universal-search-results"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          />
          <kbd
            className="hidden rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide sm:inline"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              color: "var(--agx-text-muted, #94a3b8)",
            }}
          >
            Esc
          </kbd>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div id="universal-search-results" className="min-w-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))" }}>
            {showHome ? (
              <div className="max-h-[min(62vh,560px)] space-y-4 overflow-y-auto p-4">
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      Quick Actions
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {index
                      .filter((item) => item.group === "actions")
                      .map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => navigateTo(action)}
                          className="rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{
                            outlineColor: "var(--agx-accent, #22d3ee)",
                            borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                            color: "var(--agx-text, #f8fafc)",
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          {action.title}
                        </button>
                      ))}
                  </div>
                </section>

                {pinnedResults.length > 0 ? (
                  <section>
                    <h3
                      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      Favorites
                    </h3>
                    <ul className="space-y-1">
                      {pinnedResults.map((item) => (
                        <ResultButton
                          key={`fav-${item.id}`}
                          item={item}
                          active={activeItem?.id === item.id}
                          pinned
                          onHover={() => setHoverId(item.id)}
                          onSelect={() => navigateTo(item)}
                          onPin={() => onPin(item)}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      Recent Searches
                    </h3>
                    {recent.length > 0 ? (
                      <button
                        type="button"
                        className="text-[11px]"
                        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                        onClick={() => {
                          clearRecentSearches();
                          setRecent([]);
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  {recent.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      No recent searches yet. Try “Nordlicht”, “invoice”, or “workflow”.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {recent.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setQuery(term)}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{
                            borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                            color: "var(--agx-accent, #22d3ee)",
                          }}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3
                    className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    Recent Activity
                  </h3>
                  <ul className="space-y-1.5">
                    {activity.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(item.href);
                            close();
                          }}
                          className="w-full rounded-xl border px-3 py-2 text-left transition hover:border-[color-mix(in_srgb,var(--agx-accent,#22d3ee)_30%,transparent)]"
                          style={{
                            borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                              {item.title}
                            </span>
                            <Badge>{GROUP_LABELS[
                              item.kind === "invoice"
                                ? "finance"
                                : item.kind === "customer"
                                  ? "crm"
                                  : item.kind === "automation_run"
                                    ? "automation"
                                    : item.kind === "project"
                                      ? "projects"
                                      : "documents"
                            ]}</Badge>
                          </div>
                          <p className="mt-1 text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                            {item.detail}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3
                    className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    AI Ready (Architecture)
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {AI_SEARCH_CAPABILITIES.map((cap) => (
                      <div
                        key={cap.id}
                        className="rounded-xl border px-3 py-2"
                        style={{
                          borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
                            {cap.title}
                          </p>
                          <Badge tone="warning">{cap.status}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          {cap.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : selectable.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No matches"
                  description="Try another keyword, or open a module via Quick Actions."
                />
              </div>
            ) : (
              <div className="p-2">
                <VirtualResultList
                  items={flatRows}
                  height={420}
                  getKey={(row) => row.id}
                  renderItem={(row) => {
                    if (row.type === "header") {
                      return (
                        <div
                          className="flex h-full items-end px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                        >
                          {row.label}
                        </div>
                      );
                    }
                    const active = activeIndex === row.flatIndex;
                    return (
                      <ResultButton
                        item={row.item}
                        active={active}
                        pinned={favorites.includes(row.item.id)}
                        onHover={() => {
                          setHoverId(row.item.id);
                          setActiveIndex(row.flatIndex);
                        }}
                        onSelect={() => navigateTo(row.item)}
                        onPin={() => onPin(row.item)}
                      />
                    );
                  }}
                />
              </div>
            )}
          </div>

          <div className="p-4">
            <SearchPreview
              item={previewItem}
              related={related}
              onOpenRelated={navigateTo}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={close}>
                Close
              </Button>
              {activeItem ? (
                <Button size="sm" variant="primary" onClick={() => navigateTo(activeItem)}>
                  Open
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              ↑↓ navigate · Enter open · Ctrl/⌘ K toggle · Esc close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultButton({
  item,
  active,
  pinned,
  onHover,
  onSelect,
  onPin,
}: {
  readonly item: SearchResult;
  readonly active: boolean;
  readonly pinned: boolean;
  readonly onHover: () => void;
  readonly onSelect: () => void;
  readonly onPin: () => void;
}): JSX.Element {
  return (
    <div
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onMouseEnter={onHover}
      className="flex h-[56px] items-center gap-2 rounded-xl border px-2"
      style={{
        borderColor: active
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)"
          : "transparent",
        background: active
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 12%, transparent)"
          : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate py-2 text-left"
      >
        <span className="block truncate text-sm font-medium" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {item.title}
        </span>
        <span className="block truncate text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {GROUP_LABELS[item.group]} · {item.subtitle}
        </span>
      </button>
      {item.pinnable ? (
        <button
          type="button"
          aria-label={pinned ? "Unpin result" : "Pin result"}
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className="shrink-0 rounded-lg px-2 py-1 text-xs"
          style={{
            color: pinned ? "var(--agx-accent, #22d3ee)" : "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {pinned ? "★" : "☆"}
        </button>
      ) : null}
    </div>
  );
}
