/**
 * AI settings + secret status API (never returns raw secrets).
 */

import { NextResponse } from "next/server";
import {
  DEFAULT_AI_SETTINGS,
  mergeAISettings,
  type AISettings,
} from "../../../lib/ai/AISettings";
import type { AIProviderId } from "../../../lib/ai/AIModel";
import { aiModelRegistry } from "../../../lib/ai/AIModelRegistry";
import {
  clearProviderSecret,
  getProviderSecretStatus,
  loadServerAISettings,
  saveServerAISettings,
  setProviderSecret,
  type ProviderSecretKind,
} from "../../../lib/ai/server/secrets";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const stored = await loadServerAISettings();
  const settings = mergeAISettings({ ...DEFAULT_AI_SETTINGS, ...stored });
  const secrets = await getProviderSecretStatus();
  const models = aiModelRegistry.list().map((model) => ({
    id: model.id,
    providerId: model.providerId,
    displayName: model.displayName,
    contextWindow: model.contextWindow,
    capabilities: model.capabilities,
  }));

  return NextResponse.json({
    settings,
    secrets,
    models,
    providers: [
      { id: "openai", label: "OpenAI" },
      { id: "anthropic", label: "Anthropic Claude" },
      { id: "google", label: "Google Gemini" },
      { id: "openrouter", label: "OpenRouter" },
      { id: "ollama", label: "Ollama (local)" },
      { id: "mock", label: "Mock (offline)" },
    ] satisfies Array<{ id: AIProviderId; label: string }>,
  });
}

interface SettingsPostBody {
  readonly settings?: Partial<AISettings>;
  readonly secret?: {
    readonly providerId: ProviderSecretKind;
    readonly value?: string;
    readonly clear?: boolean;
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: SettingsPostBody;
  try {
    body = (await request.json()) as SettingsPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.secret) {
    const kind = body.secret.providerId;
    const allowed: ProviderSecretKind[] = [
      "openai",
      "anthropic",
      "google",
      "openrouter",
      "ollama",
    ];
    if (!allowed.includes(kind)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (body.secret.clear) {
      await clearProviderSecret(kind);
    } else if (typeof body.secret.value === "string") {
      await setProviderSecret(kind, body.secret.value);
    } else {
      return NextResponse.json({ error: "Secret value required" }, { status: 400 });
    }
  }

  if (body.settings) {
    // Strip anything that looks like a secret key from settings payload.
    const safe = { ...body.settings } as Record<string, unknown>;
    for (const key of Object.keys(safe)) {
      if (/key|secret|token|password/i.test(key)) {
        delete safe[key];
      }
    }
    await saveServerAISettings(safe as Partial<AISettings>);
  }

  const stored = await loadServerAISettings();
  const settings = mergeAISettings({ ...DEFAULT_AI_SETTINGS, ...stored });
  const secrets = await getProviderSecretStatus();

  return NextResponse.json({ settings, secrets });
}
