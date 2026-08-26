"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import {
  createAgentsRepositoryForMode,
  getAgentOsPersistenceMode,
  isAgentOsServerMode,
} from "../repositories";
import {
  agentsStore,
  setAgentsRepository,
} from "../store";
import { agentOsService } from "../services";
import { useAgentsOrganizationId } from "../hooks";
import { useOptionalAuth } from "@/app/lib/auth";

interface AgentOsBridgeProps {
  readonly children?: ReactNode;
}

let repositoryModeApplied: string | null = null;

function ensureRepositoryForMode(): void {
  const mode = getAgentOsPersistenceMode();
  if (repositoryModeApplied === mode) return;
  setAgentsRepository(createAgentsRepositoryForMode(mode));
  repositoryModeApplied = mode;
}

export function AgentOsBridge({
  children,
}: AgentOsBridgeProps): JSX.Element {
  const organizationId = useAgentsOrganizationId();
  const auth = useOptionalAuth();
  const sessionKey = auth?.user?.id ?? "anon";

  useEffect(() => {
    try {
      ensureRepositoryForMode();
    } catch {
      // Fail closed: misconfigured production must not use localStorage.
      agentsStore.clearMemory();
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (isAgentOsServerMode()) {
        try {
          // Org/session change: flush then hard switch; adopt server org from GET.
          await agentsStore.hydrateAsync({
            force: true,
            forceOrgSwitch: true,
            organizationId,
          });
        } catch {
          if (!cancelled) {
            // Fail closed: empty memory, no localStorage fallback.
            agentsStore.clearMemory();
          }
          return;
        }
      } else {
        agentsStore.hydrate({ force: true, organizationId });
      }
      if (cancelled) return;
      const scopedOrg =
        agentsStore.getHydratedOrganizationId() ?? organizationId;
      agentOsService.ensureWorkspace(scopedOrg);
    };

    void run();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!isAgentOsServerMode()) return;
      void (async () => {
        // High #1: never force-discard unsaved/in-flight work.
        if (
          agentsStore.hasPendingPersistence() ||
          agentsStore.isPersistenceDirty()
        ) {
          try {
            await agentsStore.flushPersistence();
          } catch {
            return;
          }
          if (
            agentsStore.hasPendingPersistence() ||
            agentsStore.isPersistenceDirty()
          ) {
            return;
          }
        }
        // Soft refresh only when clean — hydrateAsync skips GET if dirty.
        await agentsStore.hydrateAsync({ force: true });
      })();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (isAgentOsServerMode()) {
        void agentsStore.flushPersistence().catch(() => undefined);
      }
    };
  }, [organizationId, sessionKey]);

  return <>{children ?? null}</>;
}
