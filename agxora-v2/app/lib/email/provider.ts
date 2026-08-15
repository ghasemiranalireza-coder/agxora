/**
 * Phase 45 — resolve active email provider from env.
 */

import "server-only";

import { getEmailConfig } from "./config";
import { consoleEmailProvider } from "./providers/console";
import { createHttpEmailProvider } from "./providers/http";
import { memoryEmailProvider } from "./providers/memory";
import { noneEmailProvider } from "./providers/none";
import type { EmailProvider } from "./types";

let override: EmailProvider | null = null;

/** Test-only provider injection. */
export function setEmailProviderForTests(provider: EmailProvider | null): void {
  override = provider;
}

export function getEmailProvider(): EmailProvider {
  if (override) return override;

  const config = getEmailConfig();
  switch (config.provider) {
    case "console":
      return consoleEmailProvider;
    case "memory":
      return memoryEmailProvider;
    case "http": {
      const http = createHttpEmailProvider(config);
      return http.configured ? http : noneEmailProvider;
    }
    case "none":
    default:
      return noneEmailProvider;
  }
}
