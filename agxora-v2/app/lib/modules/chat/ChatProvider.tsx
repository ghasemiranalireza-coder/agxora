"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useOptionalCoreEngine } from "../../core";
import { createChatService, type ChatService } from "./chatService";

export const ChatContext = createContext<ChatService | null>(null);

interface ChatProviderProps {
  readonly children: ReactNode;
  readonly service?: ChatService;
}

export function ChatProvider({
  children,
  service: injected,
}: ChatProviderProps): JSX.Element {
  const engine = useOptionalCoreEngine();
  const [service] = useState(
    () =>
      injected ??
      createChatService({
        events: engine?.events,
        workspaceId: engine?.workspace.getContext().workspaceId ?? null,
        organizationId: engine?.workspace.getContext().organizationId ?? null,
        seedDemoMessages: true,
      }),
  );

  useEffect(() => {
    if (!engine) return;
    return engine.workspace.subscribe((state) => {
      service.setWorkspaceContext(
        state.active.workspaceId,
        state.active.organizationId,
      );
    });
  }, [engine, service]);

  const value = useMemo(() => service, [service]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
