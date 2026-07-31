"use client";

import {
  useCallback,
  useEffect,
  useState,
  type JSX,
} from "react";
import { Card } from "@/app/components/ui";
import { useAiChat } from "../hooks/useAiChat";
import {
  useAiPlatformHydrated,
} from "../hooks/useAiConversations";
import { aiConversationStore } from "../store/conversationStore";
import type { AiCommand } from "../types";
import { AiCommandPalette } from "./AiCommandPalette";
import { AiUsageBar } from "./AiUsageBar";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";
import { ConversationSidebar } from "./ConversationSidebar";
import { PromptLibrary } from "./PromptLibrary";

/**
 * AGXORA AI Platform workspace — conversations, prompts, commands, usage.
 * Lazy-loaded from /dashboard/ai. Does not alter dashboard shell.
 */
export function AiPlatformWorkspace(): JSX.Element {
  const hydrated = useAiPlatformHydrated();
  const { conversation, generating, send, retry, stop, ensureConversation } =
    useAiChat();
  const [draft, setDraft] = useState("");
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "chats" | "prompts">(
    "chat",
  );

  useEffect(() => {
    aiConversationStore.hydrate();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onCreate = useCallback(() => {
    aiConversationStore.createConversation();
    setMobileTab("chat");
  }, []);

  const onSelect = useCallback((id: string) => {
    aiConversationStore.setActiveConversation(id);
    setMobileTab("chat");
  }, []);

  const onUsePrompt = useCallback((body: string) => {
    ensureConversation();
    setDraft(body);
    setMobileTab("chat");
  }, [ensureConversation]);

  const onRunCommand = useCallback(
    (command: AiCommand) => {
      ensureConversation();
      void send(command.prompt);
      setMobileTab("chat");
    },
    [ensureConversation, send],
  );

  if (!hydrated) {
    return (
      <div
        className="mx-auto w-full max-w-[1200px] py-16 text-center text-sm"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        Loading AI Platform…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
      <Card className="space-y-2" padding="24px" hover={false}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          AGXORA AI Platform
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Enterprise AI Workspace
        </h1>
        <p
          className="max-w-2xl text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          Provider-independent intelligence for CRM, Projects, Finance,
          Documents, and Automation. Configure providers in Settings → AI.
        </p>
      </Card>

      <AiUsageBar />

      <div className="flex gap-2 lg:hidden">
        {(
          [
            ["chat", "Chat"],
            ["chats", "Conversations"],
            ["prompts", "Prompts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{
              background:
                mobileTab === id
                  ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 16%, transparent)"
                  : "transparent",
              color:
                mobileTab === id
                  ? "var(--agx-accent, #22d3ee)"
                  : "var(--agx-text-muted, #94a3b8)",
              border:
                mobileTab === id
                  ? "1px solid color-mix(in srgb, var(--agx-accent, #22d3ee) 30%, transparent)"
                  : "1px solid color-mix(in srgb, var(--agx-border, #334155) 50%, transparent)",
            }}
            onClick={() => setMobileTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[640px] grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <Card
          className={`min-h-0 ${mobileTab === "chats" ? "block" : "hidden lg:block"}`}
          padding="16px"
          hover={false}
        >
          <ConversationSidebar
            activeId={conversation?.id ?? null}
            onSelect={onSelect}
            onCreate={onCreate}
          />
        </Card>

        <Card
          className={`flex min-h-[560px] flex-col gap-3 ${mobileTab === "chat" ? "flex" : "hidden lg:flex"}`}
          padding="16px"
          hover={false}
        >
          <div className="flex items-center justify-between gap-2">
            <p
              className="truncate text-sm font-medium"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {conversation?.title ?? "New conversation"}
            </p>
            <button
              type="button"
              className="text-[11px]"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              onClick={() => setCommandsOpen(true)}
            >
              AI Commands
            </button>
          </div>
          <ChatThread
            messages={conversation?.messages ?? []}
            generating={generating}
            onRetry={(id) => {
              void retry(id);
            }}
          />
          <Composer
            draft={draft}
            onDraftChange={setDraft}
            generating={generating}
            onSend={(value) => {
              void send(value);
            }}
            onStop={stop}
            onOpenCommands={() => setCommandsOpen(true)}
          />
        </Card>

        <Card
          className={`min-h-0 ${mobileTab === "prompts" ? "block" : "hidden lg:block"}`}
          padding="16px"
          hover={false}
        >
          <PromptLibrary onUsePrompt={onUsePrompt} />
        </Card>
      </div>

      <AiCommandPalette
        open={commandsOpen}
        onClose={() => setCommandsOpen(false)}
        onRun={onRunCommand}
      />
    </div>
  );
}
