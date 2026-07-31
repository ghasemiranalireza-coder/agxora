"use client";

import { useSyncExternalStore } from "react";
import { aiConversationStore } from "../store/conversationStore";
import type { AiConversation, AiConversationSummary } from "../types";

function subscribe(listener: () => void): () => void {
  return aiConversationStore.subscribe(listener);
}

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
    () => [],
  );
}

export function useAiFavoritePromptIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getFavoritePromptIds(),
    () => [],
  );
}

export function useAiRecentPromptIds(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => aiConversationStore.getRecentPromptIds(),
    () => [],
  );
}
