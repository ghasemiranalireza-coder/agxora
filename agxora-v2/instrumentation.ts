/**
 * Next.js instrumentation — production env assert + Sentry hook placeholder.
 * Runs once when the Node.js server starts.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProdEnv } = await import("./app/lib/production/env");
    const warnings = assertProdEnv();
    if (warnings.length > 0) {
      console.warn("[agxora:instrumentation] production env warnings:", warnings);
    }
    // Future: import('@sentry/nextjs').then((Sentry) => { ... registerSentryHook })
  }
}
