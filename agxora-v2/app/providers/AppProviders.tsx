"use client";

/**
 * AppProviders — root client boundary for foundation providers.
 *
 * Intentionally invisible: no layout, no chrome, no styling.
 * Order: Theme → Organization → Memory → Chat
 */

import type { JSX, ReactNode } from "react";
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
        <MemoryProvider>
          <ChatProvider>{children}</ChatProvider>
        </MemoryProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}
