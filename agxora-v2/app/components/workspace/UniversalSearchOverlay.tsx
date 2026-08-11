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
  pushRecentSearch,
  resolveRelated,
  searchIndex,
  toggleFavorite,
  type SearchResult,
} from "../../lib/workspace";
import {
  localizeSearchResult,
  localizeSearchResults,
  searchGroupLabel,
} from "../../lib/workspace/search-i18n";
import { useLocale } from "../../lib/i18n";
import { Badge, Button, EmptyState } from "../ui";
import { OVERLAY_Z, lockBodyScroll, pushOverlay, isTopOverlay } from "../ui/overlayStack";
import { SearchPreview } from "./SearchPreview";
import { VirtualResultList } from "./VirtualResultList";
import { createPortal } from "react-dom";

type FlatRow =
  | { readonly type: "header"; readonly id: string; readonly label: string }
  | { readonly type: "item"; readonly id: string; readonly item: SearchResult; readonly flatIndex: number };

const CAPABILITY_KEYS: Record<
  string,
  { readonly titleKey: string; readonly descriptionKey: string }
> = {
  "ai-search": {
    titleKey: "dashboard.search.capabilities.aiSearch.title",
    descriptionKey: "dashboard.search.capabilities.aiSearch.description",
  },
  semantic: {
    titleKey: "dashboard.search.capabilities.semantic.title",
    descriptionKey: "dashboard.search.capabilities.semantic.description",
  },
  nl: {
    titleKey: "dashboard.search.capabilities.nl.title",
    descriptionKey: "dashboard.search.capabilities.nl.description",
  },
  rag: {
    titleKey: "dashboard.search.capabilities.rag.title",
    descriptionKey: "dashboard.search.capabilities.rag.description",
  },
};

/**
 * Universal Search + Command Palette — AGXORA OS layer.
 * Ctrl/Cmd+K · ESC · arrow navigation · recent · favorites · preview · smart links.
 */
export function UniversalSearchOverlay(): JSX.Element | null {
  const router = useRouter();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [recent, setRecent] = useState<readonly string[]>([]);
  const [favorites, setFavorites] = useState<readonly string[]>([]);

  const index = useMemo(() => buildSearchIndex(), []);
  const localizedIndex = useMemo(
    () => localizeSearchResults(index, t),
    [index, t],
  );
  const activity = useMemo(() => buildRecentActivity(), []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
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
    const close = (): void => setOpen(false);
    const pop = pushOverlay(close);
    const unlock = lockBodyScroll();
    const onEsc = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      if (!isTopOverlay(close)) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onEsc, true);
    const focusTimer = window.setTimeout(() => {
      setRecent(getRecentSearches());
      setFavorites(getFavoriteIds());
      setActiveIndex(0);
      inputRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onEsc, true);
      pop();
      unlock();
    };
  }, [open]);

  const results = useMemo(
    () => localizeSearchResults(searchIndex(index, query, { limit: 100 }), t),
    [index, query, t],
  );

  const pinnedResults = useMemo(() => {
    const favSet = new Set(favorites);
    return localizeSearchResults(
      index.filter((item) => favSet.has(item.id) && item.pinnable),
      t,
    );
  }, [index, favorites, t]);

  const grouped = useMemo(() => groupResults(results), [results]);

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    let flatIndex = 0;
    if (!query.trim() && pinnedResults.length > 0) {
      rows.push({ type: "header", id: "hdr-pinned", label: t("dashboard.search.pinnedResults") });
      for (const item of pinnedResults) {
        rows.push({ type: "item", id: `pin-${item.id}`, item, flatIndex });
        flatIndex += 1;
      }
    }
    for (const block of grouped) {
      rows.push({
        type: "header",
        id: `hdr-${block.group}`,
        label: searchGroupLabel(block.group, t),
      });
      for (const item of block.items) {
        rows.push({ type: "item", id: item.id, item, flatIndex });
        flatIndex += 1;
      }
    }
    return rows;
  }, [grouped, pinnedResults, query, t]);

  const selectable = useMemo(
    () => flatRows.filter((row): row is Extract<FlatRow, { type: "item" }> => row.type === "item"),
    [flatRows],
  );

  const activeItem = selectable[activeIndex]?.item ?? null;
  const previewItem = useMemo(() => {
    if (hoverId) {
      const raw = index.find((item) => item.id === hoverId) ?? activeItem;
      return raw ? localizeSearchResult(raw, t) : activeItem;
    }
    return activeItem;
  }, [hoverId, index, activeItem, t]);

  const related = useMemo(
    () => localizeSearchResults(resolveRelated(localizedIndex, previewItem), t),
    [localizedIndex, previewItem, t],
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

  if (!open || typeof document === "undefined") return null;

  const showHome = !query.trim();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("dashboard.search.ariaLabel")}
      className="fixed inset-0 flex items-start justify-center px-3 pt-[8vh] sm:px-6"
      style={{
        zIndex: OVERLAY_Z.popover,
        background: "var(--agx-ds-scrim)",
      }}
      onClick={close}
    >
      <div
        className="w-full max-w-5xl overflow-hidden border shadow-2xl"
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          borderColor: "var(--agx-ds-border)",
          background: "var(--agx-ds-elevated)",
          boxShadow: "var(--agx-ds-shadow-lg)",
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
            placeholder={t("dashboard.search.placeholder")}
            aria-label={t("dashboard.search.queryAria")}
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
                      {t("dashboard.search.quickActions")}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {index
                      .filter((item) => item.group === "actions")
                      .map((action) => {
                        const localized = localizeSearchResult(action, t);
                        return (
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
                          {localized.title}
                        </button>
                      );
                      })}
                  </div>
                </section>

                {pinnedResults.length > 0 ? (
                  <section>
                    <h3
                      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      {t("dashboard.search.favorites")}
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
                      {t("dashboard.search.recentSearches")}
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
                        {t("dashboard.search.clear")}
                      </button>
                    ) : null}
                  </div>
                  {recent.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {t("dashboard.search.noRecentSearches")}
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
                    {t("dashboard.search.recentActivity")}
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
                            <Badge>{searchGroupLabel(
                              item.kind === "invoice"
                                ? "finance"
                                : item.kind === "customer"
                                  ? "crm"
                                  : item.kind === "automation_run"
                                    ? "automation"
                                    : item.kind === "project"
                                      ? "projects"
                                      : "documents",
                              t,
                            )}</Badge>
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
                    {t("dashboard.search.aiReady")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {AI_SEARCH_CAPABILITIES.map((cap) => {
                      const keys = CAPABILITY_KEYS[cap.id];
                      return (
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
                            {keys ? t(keys.titleKey) : cap.title}
                          </p>
                          <Badge tone="warning">{t(`dashboard.search.status.${cap.status}`)}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                          {keys ? t(keys.descriptionKey) : cap.description}
                        </p>
                      </div>
                    );
                    })}
                  </div>
                </section>
              </div>
            ) : selectable.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={t("dashboard.search.noMatches")}
                  description={t("dashboard.search.noMatchesBody")}
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
                {t("dashboard.search.close")}
              </Button>
              {activeItem ? (
                <Button size="sm" variant="primary" onClick={() => navigateTo(activeItem)}>
                  {t("dashboard.search.open")}
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              {t("dashboard.search.keyboardHints")}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
  const { t } = useLocale();

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
          {searchGroupLabel(item.group, t)} · {item.subtitle}
        </span>
      </button>
      {item.pinnable ? (
        <button
          type="button"
          aria-label={pinned ? t("dashboard.search.unpinResult") : t("dashboard.search.pinResult")}
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
