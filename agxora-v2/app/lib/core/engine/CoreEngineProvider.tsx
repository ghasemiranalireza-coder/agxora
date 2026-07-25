"use client";

/**
 * CoreEngineProvider — invisible OS root.
 * Does not alter layout, theme, or dashboard chrome.
 */

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { useOrganization } from "../../organization";
import { workspaceKindFromType } from "../engines/WorkspaceEngine";
import { CoreEvents } from "../bus/EventBus";
import { createCoreEngine } from "./createCoreEngine";
import type { CoreEngine } from "./CoreEngine";

export const CoreEngineContext = createContext<CoreEngine | null>(null);

interface CoreEngineProviderProps {
  readonly children: ReactNode;
  /** Optional injected engine (tests). */
  readonly engine?: CoreEngine;
}

export function CoreEngineProvider({
  children,
  engine: injected,
}: CoreEngineProviderProps): JSX.Element {
  const { workspace, organization } = useOrganization();
  const [engine] = useState(
    () =>
      injected ??
      createCoreEngine({
        workspaceId: workspace?.id ?? null,
        organizationId: organization?.id ?? null,
      }),
  );

  useEffect(() => {
    const kind = workspaceKindFromType(organization?.type);
    engine.workspace.setActive({
      workspaceId: workspace?.id ?? null,
      organizationId: organization?.id ?? null,
      kind: workspace ? kind : null,
      name: workspace?.name ?? null,
      isolated: true,
    });

    engine.events.publish({
      type: CoreEvents.WORKSPACE_CHANGED,
      source: "core.workspace",
      timestamp: new Date().toISOString(),
      workspaceId: workspace?.id ?? null,
      organizationId: organization?.id ?? null,
      payload: {
        workspaceId: workspace?.id ?? null,
        organizationId: organization?.id ?? null,
      },
    });
  }, [engine, workspace, organization]);

  const value = useMemo(() => engine, [engine]);

  return (
    <CoreEngineContext.Provider value={value}>
      {children}
    </CoreEngineContext.Provider>
  );
}
