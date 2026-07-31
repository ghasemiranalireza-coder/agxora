/**
 * AI conversation store — LocalStorage-backed, selector-friendly.
 * UI never talks to providers; only the platform service generates replies.
 */

import type { AiConversation, AiConversationSummary, AiMessage } from "../types";
import { createAiId, nowIso } from "../utils/id";
import { estimateTokens } from "../utils/tokens";

const STORAGE_KEY = "agxora-ai-platform-v1";

export interface AiPlatformPersistedState {
  version: 1;
  conversations: AiConversation[];
  activeConversationId: string | null;
  favoritePromptIds: string[];
  recentPromptIds: string[];
}

interface AiPlatformState extends AiPlatformPersistedState {
  hydrated: boolean;
  generating: boolean;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: AiPlatformState = {
  version: 1,
  conversations: [],
  activeConversationId: null,
  favoritePromptIds: [],
  recentPromptIds: [],
  hydrated: false,
  generating: false,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const payload: AiPlatformPersistedState = {
      version: 1,
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
      favoritePromptIds: state.favoritePromptIds,
      recentPromptIds: state.recentPromptIds,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore
  }
}

function titleFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New conversation";
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
}

function toSummary(conversation: AiConversation): AiConversationSummary {
  const lastUserOrAssistant = [...conversation.messages]
    .reverse()
    .find((m) => m.role === "user" || m.role === "assistant");
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    pinned: conversation.pinned,
    archived: conversation.archived,
    preview: lastUserOrAssistant?.content.slice(0, 120) ?? "",
    messageCount: conversation.messages.length,
  };
}

function sortSummaries(items: AiConversationSummary[]): AiConversationSummary[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export const aiConversationStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): AiPlatformState {
    return state;
  },

  hydrate(): void {
    if (state.hydrated || typeof window === "undefined") {
      if (!state.hydrated) {
        state = { ...state, hydrated: true };
        emit();
      }
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AiPlatformPersistedState>;
        state = {
          version: 1,
          conversations: Array.isArray(parsed.conversations)
            ? parsed.conversations
            : [],
          activeConversationId: parsed.activeConversationId ?? null,
          favoritePromptIds: Array.isArray(parsed.favoritePromptIds)
            ? parsed.favoritePromptIds
            : [],
          recentPromptIds: Array.isArray(parsed.recentPromptIds)
            ? parsed.recentPromptIds
            : [],
          hydrated: true,
          generating: false,
        };
      } else {
        state = { ...state, hydrated: true };
      }
    } catch {
      state = { ...state, hydrated: true };
    }
    emit();
  },

  listSummaries(options?: {
    query?: string;
    includeArchived?: boolean;
  }): AiConversationSummary[] {
    const query = options?.query?.trim().toLowerCase() ?? "";
    const includeArchived = options?.includeArchived ?? false;
    const rows = state.conversations
      .filter((c) => !c.deleted)
      .filter((c) => (includeArchived ? true : !c.archived))
      .map(toSummary)
      .filter((row) => {
        if (!query) return true;
        return (
          row.title.toLowerCase().includes(query) ||
          row.preview.toLowerCase().includes(query)
        );
      });
    return sortSummaries(rows);
  },

  getActiveConversation(): AiConversation | null {
    if (!state.activeConversationId) return null;
    return (
      state.conversations.find(
        (c) => c.id === state.activeConversationId && !c.deleted,
      ) ?? null
    );
  },

  getConversation(id: string): AiConversation | null {
    return state.conversations.find((c) => c.id === id && !c.deleted) ?? null;
  },

  createConversation(seedTitle?: string): AiConversation {
    const now = nowIso();
    const conversation: AiConversation = {
      id: createAiId("conv"),
      title: seedTitle?.trim() || "New conversation",
      createdAt: now,
      updatedAt: now,
      pinned: false,
      archived: false,
      messages: [],
    };
    state = {
      ...state,
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    };
    persist();
    emit();
    return conversation;
  },

  setActiveConversation(id: string | null): void {
    state = { ...state, activeConversationId: id };
    persist();
    emit();
  },

  renameConversation(id: string, title: string): void {
    const next = title.trim() || "Untitled";
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title: next, updatedAt: nowIso() } : c,
      ),
    };
    persist();
    emit();
  },

  pinConversation(id: string, pinned = true): void {
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, pinned, updatedAt: nowIso() } : c,
      ),
    };
    persist();
    emit();
  },

  archiveConversation(id: string, archived = true): void {
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, archived, pinned: archived ? false : c.pinned, updatedAt: nowIso() } : c,
      ),
      activeConversationId:
        archived && state.activeConversationId === id
          ? null
          : state.activeConversationId,
    };
    persist();
    emit();
  },

  deleteConversation(id: string): void {
    state = {
      ...state,
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, deleted: true, updatedAt: nowIso() } : c,
      ),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    };
    persist();
    emit();
  },

  setGenerating(generating: boolean): void {
    state = { ...state, generating };
    emit();
  },

  appendMessage(conversationId: string, message: Omit<AiMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }): AiMessage {
    const full: AiMessage = {
      id: message.id ?? createAiId("msg"),
      createdAt: message.createdAt ?? nowIso(),
      estimatedTokens: message.estimatedTokens ?? estimateTokens(message.content),
      role: message.role,
      content: message.content,
      status: message.status,
      error: message.error,
      providerId: message.providerId,
      model: message.model,
    };

    state = {
      ...state,
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = [...c.messages, full];
        const shouldRetitle =
          c.title === "New conversation" && full.role === "user";
        return {
          ...c,
          title: shouldRetitle ? titleFromContent(full.content) : c.title,
          messages,
          updatedAt: nowIso(),
        };
      }),
    };
    persist();
    emit();
    return full;
  },

  updateMessage(
    conversationId: string,
    messageId: string,
    patch: Partial<AiMessage>,
  ): void {
    state = {
      ...state,
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          updatedAt: nowIso(),
          messages: c.messages.map((m) => {
            if (m.id !== messageId) return m;
            const next = { ...m, ...patch };
            if (patch.content !== undefined && patch.estimatedTokens === undefined) {
              next.estimatedTokens = estimateTokens(patch.content);
            }
            return next;
          }),
        };
      }),
    };
    persist();
    emit();
  },

  toggleFavoritePrompt(promptId: string): void {
    const has = state.favoritePromptIds.includes(promptId);
    state = {
      ...state,
      favoritePromptIds: has
        ? state.favoritePromptIds.filter((id) => id !== promptId)
        : [promptId, ...state.favoritePromptIds],
    };
    persist();
    emit();
  },

  touchRecentPrompt(promptId: string): void {
    state = {
      ...state,
      recentPromptIds: [
        promptId,
        ...state.recentPromptIds.filter((id) => id !== promptId),
      ].slice(0, 12),
    };
    persist();
    emit();
  },

  getFavoritePromptIds(): string[] {
    return state.favoritePromptIds;
  },

  getRecentPromptIds(): string[] {
    return state.recentPromptIds;
  },
};
