/**
 * Production observability stubs — logging, monitoring, tracing, Sentry-ready.
 */

import {
  logPlatform,
  logPlatformEvent,
  type PlatformEventName,
} from "@/app/lib/backend/observability/logger";

export type TraceSpan = {
  readonly name: string;
  readonly startedAt: number;
  end(metadata?: Readonly<Record<string, string>>): void;
};

let sentryHook:
  | ((error: unknown, context?: Readonly<Record<string, string>>) => void)
  | null = null;

/** Future: wire @sentry/nextjs captureException here. */
export function registerSentryHook(
  hook: (error: unknown, context?: Readonly<Record<string, string>>) => void,
): void {
  sentryHook = hook;
}

export function reportError(
  error: unknown,
  context?: Readonly<Record<string, string>>,
): void {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  logPlatform("error", message, {
    ...context,
    stack: error instanceof Error ? (error.stack ?? "").slice(0, 500) : "",
  });
  logPlatformEvent("api.error", { source: context?.source ?? "client" });
  try {
    sentryHook?.(error, context);
  } catch {
    // never throw from reporting
  }
}

export function trackPerformance(
  name: string,
  durationMs: number,
  metadata?: Readonly<Record<string, string>>,
): void {
  logPlatformEvent("perf.mark", {
    name,
    durationMs: String(Math.round(durationMs)),
    ...metadata,
  });
}

export function startTrace(name: string): TraceSpan {
  const startedAt = Date.now();
  return {
    name,
    startedAt,
    end(metadata) {
      trackPerformance(name, Date.now() - startedAt, metadata);
    },
  };
}

export function trackAnalytics(
  event: PlatformEventName | string,
  metadata?: Readonly<Record<string, string>>,
): void {
  if (
    event === "api.error" ||
    event === "api.retry" ||
    event === "cache.hit" ||
    event === "cache.miss" ||
    event === "repo.read" ||
    event === "repo.write" ||
    event === "auth.token_refresh" ||
    event === "perf.mark" ||
    event === "analytics.track"
  ) {
    logPlatformEvent(event, metadata);
    return;
  }
  logPlatform("info", event, metadata, "analytics.track");
}
