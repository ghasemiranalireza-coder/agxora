/**
 * Observability — logging, metrics hooks, analytics placeholders.
 */

export type PlatformLogLevel = "debug" | "info" | "warn" | "error";

export type PlatformEventName =
  | "api.error"
  | "api.retry"
  | "cache.hit"
  | "cache.miss"
  | "repo.read"
  | "repo.write"
  | "auth.token_refresh"
  | "perf.mark"
  | "analytics.track";

export interface PlatformLogRecord {
  readonly level: PlatformLogLevel;
  readonly message: string;
  readonly event?: PlatformEventName;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly at: string;
}

type Listener = (record: PlatformLogRecord) => void;

const listeners = new Set<Listener>();
const metrics = new Map<string, number>();
const recent: PlatformLogRecord[] = [];
const MAX = 200;

export function subscribePlatformLogs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function logPlatform(
  level: PlatformLogLevel,
  message: string,
  metadata?: Readonly<Record<string, string>>,
  event?: PlatformEventName,
): void {
  const record: PlatformLogRecord = {
    level,
    message,
    metadata,
    event,
    at: new Date().toISOString(),
  };
  recent.unshift(record);
  if (recent.length > MAX) recent.length = MAX;
  listeners.forEach((l) => l(record));
  if (typeof console !== "undefined") {
    const fn =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.info;
    fn(`[agxora:${level}]`, message, metadata ?? "");
  }
}

export function logPlatformEvent(
  event: PlatformEventName,
  metadata?: Readonly<Record<string, string>>,
): void {
  logPlatform("info", event, metadata, event);
  metrics.set(event, (metrics.get(event) ?? 0) + 1);
}

export function listPlatformLogs(): readonly PlatformLogRecord[] {
  return recent;
}

export function getPlatformMetrics(): Readonly<Record<string, number>> {
  return Object.fromEntries(metrics);
}

export function markPerformance(name: string): void {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(`agxora:${name}`);
  }
  logPlatformEvent("perf.mark", { name });
}

/** Analytics hook placeholder — wire Segment/PostHog later. */
export function trackAnalytics(
  event: string,
  properties?: Readonly<Record<string, string>>,
): void {
  logPlatformEvent("analytics.track", { event, ...properties });
}
