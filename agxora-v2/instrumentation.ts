/**
 * Next.js instrumentation — production env assert + Sentry hook placeholder.
 * Runs once when the Node.js server starts.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProdEnv, isProductionRuntime } = await import(
      "./app/lib/production/env"
    );
    const warnings = assertProdEnv();
    if (warnings.length > 0) {
      const log = isProductionRuntime() ? console.error : console.warn;
      log("[agxora:instrumentation] production env issues:", warnings);
    }
  }
}
