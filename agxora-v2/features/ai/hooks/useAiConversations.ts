"use client";

import { useSyncExternalStore } from "react";
import { aiConversationStore } from "../store/conversationStore";
import type { AiConversation, AiConversationSummary } from "../types";

function subscribe(listener: () => void): () => void {
  return aiConversationStore.subscribe(listener);
}

/** Stable empty snapshots for useSyncExternalStore getServerSnapshot. */
const EMPTY_SUMMARIES: AiConversationSummary[] = [];
const EMPTY_IDS: string[] = [];

export function useAiPlatformHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getSnapshot().hydrated,
    () => false,
  );
}

export function useAiGenerating(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getSnapshot().generating,
    () => false,
  );
}

export function useAiActiveConversation(): AiConversation | null {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getActiveConversation(),
    () => null,
  );
}

export function useAiConversationSummaries(
  query: string,
  includeArchived: boolean,
): AiConversationSummary[] {
  return useSyncExternalStore(
    subscribe,
    () =>
      aiConversationStore.listSummaries({
        query,
        includeArchived,
      }),
    () => EMPTY_SUMMARIES,
  );
}

export function useAiFavoritePromptIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getFavoritePromptIds(),
    () => EMPTY_IDS,
  );
}

export function useAiRecentPromptIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getRecentPromptIds(),
    () => EMPTY_IDS,
  );
}
