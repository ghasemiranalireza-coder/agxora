"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useOptionalMemory } from "../../memory";
import { useOrganization } from "../../organization";
import {
  createDefaultChatService,
  type ChatService,
} from "./chatService";
import { ChatContext, type ChatContextValue } from "./ChatContext";
import type { ChatStatus, SendMessageResult } from "./types";

interface ChatProviderProps {
  readonly children: ReactNode;
  readonly service?: ChatService;
}

export function ChatProvider({
  children,
  service: injected,
}: ChatProviderProps): JSX.Element {
  const memory = useOptionalMemory();
  const { organization, workspace } = useOrganization();

  const [service] = useState<ChatService>(() => {
    if (injected) return injected;
    if (!memory) {
      throw new Error("ChatProvider requires MemoryProvider (or an injected service)");
    }
    return createDefaultChatService(
      {
        recordMessage: (input) => memory.recordMessage(input),
        buildContext: (scope, options) => memory.buildContext(scope, options),
      },
      {
        organizationId: organization?.id ?? null,
        workspaceId: workspace?.id ?? null,
      },
    );
  });

  const [messages, setMessages] = useState(() => service.listMessages());
  const [conversation, setConversation] = useState(() =>
    service.getConversation(),
  );
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    service.setContext(organization?.id ?? null, workspace?.id ?? null);
  }, [service, organization?.id, workspace?.id]);

  const syncFromService = useCallback(() => {
    setMessages(service.listMessages());
    setConversation(service.getConversation());
  }, [service]);

  const send = useCallback(
    async (content?: string): Promise<SendMessageResult | null> => {
      const text = (content ?? draft).trim();
      if (!text || status === "sending" || status === "typing") {
        return null;
      }

      setError(null);
      setStatus("sending");
      setDraft("");

      // Optimistically reflect the outgoing user message immediately.
      try {
        // Mark typing while the provider generates a reply.
        const sendPromise = service.sendMessage({ content: text });
        syncFromService();
        setStatus("typing");

        const result = await sendPromise;
        syncFromService();
        setStatus("idle");
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("idle");
          return null;
        }
        const message =
          err instanceof Error ? err.message : "Unable to send message";
        setError(message);
        syncFromService();
        setStatus("error");
        return null;
      }
    },
    [draft, service, status, syncFromService],
  );

  const clearError = useCallback(() => {
    setError(null);
    if (status === "error") setStatus("idle");
  }, [status]);

  const isSending = status === "sending";
  const isTyping = status === "typing";
  const canSend =
    draft.trim().length > 0 && status !== "sending" && status !== "typing";

  const value = useMemo<ChatContextValue>(
    () => ({
      conversation,
      messages,
      draft,
      setDraft,
      status,
      error,
      isSending,
      isTyping,
      canSend,
      send,
      clearError,
      activeConversationId: conversation?.id ?? null,
    }),
    [
      conversation,
      messages,
      draft,
      status,
      error,
      isSending,
      isTyping,
      canSend,
      send,
      clearError,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
