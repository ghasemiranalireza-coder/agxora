/**
 * Phase 56 — Agent OS server persistence (org-scoped v7).
 *
 * Uses an in-memory server fixture behind RestAgentsRepository to prove:
 * - round-trip persistence
 * - org isolation
 * - no localStorage dependency in server mode
 * - multi-session consistency
 * - force rehydrate / org switch
 * without requiring a live Postgres in CI.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyAgentsState,
  filterStateForOrganization,
  LocalAgentsRepository,
  MemoryAgentsRepository,
  normalizeState,
  RestAgentsRepository,
  stateContainsForeignOrganization,
  type AgentsPersistedState,
} from "@/features/agents/repositories";
import {
  agentsStore,
  getAgentsRepository,
  setAgentsRepository,
} from "@/features/agents/store";
import type { Actor } from "@/app/lib/tenancy/types";
import { PersistenceError } from "@/app/lib/tenancy/errors";

type ServerRow = {
  organizationId: string;
  payload: AgentsPersistedState;
};

function makeActor(organizationId: string, userId = "user_a"): Actor {
  return {
    userId,
    email: `${userId}@test.agxora`,
    name: userId,
    organizationId,
    workspaceId: `ws_${organizationId}`,
    membershipId: `mem_${userId}`,
    role: "OWNER",
    sessionToken: `tok_${userId}`,
  };
}

/** Minimal v7 fixture — cast through unknown for persistence tests only. */
function sampleState(organizationId: string): AgentsPersistedState {
  const now = "2026-08-26T12:00:00.000Z";
  const base = emptyAgentsState();
  return {
    ...base,
    growthProfiles: [
      {
        id: `gp_${organizationId}`,
        organizationId,
        companyName: `Co ${organizationId}`,
        services: ["consulting"],
        products: [],
        brandKeywords: [],
        socialGoals: [],
        preferredPlatforms: [],
        brand: { tone: "professional", keywords: [] },
        goals: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    campaigns: [
      {
        id: `cmp_${organizationId}`,
        organizationId,
        businessProfileId: `gp_${organizationId}`,
        name: "Campaign",
        objective: { statement: "Grow", metric: "leads" },
        audience: { description: "SMB" },
        offer: "Demo",
        coreMessage: "Hello",
        websiteCta: "Contact",
        socialThemes: [],
        channels: [],
        startDate: "2026-08-01",
        endDate: "2026-09-01",
        status: "DRAFT",
        strategy: "outbound",
        assets: [],
        tasks: [],
        milestones: [],
        contentIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    growthCrmLinks: [
      {
        id: `link_${organizationId}`,
        organizationId,
        profileId: `gp_${organizationId}`,
        customerId: `cus_${organizationId}`,
        href: `/dashboard/crm/cus_${organizationId}`,
        companyName: `Co ${organizationId}`,
        outcome: "linked",
        createdAt: now,
        updatedAt: now,
        lastSyncedAt: now,
      },
    ],
    campaignCrmSyncs: [
      {
        id: `sync_${organizationId}`,
        organizationId,
        campaignId: `cmp_${organizationId}`,
        profileId: `gp_${organizationId}`,
        linkId: `link_${organizationId}`,
        status: "completed",
        createdAt: now,
        updatedAt: now,
      },
    ],
    crmFollowUps: [
      {
        id: `cfu_${organizationId}`,
        organizationId,
        profileId: `gp_${organizationId}`,
        linkId: `link_${organizationId}`,
        customerId: `cus_${organizationId}`,
        kind: "call",
        title: "Call",
        summary: "Follow up",
        status: "pending",
        dueAt: "2026-09-02T00:00:00.000Z",
        createdAt: now,
        updatedAt: now,
      },
    ],
    approvals: [
      {
        id: `apr_${organizationId}`,
        organizationId,
        agentInstanceId: `inst_${organizationId}`,
        executionId: `exe_${organizationId}`,
        taskId: `tsk_${organizationId}`,
        stepId: "step_1",
        action: "create_follow_up",
        reason: "sensitive",
        state: "REQUIRES_APPROVAL",
        requestedAt: now,
      },
    ],
    tasks: [
      {
        id: `tsk_${organizationId}`,
        organizationId,
        agentInstanceId: `inst_${organizationId}`,
        title: "CRM follow-up",
        status: "pending",
        priority: 1,
        input: {},
        attempt: 0,
        maxAttempts: 3,
        createdAt: now,
        updatedAt: now,
      },
    ],
    executionJobs: [
      {
        id: `job_${organizationId}`,
        organizationId,
        agentId: "crm_assistant",
        toolId: "crm",
        title: "Create follow-up",
        status: "WAITING_FOR_APPROVAL",
        priority: "HIGH",
        requiresApproval: true,
        approvalId: `apr_${organizationId}`,
        paused: false,
        queueSeq: 1,
        attempts: [],
        maxAttempts: 3,
        retryable: true,
        params: { action: "create_follow_up" },
        createdAt: now,
        updatedAt: now,
      },
    ],
    executionEvents: [
      {
        id: `evt_${organizationId}`,
        organizationId,
        executionJobId: `job_${organizationId}`,
        timestamp: now,
        type: "QUEUED",
        actor: "system",
        message: "queued",
      },
    ],
  };
}

function createMockServer(initial: ServerRow[] = []) {
  const rows = new Map<string, AgentsPersistedState>();
  for (const row of initial) {
    rows.set(
      row.organizationId,
      filterStateForOrganization(row.payload, row.organizationId),
    );
  }

  let actorOrgId = "org_a";
  let unauthorized = false;

  const fetchImpl: typeof fetch = async (_input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (unauthorized) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "unauthorized",
          message: "Authentication required",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    if (method === "GET") {
      const state = rows.get(actorOrgId) ?? emptyAgentsState();
      return new Response(
        JSON.stringify({ ok: true, organizationId: actorOrgId, state }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (method === "PUT") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        state?: AgentsPersistedState;
        organizationId?: string;
      };
      void body.organizationId;
      const filtered = filterStateForOrganization(body.state, actorOrgId);
      rows.set(actorOrgId, filtered);
      return new Response(
        JSON.stringify({
          ok: true,
          organizationId: actorOrgId,
          state: filtered,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ok: false }), { status: 405 });
  };

  return {
    fetchImpl,
    rows,
    setActorOrg(id: string) {
      actorOrgId = id;
    },
    setUnauthorized(value: boolean) {
      unauthorized = value;
    },
  };
}

describe("Phase 56 Agent OS server persistence", () => {
  beforeEach(() => {
    setAgentsRepository(new LocalAgentsRepository());
    agentsStore.clearMemory();
  });

  afterEach(() => {
    setAgentsRepository(new LocalAgentsRepository());
    agentsStore.clearMemory();
    vi.unstubAllGlobals();
  });

  it("keeps AgentsPersistedState at v7 and filters foreign orgs", () => {
    const mixed: AgentsPersistedState = {
      ...sampleState("org_a"),
      crmFollowUps: [
        ...sampleState("org_a").crmFollowUps,
        ...sampleState("org_b").crmFollowUps,
      ],
    };
    const filtered = filterStateForOrganization(mixed, "org_a");
    expect(filtered.version).toBe(7);
    expect(filtered.crmFollowUps).toHaveLength(1);
    expect(filtered.crmFollowUps[0]?.organizationId).toBe("org_a");
    expect(stateContainsForeignOrganization(filtered, "org_a")).toBe(false);
    expect(stateContainsForeignOrganization(mixed, "org_a")).toBe(true);
    expect(normalizeState({ version: 3 as unknown as 7, tasks: [] })?.version).toBe(
      7,
    );
  });

  it("RestAgentsRepository round-trips Growth/CRM operator state", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    repo.setOrganizationId("org_a");

    await repo.saveAsync(sampleState("org_a"));
    const loaded = await repo.loadAsync();
    expect(loaded?.version).toBe(7);
    expect(loaded?.crmFollowUps[0]?.id).toBe("cfu_org_a");
    expect(loaded?.approvals[0]?.id).toBe("apr_org_a");
    expect(loaded?.executionJobs[0]?.id).toBe("job_org_a");
    expect(loaded?.growthCrmLinks[0]?.customerId).toBe("cus_org_a");
    expect(server.rows.get("org_a")?.crmFollowUps).toHaveLength(1);
  });

  it("surfaces server errors honestly with no silent local fallback", async () => {
    const server = createMockServer();
    server.setUnauthorized(true);
    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    repo.setOrganizationId("org_a");
    await expect(repo.loadAsync()).rejects.toThrow(
      /Authentication required|unauthorized/i,
    );
    expect(repo.lastError).toBeTruthy();
    expect(repo.load()).toBeNull();
  });

  it("enforces org isolation across sessions", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const repoA = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    repoA.setOrganizationId("org_a");
    await repoA.saveAsync(sampleState("org_a"));

    server.setActorOrg("org_b");
    const repoB = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    repoB.setOrganizationId("org_b");
    const loadedB = await repoB.loadAsync();
    expect(loadedB?.crmFollowUps).toHaveLength(0);
    expect(loadedB?.growthProfiles).toHaveLength(0);

    await repoB.saveAsync(sampleState("org_a"));
    const storedB = server.rows.get("org_b");
    expect(storedB?.crmFollowUps ?? []).toHaveLength(0);
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.id).toBe("cfu_org_a");
  });

  it("second repository instance sees the same server state (multi-session)", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const session1 = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    session1.setOrganizationId("org_a");
    await session1.saveAsync(sampleState("org_a"));

    const session2 = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    session2.setOrganizationId("org_a");
    const loaded = await session2.loadAsync();
    expect(loaded?.crmFollowUps[0]?.summary).toBe("Follow up");
    expect(loaded?.approvals[0]?.state).toBe("REQUIRES_APPROVAL");
    expect(loaded?.executionEvents[0]?.executionJobId).toBe("job_org_a");
  });

  it("clearing localStorage does not erase server state", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const memoryLs: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => memoryLs[k] ?? null,
        setItem: (k: string, v: string) => {
          memoryLs[k] = v;
        },
        removeItem: (k: string) => {
          delete memoryLs[k];
        },
      },
    });

    const local = new LocalAgentsRepository();
    local.save(sampleState("org_a"));
    expect(Object.keys(memoryLs).length).toBeGreaterThan(0);

    const rest = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    rest.setOrganizationId("org_a");
    await rest.saveAsync(sampleState("org_a"));

    for (const key of Object.keys(memoryLs)) delete memoryLs[key];
    expect(local.load()).toBeNull();

    const reloaded = await rest.loadAsync();
    expect(reloaded?.crmFollowUps[0]?.id).toBe("cfu_org_a");
  });

  it("force rehydrate and org switch do not leak previous org state", async () => {
    const server = createMockServer();
    setAgentsRepository(
      new RestAgentsRepository("/api/v1/agents/os-state", server.fetchImpl),
    );

    server.setActorOrg("org_a");
    await agentsStore.hydrateAsync({ force: true, organizationId: "org_a" });
    agentsStore.upsertGrowthCrmFollowUp(sampleState("org_a").crmFollowUps[0]!);
    const repo = getAgentsRepository() as RestAgentsRepository;
    await repo.saveAsync({
      ...agentsStore.getSnapshot(),
      version: 7,
    });

    server.setActorOrg("org_b");
    await agentsStore.hydrateAsync({ force: true, organizationId: "org_b" });
    expect(agentsStore.getHydratedOrganizationId()).toBe("org_b");
    expect(
      agentsStore
        .getSnapshot()
        .crmFollowUps.some((f) => f.organizationId === "org_a"),
    ).toBe(false);

    server.setActorOrg("org_a");
    await agentsStore.hydrateAsync({ force: true, organizationId: "org_a" });
    expect(
      agentsStore.getSnapshot().crmFollowUps.some((f) => f.id === "cfu_org_a"),
    ).toBe(true);
  });

  it("MemoryAgentsRepository supports same-org consistency without network", () => {
    const shared = new MemoryAgentsRepository();
    shared.save(sampleState("org_a"));
    setAgentsRepository(shared);
    agentsStore.hydrate({ force: true, organizationId: "org_a" });
    expect(agentsStore.getSnapshot().crmFollowUps).toHaveLength(1);
    expect(shared.load()?.approvals[0]?.organizationId).toBe("org_a");
  });
});

