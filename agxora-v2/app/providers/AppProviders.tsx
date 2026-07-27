"use client";

/**
 * AppProviders — root client boundary for the AGXORA OS.
 *
 * Theme → Organization → Business OS → Memory → AI Settings → Chat
 */

import type { JSX, ReactNode } from "react";
import { AISettingsProvider } from "../lib/ai/AIProviderContext";
import { BusinessOsProvider } from "../lib/business";
import { MemoryProvider } from "../lib/memory";
import { ChatProvider } from "../lib/modules/chat";
import { OrganizationProvider } from "../lib/organization";
import { ThemeProvider } from "../lib/theme";

interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider>
      <OrganizationProvider>
        <BusinessOsProvider>
          <MemoryProvider>
            <AISettingsProvider>
              <ChatProvider>{children}</ChatProvider>
            </AISettingsProvider>
          </MemoryProvider>
        </BusinessOsProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
