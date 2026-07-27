/**
 * Server-only provider secret resolution.
 * Keys never leave the server. Client only learns configured: boolean.
 */

import "server-only";

import { AI_ENV_KEYS, type AISettings } from "../AISettings";
import type { AIProviderId } from "../AIModel";
import { promises as fs } from "node:fs";
import path from "node:path";

export type ProviderSecretKind =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "ollama";

export interface ProviderSecretStatus {
  readonly providerId: ProviderSecretKind;
  readonly configured: boolean;
  readonly source: "env" | "store" | "none";
}

interface SecretStoreFile {
  version: 1;
  secrets: Partial<Record<ProviderSecretKind, string>>;
  settings?: Partial<AISettings>;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), ".data", "ai-secrets.json");

const ENV_MAP: Record<ProviderSecretKind, string> = {
  openai: AI_ENV_KEYS.openai,
  anthropic: AI_ENV_KEYS.anthropic,
  google: AI_ENV_KEYS.google,
  openrouter: AI_ENV_KEYS.openrouter,
  ollama: AI_ENV_KEYS.ollama,
};

async function readStore(): Promise<SecretStoreFile> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SecretStoreFile;
    return {
      version: 1,
      secrets: parsed.secrets ?? {},
      settings: parsed.settings,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      version: 1,
      secrets: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

async function writeStore(store: SecretStoreFile): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function envValue(kind: ProviderSecretKind): string | undefined {
  const key = ENV_MAP[kind];
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
}

export async function getProviderSecret(
  kind: ProviderSecretKind,
): Promise<string | undefined> {
  const fromEnv = envValue(kind);
  if (fromEnv) return fromEnv;
  const store = await readStore();
  const fromStore = store.secrets[kind];
  return fromStore && fromStore.trim() ? fromStore.trim() : undefined;
}

export async function getProviderSecretStatus(): Promise<
  readonly ProviderSecretStatus[]
> {
  const store = await readStore();
  const kinds: ProviderSecretKind[] = [
    "openai",
    "anthropic",
    "google",
    "openrouter",
    "ollama",
  ];
  return kinds.map((providerId) => {
    if (envValue(providerId)) {
      return { providerId, configured: true, source: "env" as const };
    }
    if (store.secrets[providerId]) {
      return { providerId, configured: true, source: "store" as const };
    }
    return { providerId, configured: false, source: "none" as const };
  });
}

export async function setProviderSecret(
  kind: ProviderSecretKind,
  value: string,
): Promise<ProviderSecretStatus> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Secret value is required");
  }
  // Never allow obviously leaked patterns into logs — store only.
  const store = await readStore();
  store.secrets[kind] = trimmed;
  store.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { providerId: kind, configured: true, source: "store" };
}

export async function clearProviderSecret(
  kind: ProviderSecretKind,
): Promise<ProviderSecretStatus> {
  const store = await readStore();
  delete store.secrets[kind];
  store.updatedAt = new Date().toISOString();
  await writeStore(store);
  return {
    providerId: kind,
    configured: Boolean(envValue(kind)),
    source: envValue(kind) ? "env" : "none",
  };
}

export async function loadServerAISettings(): Promise<Partial<AISettings>> {
  const store = await readStore();
  return store.settings ?? {};
}

export async function saveServerAISettings(
  settings: Partial<AISettings>,
): Promise<Partial<AISettings>> {
  const store = await readStore();
  store.settings = { ...store.settings, ...settings };
  store.updatedAt = new Date().toISOString();
  await writeStore(store);
  return store.settings ?? {};
}

export function providerIdToSecretKind(
  providerId: AIProviderId,
): ProviderSecretKind | null {
  if (providerId === "mock") return null;
  return providerId as ProviderSecretKind;
}

export async function resolveOllamaBaseUrl(): Promise<string> {
  return (await getProviderSecret("ollama")) || "http://127.0.0.1:11434";
}