describe("Phase 56 persistence service (mocked Prisma)", () => {
  it("get/put use actor.organizationId only", async () => {
    const store = new Map<string, AgentsPersistedState>();

    vi.doMock("@/app/lib/db/prisma", () => ({
      prisma: {
        agentOsState: {
          findUnique: async ({
            where,
          }: {
            where: { organizationId: string };
          }) => {
            const payload = store.get(where.organizationId);
            if (!payload) return null;
            return {
              organizationId: where.organizationId,
              schemaVersion: 7,
              payload,
            };
          },
          upsert: async ({
            where,
            create,
            update,
          }: {
            where: { organizationId: string };
            create: { payload: AgentsPersistedState };
            update: { payload: AgentsPersistedState };
          }) => {
            const payload = (update?.payload ??
              create.payload) as AgentsPersistedState;
            store.set(where.organizationId, payload);
            return { organizationId: where.organizationId, payload };
          },
        },
      },
    }));

    const { getAgentOsStateForActor, putAgentOsStateForActor } = await import(
      "@/app/lib/agents/persistence/service"
    );

    const actorA = makeActor("org_a");
    const actorB = makeActor("org_b", "user_b");

    await putAgentOsStateForActor(actorA, sampleState("org_a"));
    const forA = await getAgentOsStateForActor(actorA);
    expect(forA.crmFollowUps[0]?.id).toBe("cfu_org_a");

    const forB = await getAgentOsStateForActor(actorB);
    expect(forB.crmFollowUps).toHaveLength(0);

    await putAgentOsStateForActor(actorB, sampleState("org_a"));
    const forBAfter = await getAgentOsStateForActor(actorB);
    expect(forBAfter.crmFollowUps).toHaveLength(0);
    expect((await getAgentOsStateForActor(actorA)).crmFollowUps[0]?.id).toBe(
      "cfu_org_a",
    );

    await expect(putAgentOsStateForActor(actorA, null)).rejects.toBeInstanceOf(
      PersistenceError,
    );
  });
});
