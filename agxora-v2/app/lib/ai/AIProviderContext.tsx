"use client";

/**
 * React context for AI engine settings (UI preference only — no API calls).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_AI_SETTINGS,
  mergeAISettings,
  type AISettings,
  type ReasoningLevel,
} from "./AISettings";
import type { AIProviderId } from "./AIModel";

export type AISettingsPatch = Partial<AISettings>;

export type AIProviderContextValue = {
  settings: AISettings;
  updateSettings: (patch: AISettingsPatch) => void;
  setProvider: (provider: AIProviderId) => void;
  setModel: (modelId: string) => void;
  setTemperature: (temperature: number) => void;
  setTopP: (topP: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setStreaming: (streaming: boolean) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setReasoningLevel: (level: ReasoningLevel) => void;
  resetSettings: () => void;
};

const AIProviderContext = createContext<AIProviderContextValue | null>(null);

export function AISettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AISettings>(() =>
    mergeAISettings(DEFAULT_AI_SETTINGS),
  );

  const updateSettings = useCallback((patch: AISettingsPatch) => {
    setSettings((prev) => mergeAISettings({ ...prev, ...patch }));
  }, []);

  const setProvider = useCallback((provider: AIProviderId) => {
    setSettings((prev) =>
      mergeAISettings({ ...prev, defaultProviderId: provider }),
    );
  }, []);

  const setModel = useCallback((modelId: string) => {
    setSettings((prev) =>
      mergeAISettings({ ...prev, defaultModelId: modelId }),
    );
  }, []);

  const setTemperature = useCallback((temperature: number) => {
    setSettings((prev) => mergeAISettings({ ...prev, temperature }));
  }, []);

  const setTopP = useCallback((topP: number) => {
    setSettings((prev) => mergeAISettings({ ...prev, topP }));
  }, []);

  const setMaxTokens = useCallback((maxTokens: number) => {
    setSettings((prev) => mergeAISettings({ ...prev, maxTokens }));
  }, []);

  const setStreaming = useCallback((streaming: boolean) => {
    setSettings((prev) =>
      mergeAISettings({ ...prev, streamingEnabled: streaming }),
    );
  }, []);

  const setSystemPrompt = useCallback((systemPrompt: string) => {
    setSettings((prev) =>
      mergeAISettings({ ...prev, systemPromptOverride: systemPrompt }),
    );
  }, []);

  const setReasoningLevel = useCallback((reasoningLevel: ReasoningLevel) => {
    setSettings((prev) => mergeAISettings({ ...prev, reasoningLevel }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(mergeAISettings(DEFAULT_AI_SETTINGS));
  }, []);

  const value = useMemo<AIProviderContextValue>(
    () => ({
      settings,
      updateSettings,
      setProvider,
      setModel,
      setTemperature,
      setTopP,
      setMaxTokens,
      setStreaming,
      setSystemPrompt,
      setReasoningLevel,
      resetSettings,
    }),
    [
      settings,
      updateSettings,
      setProvider,
      setModel,
      setTemperature,
      setTopP,
      setMaxTokens,
      setStreaming,
      setSystemPrompt,
      setReasoningLevel,
      resetSettings,
    ],
  );

  return (
    <AIProviderContext.Provider value={value}>{children}</AIProviderContext.Provider>
  );
}

export function useAISettings(): AIProviderContextValue {
  const ctx = useContext(AIProviderContext);
  if (!ctx) {
    throw new Error("useAISettings must be used within AISettingsProvider");
  }
  return ctx;
}

export function useOptionalAISettings(): AIProviderContextValue | null {
  return useContext(AIProviderContext);
}
