"use client";

import { useMemo, useState, type JSX, type ReactNode } from "react";
import { SearchField } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import {
  AI_PROMPT_CATEGORIES,
  getPromptById,
  searchPrompts,
} from "../prompts";
import {
  useAiFavoritePromptIds,
  useAiRecentPromptIds,
} from "../hooks/useAiConversations";
import { aiConversationStore } from "../store/conversationStore";
import type { AiPromptCategory, AiPromptTemplate } from "../types";

export interface PromptLibraryProps {
  readonly onUsePrompt: (body: string) => void;
}

export function PromptLibrary({ onUsePrompt }: PromptLibraryProps): JSX.Element {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AiPromptCategory | "all">("all");
  const favorites = useAiFavoritePromptIds();
  const recent = useAiRecentPromptIds();

  const results = useMemo(() => {
    let list = searchPrompts(query);
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [category, query]);

  const favoritePrompts = useMemo(
    () =>
      favorites
        .map((id) => getPromptById(id))
        .filter((p): p is AiPromptTemplate => Boolean(p)),
    [favorites],
  );

  const recentPrompts = useMemo(
    () =>
      recent
        .map((id) => getPromptById(id))
        .filter((p): p is AiPromptTemplate => Boolean(p)),
    [recent],
  );

  const applyPrompt = (prompt: AiPromptTemplate) => {
    aiConversationStore.touchRecentPrompt(prompt.id);
    onUsePrompt(prompt.body);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          {t("ai.promptLibrary.title")}
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {t("ai.promptLibrary.subtitle")}
        </p>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t("ai.promptLibrary.searchPlaceholder")}
        aria-label={t("ai.promptLibrary.searchAria")}
      />
      <div className="flex flex-wrap gap-1">
        <Chip
          active={category === "all"}
          label={t("ai.promptLibrary.all")}
          onClick={() => setCategory("all")}
        />
        {AI_PROMPT_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={category === c.id}
            label={c.label}
            onClick={() => setCategory(c.id)}
          />
        ))}
      </div>

      {favoritePrompts.length > 0 ? (
        <Section title={t("ai.promptLibrary.favorites")}>
          {favoritePrompts.map((p) => (
            <PromptRow
              key={`fav-${p.id}`}
              prompt={p}
              favorite
              onToggleFavorite={() =>
                aiConversationStore.toggleFavoritePrompt(p.id)
              }
              onUse={() => applyPrompt(p)}
            />
          ))}
        </Section>
      ) : null}

      {recentPrompts.length > 0 ? (
        <Section title={t("ai.promptLibrary.recent")}>
          {recentPrompts.map((p) => (
            <PromptRow
              key={`recent-${p.id}`}
              prompt={p}
              favorite={favorites.includes(p.id)}
              onToggleFavorite={() =>
                aiConversationStore.toggleFavoritePrompt(p.id)
              }
              onUse={() => applyPrompt(p)}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t("ai.promptLibrary.library")}>
        <div className="min-h-0 max-h-[320px] space-y-1 overflow-y-auto pr-1">
          {results.map((p) => (
            <PromptRow
              key={p.id}
              prompt={p}
              favorite={favorites.includes(p.id)}
              onToggleFavorite={() =>
                aiConversationStore.toggleFavoritePrompt(p.id)
              }
              onUse={() => applyPrompt(p)}
            />
          ))}
          {results.length === 0 ? (
            <p
              className="py-4 text-center text-xs"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {t("ai.promptLibrary.noMatches")}
            </p>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-1.5">
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[11px]"
      style={{
        background: active
          ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)"
          : "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 70%, transparent)",
        color: active
          ? "var(--agx-accent, #22d3ee)"
          : "var(--agx-text-muted, #94a3b8)",
        border: active
          ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 35%, transparent)"
          : "1px solid transparent",
      }}
    >
      {label}
    </button>
  );
}

function PromptRow({
  prompt,
  favorite,
  onToggleFavorite,
  onUse,
}: {
  prompt: AiPromptTemplate;
  favorite: boolean;
  onToggleFavorite: () => void;
  onUse: () => void;
}): JSX.Element {
  const t = useT();
  return (
    <div
      className="rounded-xl px-2.5 py-2"
      style={{
        border:
          "1px solid color-mix(in srgb, var(--agx-border, #334155) 60%, transparent)",
        background:
          "color-mix(in srgb, var(--agx-bg-elevated, #1e293b) 55%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {prompt.title}
          </p>
          <p
            className="mt-0.5 text-[11px] leading-snug"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {prompt.description}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-[11px] font-medium"
          aria-label={favorite ? t("ai.promptLibrary.removeFavoriteAria") : t("ai.promptLibrary.addFavoriteAria")}
          onClick={onToggleFavorite}
          style={{
            color: favorite
              ? "var(--agx-accent, #22d3ee)"
              : "var(--agx-text-muted, #94a3b8)",
          }}
        >
          {favorite ? t("ai.promptLibrary.favorited") : t("ai.promptLibrary.favorite")}
        </button>
      </div>
      <button
        type="button"
        className="mt-2 text-[11px] font-medium"
        style={{ color: "var(--agx-accent, #22d3ee)" }}
        onClick={onUse}
      >
        {t("ai.promptLibrary.usePrompt")}
      </button>
    </div>
  );
}
