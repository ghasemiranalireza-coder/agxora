"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { ChatContext } from "./ChatProvider";
import type { ChatMessage, Conversation, SendMessageResult } from "./types";
import type { ChatService } from "./chatService";

export function useChatService(): ChatService {
  const service = useContext(ChatContext);
  if (!service) {
    throw new Error("useChatService must be used within ChatProvider");
  }
  return service;
}

export function useChat(): {
  readonly conversation: Conversation | null;
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly sending: boolean;
  readonly send: (content?: string) => Promise<SendMessageResult | null>;
  readonly canSend: boolean;
} {
  const service = useChatService();
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => service.subscribe(() => setVersion((v) => v + 1)), [service]);

  // Touch version so React re-reads service snapshots.
  void version;

  const conversation = service.getActiveConversation();
  const messages = service.listMessages(conversation?.id);
  const canSend = draft.trim().length > 0 && !sending;

  const send = useCallback(
    async (content?: string) => {
      const text = (content ?? draft).trim();
      if (!text || sending) return null;
      setSending(true);
      try {
        const result = await service.sendMessage({ content: text });
        setDraft("");
        return result;
      } finally {
        setSending(false);
      }
    },
    [draft, sending, service],
  );

  return {
    conversation,
    messages,
    draft,
    setDraft,
    sending,
    send,
    canSend,
  };
}
