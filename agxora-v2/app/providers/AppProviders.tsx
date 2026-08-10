"use client";

/**
 * AppProviders — root client boundary for the AGXORA OS.
 *
 * Theme → Auth → Organization → Business OS → Memory → AI Settings → Chat
 * → Backend foundation hosts (error / toast / loading)
 */

import type { JSX, ReactNode } from "react";
import {
  AppErrorBoundary,
  GlobalLoadingOverlay,
  NetworkStatusBanner,
  ToastHost,
} from "../components/backend";
import { AISettingsProvider } from "../lib/ai/AIProviderContext";
import { AuthOrganizationBridge, AuthProvider } from "../lib/auth";
import {
  BackendStateBridge,
  DataPlatformBridge,
} from "../lib/backend/providers";
import { BusinessOsProvider } from "../lib/business";
import { HtmlLangSync, LocaleProvider, type AppLocale } from "../lib/i18n";
import { MemoryProvider } from "../lib/memory";
import { ChatProvider } from "../lib/modules/chat";
import { OrganizationProvider } from "../lib/organization";
import { ThemeProvider } from "../lib/theme";
import { AutomationBridge } from "../../features/automation/providers";
import { IntegrationBridge } from "../../features/integrations/providers";
import { AgentOsBridge } from "../../features/agents/providers";
import { IntelligenceBridge } from "../../features/intelligence/providers";

interface AppProvidersProps {
  readonly children: ReactNode;
  /** Validated SSR locale from cookie (matches root html lang/dir). */
  readonly initialLocale?: AppLocale;
}

export function AppProviders({
  children,
  initialLocale,
}: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider>
      <LocaleProvider initialLocale={initialLocale}>
        <HtmlLangSync />
        <AuthProvider>
          <AuthOrganizationBridge>
            <OrganizationProvider>
              <BackendStateBridge>
                <DataPlatformBridge>
                  <AutomationBridge>
                    <IntegrationBridge>
                      <AgentOsBridge>
                        <IntelligenceBridge>
                          <BusinessOsProvider>
                            <MemoryProvider>
                              <AISettingsProvider>
                                <ChatProvider>
                                  <AppErrorBoundary>
                                    {children}
                                    <ToastHost />
                                    <NetworkStatusBanner />
                                    <GlobalLoadingOverlay />
                                  </AppErrorBoundary>
                                </ChatProvider>
                              </AISettingsProvider>
                            </MemoryProvider>
                          </BusinessOsProvider>
                        </IntelligenceBridge>
                      </AgentOsBridge>
                    </IntegrationBridge>
                  </AutomationBridge>
                </DataPlatformBridge>
              </BackendStateBridge>
            </OrganizationProvider>
          </AuthOrganizationBridge>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
