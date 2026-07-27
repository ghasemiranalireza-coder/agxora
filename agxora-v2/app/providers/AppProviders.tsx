"use client";

/**
 * AppProviders — root client boundary for the AGXORA OS.
 *
 * Theme → Auth → Organization → Business OS → Memory → AI Settings → Chat
 */

import type { JSX, ReactNode } from "react";
import { AISettingsProvider } from "../lib/ai/AIProviderContext";
import { AuthOrganizationBridge, AuthProvider } from "../lib/auth";
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
      <AuthProvider>
        <AuthOrganizationBridge>
          <OrganizationProvider>
            <BusinessOsProvider>
              <MemoryProvider>
                <AISettingsProvider>
                  <ChatProvider>{children}</ChatProvider>
                </AISettingsProvider>
              </MemoryProvider>
            </BusinessOsProvider>
          </OrganizationProvider>
        </AuthOrganizationBridge>
      </AuthProvider>
    </ThemeProvider>
  );
}
