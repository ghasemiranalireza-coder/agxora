"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import {
  createAgentsRepositoryForMode,
  getAgentOsPersistenceMode,
  isAgentOsServerMode,
} from "../repositories";
import {
  agentsStore,
  getAgentsRepository,
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
    ensureRepositoryForMode();
    const repo = getAgentsRepository();
    if (typeof repo.setOrganizationId === "function") {
      repo.setOrganizationId(organizationId);
    }

    let cancelled = false;

    const run = async () => {
      if (isAgentOsServerMode()) {
        try {
          await agentsStore.hydrateAsync({
            force: true,
            organizationId,
          });
        } catch {
          if (!cancelled) {
            // Fail closed for in-memory view: empty org state (no localStorage fallback).
            agentsStore.clearMemory();
            agentsStore.hydrate({ force: true, organizationId });
          }
          return;
        }
      } else {
        agentsStore.hydrate({ force: true, organizationId });
      }
      if (!cancelled) {
        agentOsService.ensureWorkspace(organizationId);
      }
    };

    void run();

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!isAgentOsServerMode()) return;
      void agentsStore.hydrateAsync({ force: true, organizationId });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [organizationId, sessionKey]);

  return <>{children ?? null}</>;
}
