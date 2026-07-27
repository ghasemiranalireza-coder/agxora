"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import {
  createRemoteChatProvider,
  type RemoteChatProviderAdapter,
} from "../../ai/adapters/chatProviderAdapter";
import { useOptionalAISettings } from "../../ai/AIProviderContext";
import { aiEngine } from "../../ai/AIEngine";
import { useBusinessOs } from "../../business";
import { useOptionalMemory } from "../../memory";
import { useOrganization } from "../../organization";
import {
  createDefaultChatService,
  type ChatService,
} from "./chatService";
import { ChatContext, type ChatContextValue } from "./ChatContext";
import type { ChatStatus, SendMessageResult } from "./types";
import type { ConversationId, MessageId } from "./Message";

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
  const businessOs = useBusinessOs();
  const aiSettings = useOptionalAISettings();

  const [adapter] = useState<RemoteChatProviderAdapter | null>(() => {
    if (injected) return null;
    return createRemoteChatProvider({
      getSettings: () => aiEngine.getSettings(),
    });
  });

  const [service] = useState<ChatService>(() => {
    if (injected) return injected;
    if (!memory) {
      throw new Error(
        "ChatProvider requires MemoryProvider (or an injected service)",
      );
    }
    return createDefaultChatService(
      {
        recordMessage: (input) => {
          if (aiEngine.getSettings().memoryEnabled === false) return;
          memory.recordMessage(input);
        },
        buildContext: (scope, options) => memory.buildContext(scope, options),
      },
      {
        organizationId: organization?.id ?? null,
        workspaceId: workspace?.id ?? null,
      },
      adapter ?? undefined,
      {
        autoTitleEnabled: true,
      },
    );
  });

  const [messages, setMessages] = useState(() => service.listMessages());
  const [conversation, setConversation] = useState(() =>
    service.getConversation(),
  );
  const [conversations, setConversations] = useState(() =>
    service.listConversations(),
  );
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const syncFromService = useCallback(() => {
    setMessages(service.listMessages());
    setConversation(service.getConversation());
    setConversations(service.listConversations());
  }, [service]);

  useEffect(() => {
    service.setContext(organization?.id ?? null, workspace?.id ?? null);
  }, [service, organization?.id, workspace?.id]);

  useEffect(() => {
    if (!adapter) return;
    adapter.setEnricher(() => {
      const operating = businessOs.buildAiContext();
      const settings = aiSettings?.settings;
      const memoryOn = settings?.memoryEnabled !== false;

      if (!operating) {
        return {
          organization: {
            organizationId: organization?.id ?? null,
            workspaceId: workspace?.id ?? null,
            companyName: organization?.name,
            country: organization?.country,
            language: organization?.language,
            timezone: organization?.timezone,
          },
          memory: memoryOn ? undefined : { scope: { kind: "conversation", id: "none" }, entries: [], generatedAt: new Date().toISOString() },
        };
      }

      return {
        organization: {
          organizationId: operating.organizationId,
          workspaceId: workspace?.id ?? null,
          companyName: operating.companyName,
          businessType: operating.businessType,
          country: operating.country,
          language: operating.language,
          timezone: operating.timezone,
        },
        business: {
          templateId: operating.templateId,
          templateSummary: operating.templateSummary,
          reasoningDomains: operating.aiFocus,
          goals: operating.goals,
          modules: operating.modules,
          agents: operating.agents,
          departments: [],
          employees: [],
          customers: [],
          projects: [],
          files: [],
        },
        knowledge: {
          entries: operating.knowledge.map((entry) => ({
            title: entry.title,
            content: entry.content,
          })),
        },
        systemPrompt:
          settings?.systemPromptOverride?.trim() || operating.systemPrompt,
      };
    });
  }, [
    adapter,
    businessOs,
    organization?.id,
    organization?.name,
    organization?.country,
    organization?.language,
    organization?.timezone,
    workspace?.id,
    aiSettings?.settings,
  ]);

  useEffect(() => {
    if (!aiSettings) return;
    aiEngine.updateSettings(aiSettings.settings);
    service.setAutoTitleEnabled(aiSettings.settings.autoTitleEnabled);
  }, [aiSettings, aiSettings?.settings, service]);

  // Poll streaming message updates while generating.
  useEffect(() => {
    if (status !== "typing" && status !== "streaming" && status !== "sending") {
      return;
    }
    const timer = window.setInterval(() => {
      syncFromService();
      const last = service.listMessages().at(-1);
      if (last?.status === "streaming") {
        setStatus("streaming");
      }
    }, 80);
    return () => window.clearInterval(timer);
  }, [status, service, syncFromService]);

  const runGeneration = useCallback(
    async (
      action: () => Promise<SendMessageResult | null>,
    ): Promise<SendMessageResult | null> => {
      setError(null);
      setStatus("sending");
      try {
        const promise = action();
        syncFromService();
        setStatus("typing");
        const result = await promise;
        syncFromService();
        setStatus("idle");
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          syncFromService();
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
    [syncFromService],
  );

  const send = useCallback(
    async (content?: string): Promise<SendMessageResult | null> => {
      const text = (content ?? draft).trim();
      if (!text || status === "sending" || status === "typing" || status === "streaming") {
        return null;
      }
      setDraft("");
      return runGeneration(() => service.sendMessage({ content: text }));
    },
    [draft, service, status, runGeneration],
  );

  const stop = useCallback(() => {
    service.stopGeneration();
    syncFromService();
    setStatus("idle");
  }, [service, syncFromService]);

  const regenerate = useCallback(
    async (messageId?: MessageId) => {
      if (status === "sending" || status === "typing" || status === "streaming") {
        return null;
      }
      return runGeneration(() => service.regenerate(messageId));
    },
    [runGeneration, service, status],
  );

  const retry = useCallback(async () => {
    if (status === "sending" || status === "typing" || status === "streaming") {
      return null;
    }
    return runGeneration(() => service.retryLast());
  }, [runGeneration, service, status]);

  const deleteConversation = useCallback(() => {
    service.deleteConversation();
    syncFromService();
    setStatus("idle");
    setError(null);
  }, [service, syncFromService]);

  const renameConversation = useCallback(
    (title: string) => {
      service.renameConversation(title);
      syncFromService();
    },
    [service, syncFromService],
  );

  const newConversation = useCallback(() => {
    service.newConversation();
    syncFromService();
    setStatus("idle");
    setError(null);
  }, [service, syncFromService]);

  const switchConversation = useCallback(
    (id: ConversationId) => {
      service.switchConversation(id);
      syncFromService();
      setStatus("idle");
    },
    [service, syncFromService],
  );

  const clearError = useCallback(() => {
    setError(null);
    if (status === "error") setStatus("idle");
  }, [status]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return service.searchConversations(searchQuery);
  }, [conversations, searchQuery, service]);

  const isSending = status === "sending";
  const isTyping = status === "typing" || status === "streaming";
  const isStreaming = status === "streaming";
  const canSend =
    draft.trim().length > 0 &&
    status !== "sending" &&
    status !== "typing" &&
    status !== "streaming";

  const value = useMemo<ChatContextValue>(
    () => ({
      conversation,
      conversations: filteredConversations,
      messages,
      draft,
      setDraft,
      searchQuery,
      setSearchQuery,
      status,
      error,
      isSending,
      isTyping,
      isStreaming,
      canSend,
      send,
      stop,
      regenerate,
      retry,
      deleteConversation,
      renameConversation,
      newConversation,
      switchConversation,
      clearError,
      activeConversationId: conversation?.id ?? null,
    }),
    [
      conversation,
      filteredConversations,
      messages,
      draft,
      searchQuery,
      status,
      error,
      isSending,
      isTyping,
      isStreaming,
      canSend,
      send,
      stop,
      regenerate,
      retry,
      deleteConversation,
      renameConversation,
      newConversation,
      switchConversation,
      clearError,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
