"use client";

/**
 * AppProviders — root client boundary for foundation providers.
 *
 * Intentionally invisible: no layout, no chrome, no styling.
 * Keeps the server RootLayout clean while enabling client foundations.
 */

import type { JSX, ReactNode } from "react";
import { CoreEngineProvider } from "../lib/core";
import { ChatProvider } from "../lib/modules/chat";
import { OrganizationProvider } from "../lib/organization";

interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <OrganizationProvider>
      <CoreEngineProvider>
        <ChatProvider>{children}</ChatProvider>
      </CoreEngineProvider>
    </OrganizationProvider>
  );
}
