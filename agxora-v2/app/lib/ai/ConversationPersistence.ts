/**
 * ConversationPersistence — client-side conversation persistence.
 * Offline-ready architecture (localStorage). Server sync later.
 */

import type { Conversation } from "../modules/chat/types";
import type { ChatMessage } from "../modules/chat/Message";

const STORAGE_KEY = "agxora.ai.conversations.v1";

export interface PersistedConversationBundle {
  readonly conversation: Conversation;
  readonly messages: readonly ChatMessage[];
  readonly savedAt: string;
}

export interface ConversationStoreSnapshot {
  readonly activeId: string | null;
  readonly bundles: readonly PersistedConversationBundle[];
}

export class ConversationPersistence {
  load(): ConversationStoreSnapshot {
    if (typeof window === "undefined") {
      return { activeId: null, bundles: [] };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { activeId: null, bundles: [] };
      const parsed = JSON.parse(raw) as ConversationStoreSnapshot;
      return {
        activeId: parsed.activeId ?? null,
        bundles: Array.isArray(parsed.bundles) ? parsed.bundles : [],
      };
    } catch {
      return { activeId: null, bundles: [] };
    }
  }

  save(snapshot: ConversationStoreSnapshot): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota / private mode failures.
    }
  }

  upsert(
    conversation: Conversation,
    messages: readonly ChatMessage[],
    activeId?: string | null,
  ): ConversationStoreSnapshot {
    const current = this.load();
    const bundle: PersistedConversationBundle = {
      conversation,
      messages,
      savedAt: new Date().toISOString(),
    };
    const others = current.bundles.filter(
      (item) => item.conversation.id !== conversation.id,
    );
    const next: ConversationStoreSnapshot = {
      activeId: activeId ?? conversation.id,
      bundles: [bundle, ...others].slice(0, 40),
    };
    this.save(next);
    return next;
  }

  delete(conversationId: string): ConversationStoreSnapshot {
    const current = this.load();
    const bundles = current.bundles.filter(
      (item) => item.conversation.id !== conversationId,
    );
    const next: ConversationStoreSnapshot = {
      activeId:
        current.activeId === conversationId
          ? (bundles[0]?.conversation.id ?? null)
          : current.activeId,
      bundles,
    };
    this.save(next);
    return next;
  }

  rename(conversationId: string, title: string): ConversationStoreSnapshot {
    const current = this.load();
    const bundles = current.bundles.map((bundle) =>
      bundle.conversation.id === conversationId
        ? {
            ...bundle,
            conversation: { ...bundle.conversation, title },
            savedAt: new Date().toISOString(),
          }
        : bundle,
    );
    const next = { ...current, bundles };
    this.save(next);
    return next;
  }

  search(query: string): readonly PersistedConversationBundle[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.load().bundles;
    return this.load().bundles.filter((bundle) => {
      if (bundle.conversation.title.toLowerCase().includes(q)) return true;
      return bundle.messages.some((message) =>
        message.content.toLowerCase().includes(q),
      );
    });
  }
}

export const conversationPersistence = new ConversationPersistence();
