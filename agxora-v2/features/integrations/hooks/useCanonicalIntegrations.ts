"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedProviderState } from "@/app/lib/integrations/resolver";

type Policy = { readonly mode: "SAFE" | "ASSISTED" | "AUTONOMOUS" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = (await response.json().catch(() => ({}))) as T & {
    ok?: boolean;
    message?: string;
  };
  if (!response.ok || body.ok === false) {
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return body;
}

async function loadCanonicalIntegrations(): Promise<{
  readonly providers: readonly ResolvedProviderState[];
  readonly policy: Policy | null;
}> {
  const [list, policyRes] = await Promise.all([
    api<{ providers?: ResolvedProviderState[] }>("/api/v1/integrations"),
    api<{ policy: Policy }>("/api/v1/agent-policy"),
  ]);
  return {
    providers: list.providers ?? [],
    policy: policyRes.policy,
  };
}

export function useCanonicalIntegrations() {
  const [providers, setProviders] = useState<readonly ResolvedProviderState[]>(
    [],
  );
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const applyLoaded = useCallback(
    (next: {
      readonly providers: readonly ResolvedProviderState[];
      readonly policy: Policy | null;
    }) => {
      setProviders(next.providers);
      setPolicy(next.policy);
      setLoaded(true);
    },
    [],
  );

  const reload = useCallback(async () => {
    const next = await loadCanonicalIntegrations();
    applyLoaded(next);
  }, [applyLoaded]);

  useEffect(() => {
    let cancelled = false;
    void loadCanonicalIntegrations()
      .then((next) => {
        if (!cancelled) applyLoaded(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "load_failed");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [applyLoaded]);

  return {
    providers,
    policy,
    error,
    setError,
    busy,
    setBusy,
    loaded,
    reload,
  };
}

export type { Policy };
