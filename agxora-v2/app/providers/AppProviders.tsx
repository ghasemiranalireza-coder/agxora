"use client";

/**
 * AppProviders — root client boundary for foundation providers.
 *
 * Intentionally invisible: no layout, no chrome, no styling.
 * Keeps the server RootLayout clean while enabling client foundations.
 */

import type { JSX, ReactNode } from "react";
import { OrganizationProvider } from "../lib/organization";

interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return <OrganizationProvider>{children}</OrganizationProvider>;
}
