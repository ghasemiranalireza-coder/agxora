"use client";

import { useCallback, useRef } from "react";
import { useAISettings } from "@/app/lib/ai/AIProviderContext";
import { useLocale } from "@/app/lib/i18n";
import { useOrganization } from "@/app/lib/organization";
import { generateAiReply } from "../services/aiPlatformService";
import { aiConversationStore } from "../store/conversationStore";
import { useAiActiveConversation, useAiGenerating } from "./useAiConversations";

export function useAiChat() {
  const { settings } = useAISettings();
  const { locale } = useLocale();
  const { organization } = useOrganization();
  const conversation = useAiActiveConversation();
  const generating = useAiGenerating();
  const abortRef = useRef<(() => void) | null>(null);

  const ensureConversation = useCallback(() => {
    return conversation ?? aiConversationStore.createConversation();
  }, [conversation]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || generating) return;
      const active = ensureConversation();
      abortRef.current?.();
      const handle = generateAiReply({
        conversationId: active.id,
        userContent: trimmed,
        settings,
        organizationId: organization?.id ?? null,
        workspaceId: null,
        preferredLocale: locale,
      });
      abortRef.current = handle.abort;
      try {
        await handle.promise;
      } catch {
        // Error state stored on message
      } finally {
        abortRef.current = null;
      }
    },
    [ensureConversation, generating, locale, organization?.id, settings],
  );

  const retry = useCallback(
    async (assistantMessageId: string) => {
      if (!conversation || generating) return;
      const messages = conversation.messages;
      const index = messages.findIndex((m) => m.id === assistantMessageId);
      if (index < 0) return;
      const priorUser = [...messages.slice(0, index)]
        .reverse()
        .find((m) => m.role === "user");
      if (!priorUser) return;
      abortRef.current?.();
      const handle = generateAiReply({
        conversationId: conversation.id,
        userContent: priorUser.content,
        settings,
        organizationId: organization?.id ?? null,
        workspaceId: null,
        preferredLocale: locale,
        retryAssistantMessageId: assistantMessageId,
      });
      abortRef.current = handle.abort;
      try {
        await handle.promise;
      } catch {
        // stored on message
      } finally {
        abortRef.current = null;
      }
    },
    [conversation, generating, locale, organization?.id, settings],
  );

  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
  }, []);

  return {
    conversation,
    generating,
    send,
    retry,
    stop,
    ensureConversation,
  };
}
