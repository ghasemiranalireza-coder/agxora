"use client";

import { useEffect, useMemo, useState, type CSSProperties, type JSX } from "react";
import { useAISettings } from "../lib/ai/AIProviderContext";
import type { AIProviderId } from "../lib/ai/AIModel";
import type { ReasoningLevel } from "../lib/ai/AISettings";
import { THEME_TRANSITION_MS, useTheme } from "../lib/theme";

type SecretStatus = {
  providerId: string;
  configured: boolean;
  source: "env" | "store" | "none";
};

type ModelOption = {
  id: string;
  providerId: string;
  displayName: string;
};

type ProviderOption = { id: AIProviderId; label: string };

const surfaceTransition = [
  `background ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `border-color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  `color ${THEME_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
].join(", ");

export function AISettingsPanel(): JSX.Element {
  const { tokens } = useTheme();
  const {
    settings,
    updateSettings,
    setProvider,
    setModel,
    setTemperature,
    setMaxTokens,
    setStreaming,
    setSystemPrompt,
    setReasoningLevel,
  } = useAISettings();

  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/settings")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          settings: typeof settings;
          secrets: SecretStatus[];
          models: ModelOption[];
          providers: ProviderOption[];
        };
      })
      .then((data) => {
        if (cancelled || !data) return;
        updateSettings(data.settings);
        setSecrets(data.secrets);
        setModels(data.models);
        setProviders(data.providers);
      })
      .catch(() => {
        // Local defaults remain available offline.
      });
    return () => {
      cancelled = true;
    };
    // Bootstrap once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount hydrate
  }, []);

  const providerModels = useMemo(
    () => models.filter((model) => model.providerId === settings.defaultProviderId),
    [models, settings.defaultProviderId],
  );

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${tokens.inputBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    outline: "none",
    transition: surfaceTransition,
  } as const;

  const labelStyle = {
    display: "block",
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: tokens.textMuted,
  };

  const saveConfiguration = async (): Promise<void> => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      const data = (await response.json()) as {
        settings: typeof settings;
        secrets: SecretStatus[];
      };
      updateSettings(data.settings);
      setSecrets(data.secrets);
      setStatus("Configuration saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveSecret = async (providerId: string): Promise<void> => {
    const value = secretDrafts[providerId]?.trim();
    if (!value) {
      setStatus("Enter a key or URL before saving");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: { providerId, value },
        }),
      });
      if (!response.ok) throw new Error("Failed to store secret");
      const data = (await response.json()) as { secrets: SecretStatus[] };
      setSecrets(data.secrets);
      setSecretDrafts((prev) => ({ ...prev, [providerId]: "" }));
      setStatus(`${providerId} credential stored securely on server`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Secret save failed");
    } finally {
      setSaving(false);
    }
  };

  const clearSecret = async (providerId: string): Promise<void> => {
    setSaving(true);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: { providerId, clear: true },
        }),
      });
      if (!response.ok) throw new Error("Failed to clear secret");
      const data = (await response.json()) as { secrets: SecretStatus[] };
      setSecrets(data.secrets);
      setStatus(`${providerId} store credential cleared`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Clear failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="agx-glass-panel"
      style={{
        padding: "28px 30px",
        borderRadius: 26,
        background: tokens.panelBg,
        border: `1px solid ${tokens.panelBorder}`,
        boxShadow: tokens.panelShadow,
        backdropFilter: tokens.cardBlur,
        WebkitBackdropFilter: tokens.cardBlur,
        maxWidth: 760,
        width: "100%",
        transition: surfaceTransition,
      }}
    >
      <h1
        style={{
          margin: "0 0 8px",
          color: tokens.accent,
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        AI Settings
      </h1>
      <p style={{ margin: "0 0 24px", color: tokens.textMuted, fontSize: 13.5 }}>
        Configure providers and models. API keys never leave the server.
      </p>

      <div style={{ display: "grid", gap: 18 }}>
        <label>
          <span style={labelStyle}>Provider</span>
          <select
            value={settings.defaultProviderId}
            onChange={(event) => setProvider(event.target.value as AIProviderId)}
            style={fieldStyle}
          >
            {(providers.length
              ? providers
              : [
                  { id: "mock" as const, label: "Mock (offline)" },
                  { id: "openai" as const, label: "OpenAI" },
                  { id: "anthropic" as const, label: "Anthropic Claude" },
                  { id: "google" as const, label: "Google Gemini" },
                  { id: "openrouter" as const, label: "OpenRouter" },
                  { id: "ollama" as const, label: "Ollama (local)" },
                ]
            ).map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span style={labelStyle}>Model</span>
          <select
            value={settings.defaultModelId}
            onChange={(event) => setModel(event.target.value)}
            style={fieldStyle}
          >
            {(providerModels.length
              ? providerModels
              : [{ id: settings.defaultModelId, displayName: settings.defaultModelId, providerId: settings.defaultProviderId }]
            ).map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span style={labelStyle}>Temperature ({settings.temperature.toFixed(2)})</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          <span style={labelStyle}>Max tokens</span>
          <input
            type="number"
            min={256}
            max={128000}
            value={settings.maxTokens}
            onChange={(event) => setMaxTokens(Number(event.target.value) || 2048)}
            style={fieldStyle}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.streamingEnabled}
            onChange={(event) => setStreaming(event.target.checked)}
          />
          <span style={{ color: tokens.text, fontSize: 14 }}>Streaming</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.memoryEnabled}
            onChange={(event) =>
              updateSettings({ memoryEnabled: event.target.checked })
            }
          />
          <span style={{ color: tokens.text, fontSize: 14 }}>Memory</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={settings.autoTitleEnabled}
            onChange={(event) =>
              updateSettings({ autoTitleEnabled: event.target.checked })
            }
          />
          <span style={{ color: tokens.text, fontSize: 14 }}>
            Auto title generation
          </span>
        </label>

        <label>
          <span style={labelStyle}>Reasoning level</span>
          <select
            value={settings.reasoningLevel}
            onChange={(event) =>
              setReasoningLevel(event.target.value as ReasoningLevel)
            }
            style={fieldStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          <span style={labelStyle}>System prompt</span>
          <textarea
            rows={4}
            value={settings.systemPromptOverride ?? ""}
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder="Optional override…"
            style={{ ...fieldStyle, resize: "vertical" }}
          />
        </label>

        <div>
          <span style={labelStyle}>API credentials (server-only)</span>
          <div style={{ display: "grid", gap: 12 }}>
            {(
              [
                ["openai", "OpenAI Key"],
                ["anthropic", "Claude Key"],
                ["google", "Gemini Key"],
                ["openrouter", "OpenRouter Key"],
                ["ollama", "Ollama URL"],
              ] as const
            ).map(([id, label]) => {
              const secret = secrets.find((item) => item.providerId === id);
              return (
                <div
                  key={id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: `1px solid ${tokens.divider}`,
                    background: tokens.chatBubbleBg,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ color: tokens.text, fontSize: 13 }}>
                      {label}
                    </strong>
                    <span style={{ color: tokens.textMuted, fontSize: 12 }}>
                      {secret?.configured
                        ? `Configured (${secret.source})`
                        : "Not configured"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type={id === "ollama" ? "text" : "password"}
                      autoComplete="off"
                      placeholder={
                        id === "ollama"
                          ? "http://127.0.0.1:11434"
                          : "Paste key — never shown again"
                      }
                      value={secretDrafts[id] ?? ""}
                      onChange={(event) =>
                        setSecretDrafts((prev) => ({
                          ...prev,
                          [id]: event.target.value,
                        }))
                      }
                      style={{ ...fieldStyle, flex: 1, minWidth: 180 }}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveSecret(id)}
                      style={actionBtn(tokens)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={saving || secret?.source === "env"}
                      onClick={() => void clearSecret(id)}
                      style={actionBtn(tokens)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveConfiguration()}
          style={{
            ...actionBtn(tokens),
            padding: "14px 18px",
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 650,
            background: tokens.chatReplyBg,
            color: tokens.accent,
          }}
        >
          {saving ? "Saving…" : "Save configuration"}
        </button>

        {status ? (
          <p style={{ margin: 0, color: tokens.textMuted, fontSize: 13 }}>
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function actionBtn(tokens: {
  panelBorder: string;
  text: string;
  inputBg: string;
}): CSSProperties {
  return {
    border: `1px solid ${tokens.panelBorder}`,
    background: tokens.inputBg,
    color: tokens.text,
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 12,
  };
}
