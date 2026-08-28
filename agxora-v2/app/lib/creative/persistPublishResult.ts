/**
 * Phase 63.1 — server-side publishResult persistence to Agent OS v7.
 */

import "server-only";

import type { Actor } from "@/app/lib/tenancy/types";
import {
  getAgentOsStateForActor,
  putAgentOsStateForActor,
} from "@/app/lib/agents/persistence";
import type { AgentsPersistedState } from "@/features/agents/repositories/state";
import type { CreativePublishResult } from "@/features/agents/creative/types";

type PersistFn = (
  actor: Actor,
  state: AgentsPersistedState,
) => Promise<AgentsPersistedState>;

let persistOverride: PersistFn | null = null;

export function setPersistPublishResultForTests(fn: PersistFn | null): void {
  persistOverride = fn;
}

export async function persistPublishResultForActor(
  actor: Actor,
  input: {
    readonly creativeProjectId: string;
    readonly publishExecutionJobId: string;
    readonly publishResult: CreativePublishResult;
  },
  currentState?: AgentsPersistedState,
): Promise<AgentsPersistedState> {
  const put = persistOverride ?? putAgentOsStateForActor;
  const state = currentState ?? (await getAgentOsStateForActor(actor));
  const projects = state.creativeProjects.map((project) => {
    if (
      project.id !== input.creativeProjectId ||
      project.organizationId !== actor.organizationId
    ) {
      return project;
    }
    return {
      ...project,
      publishResult: input.publishResult,
      updatedAt: new Date().toISOString(),
    };
  });
  const executionJobs = state.executionJobs.map((job) => {
    if (
      job.id !== input.publishExecutionJobId ||
      job.organizationId !== actor.organizationId
    ) {
      return job;
    }
    return {
      ...job,
      status:
        input.publishResult.published === true
          ? ("COMPLETED" as const)
          : input.publishResult.status === "failed"
            ? ("FAILED" as const)
            : input.publishResult.status === "uploading"
              ? ("VERIFYING" as const)
              : job.status,
      updatedAt: new Date().toISOString(),
    };
  });
  return put(actor, {
    ...state,
    creativeProjects: projects,
    executionJobs,
  });
}

export async function patchSocialAccountConnectionForActor(
  actor: Actor,
  input: {
    readonly platform: "youtube";
    readonly connected: boolean;
    readonly displayName?: string;
    readonly handle?: string;
  },
): Promise<AgentsPersistedState> {
  const put = persistOverride ?? putAgentOsStateForActor;
  const state = await getAgentOsStateForActor(actor);
  const now = new Date().toISOString();
  let found = false;
  const socialAccounts = state.socialAccounts.map((account) => {
    if (
      account.organizationId !== actor.organizationId ||
      account.platform !== input.platform
    ) {
      return account;
    }
    found = true;
    return {
      ...account,
      state: input.connected ? ("CONNECTED" as const) : ("DISCONNECTED" as const),
      displayName: input.displayName ?? account.displayName,
      handle: input.handle ?? account.handle,
      updatedAt: now,
    };
  });
  const nextAccounts = found
    ? socialAccounts
    : [
        {
          id: `sacc_${input.platform}_${actor.organizationId.slice(0, 8)}`,
          organizationId: actor.organizationId,
          platform: input.platform,
          state: input.connected ? ("CONNECTED" as const) : ("DISCONNECTED" as const),
          displayName: input.displayName,
          handle: input.handle,
          createdAt: now,
          updatedAt: now,
        },
        ...socialAccounts,
      ];
  return put(actor, { ...state, socialAccounts: nextAccounts });
}
