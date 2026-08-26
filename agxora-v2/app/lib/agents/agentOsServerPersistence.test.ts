/**
 * Phase 56 — Agent OS server persistence (org-scoped v7) + High #1–#3 hardening.
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
  let putHandler:
    | null
    | ((state: AgentsPersistedState) => Promise<Response> | Response) = null;
  let getDelayMs = 0;

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
      if (getDelayMs > 0) {
        await new Promise((r) => setTimeout(r, getDelayMs));
      }
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
      if (putHandler) {
        return putHandler(body.state ?? emptyAgentsState());
      }
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
    setPutHandler(
      handler: null | ((state: AgentsPersistedState) => Promise<Response> | Response),
    ) {
      putHandler = handler;
    },
    setGetDelayMs(ms: number) {
      getDelayMs = ms;
    },
  };
}

describe("Phase 56 Agent OS server persistence", () => {
  beforeEach(() => {
    setAgentsRepository(new LocalAgentsRepository());
    agentsStore.clearMemory();
    vi.useRealTimers();
  });

  afterEach(() => {
    setAgentsRepository(new LocalAgentsRepository());
    agentsStore.clearMemory();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
    expect(stateContainsForeignOrganization(filtered, "org_a")).toBe(false);
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
    await repo.loadAsync();
    expect(repo.getAuthoritativeOrganizationId()).toBe("org_a");
    await repo.saveAsync(sampleState("org_a"));
    const loaded = await repo.loadAsync();
    expect(loaded?.crmFollowUps[0]?.id).toBe("cfu_org_a");
    expect(loaded?.approvals[0]?.id).toBe("apr_org_a");
    expect(server.rows.get("org_a")?.crmFollowUps).toHaveLength(1);
  });

  it("surfaces unauthorized 401 honestly with no silent local fallback", async () => {
    const server = createMockServer();
    server.setUnauthorized(true);
    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await expect(repo.loadAsync()).rejects.toThrow(
      /Authentication required|unauthorized/i,
    );
    expect(repo.getLastError()).toBeTruthy();
    expect(repo.load()).toBeNull();
  });

  it("enforces org isolation across sessions", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const repoA = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await repoA.loadAsync();
    await repoA.saveAsync(sampleState("org_a"));

    server.setActorOrg("org_b");
    const repoB = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    const loadedB = await repoB.loadAsync();
    expect(loadedB?.crmFollowUps).toHaveLength(0);

    await repoB.saveAsync(sampleState("org_a"));
    expect(server.rows.get("org_b")?.crmFollowUps ?? []).toHaveLength(0);
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.id).toBe("cfu_org_a");
  });

  it("second repository instance sees the same server state (multi-session)", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    const session1 = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await session1.loadAsync();
    await session1.saveAsync(sampleState("org_a"));

    const session2 = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    const loaded = await session2.loadAsync();
    expect(loaded?.crmFollowUps[0]?.summary).toBe("Follow up");
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
      addEventListener: () => undefined,
    });
    vi.stubGlobal("document", {
      addEventListener: () => undefined,
      visibilityState: "visible",
    });

    const local = new LocalAgentsRepository();
    local.save(sampleState("org_a"));
    expect(Object.keys(memoryLs).length).toBeGreaterThan(0);

    const rest = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await rest.loadAsync();
    await rest.saveAsync(sampleState("org_a"));

    for (const key of Object.keys(memoryLs)) delete memoryLs[key];
    expect(local.load()).toBeNull();
    expect((await rest.loadAsync())?.crmFollowUps[0]?.id).toBe("cfu_org_a");
  });

  it("local persistence mode remains unchanged", () => {
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
    local.save(sampleState("org_local"));
    expect(local.load()?.crmFollowUps[0]?.organizationId).toBe("org_local");
    setAgentsRepository(local);
    agentsStore.hydrate({ force: true, organizationId: "org_local" });
    expect(agentsStore.getSnapshot().crmFollowUps).toHaveLength(1);
  });

  it("failed PUT keeps pending state and exposes error (High #2)", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    server.setPutHandler(() =>
      new Response(
        JSON.stringify({ ok: false, code: "persistence", message: "write_failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      ),
    );
    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await repo.loadAsync();
    await expect(repo.saveAsync(sampleState("org_a"))).rejects.toThrow(
      /write_failed/,
    );
    expect(repo.isDirty()).toBe(true);
    expect(repo.hasPendingOrInflight()).toBe(true);
    expect(repo.getLastError()).toMatch(/write_failed/);
    expect(repo.load()?.crmFollowUps[0]?.id).toBe("cfu_org_a");

    // Retry succeeds and drains.
    server.setPutHandler(null);
    await repo.flushNow();
    expect(repo.isDirty()).toBe(false);
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.id).toBe("cfu_org_a");
  });

  it("save during in-flight PUT eventually flushes latest pending (High #2)", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    let releasePut!: () => void;
    const gate = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    let putCount = 0;
    server.setPutHandler(async (state) => {
      putCount += 1;
      if (putCount === 1) await gate;
      const filtered = filterStateForOrganization(state, "org_a");
      server.rows.set("org_a", filtered);
      return new Response(
        JSON.stringify({
          ok: true,
          organizationId: "org_a",
          state: filtered,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await repo.loadAsync();
    const first = sampleState("org_a");
    const second: AgentsPersistedState = {
      ...sampleState("org_a"),
      crmFollowUps: [
        {
          ...sampleState("org_a").crmFollowUps[0]!,
          summary: "Latest follow up",
        },
      ],
    };

    const firstSave = repo.saveAsync(first);
    // Allow first PUT to start
    await new Promise((r) => setTimeout(r, 10));
    repo.save(second);
    releasePut();
    await firstSave;
    await repo.flushNow();
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.summary).toBe(
      "Latest follow up",
    );
    expect(repo.isDirty()).toBe(false);
  });

  it("visibility-style rehydrate does not discard pending/in-flight saves (High #1)", async () => {
    const server = createMockServer([
      { organizationId: "org_a", payload: sampleState("org_a") },
    ]);
    server.setActorOrg("org_a");
    setAgentsRepository(
      new RestAgentsRepository("/api/v1/agents/os-state", server.fetchImpl),
    );
    await agentsStore.hydrateAsync({ force: true, forceOrgSwitch: true });
    expect(agentsStore.getSnapshot().crmFollowUps[0]?.summary).toBe("Follow up");

    // Local mutation (dirty) — server still has old summary until flush.
    agentsStore.upsertGrowthCrmFollowUp({
      ...sampleState("org_a").crmFollowUps[0]!,
      summary: "Unsaved local edit",
    });
    expect(agentsStore.isPersistenceDirty()).toBe(true);

    // Simulate visibility soft refresh.
    await agentsStore.hydrateAsync({ force: true });
    expect(agentsStore.getSnapshot().crmFollowUps[0]?.summary).toBe(
      "Unsaved local edit",
    );

    await agentsStore.flushPersistence();
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.summary).toBe(
      "Unsaved local edit",
    );
  });

  it("visibility-style rehydrate does not discard in-flight PUT state (High #1)", async () => {
    const server = createMockServer([
      { organizationId: "org_a", payload: sampleState("org_a") },
    ]);
    server.setActorOrg("org_a");
    let releasePut!: () => void;
    const gate = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    server.setPutHandler(async (state) => {
      await gate;
      const filtered = filterStateForOrganization(state, "org_a");
      server.rows.set("org_a", filtered);
      return new Response(
        JSON.stringify({
          ok: true,
          organizationId: "org_a",
          state: filtered,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    setAgentsRepository(repo);
    await agentsStore.hydrateAsync({ force: true, forceOrgSwitch: true });

    // Store mutation → debounced PUT stays in-flight behind the gate.
    agentsStore.upsertGrowthCrmFollowUp({
      ...sampleState("org_a").crmFollowUps[0]!,
      summary: "In-flight edit",
    });
    await new Promise((r) => setTimeout(r, 250));
    expect(repo.hasPendingOrInflight()).toBe(true);
    expect(repo.isDirty()).toBe(true);

    // Visibility soft refresh must not wait on PUT or clobber memory.
    await agentsStore.hydrateAsync({ force: true });
    expect(agentsStore.getSnapshot().crmFollowUps[0]?.summary).toBe(
      "In-flight edit",
    );

    releasePut();
    await agentsStore.flushPersistence();
    expect(server.rows.get("org_a")?.crmFollowUps[0]?.summary).toBe(
      "In-flight edit",
    );
    expect(repo.isDirty()).toBe(false);
  });

  it("client org != server org cannot empty-overwrite server state (High #3)", async () => {
    const server = createMockServer([
      { organizationId: "org_server", payload: sampleState("org_server") },
    ]);
    server.setActorOrg("org_server");
    const repo = new RestAgentsRepository(
      "/api/v1/agents/os-state",
      server.fetchImpl,
    );
    await repo.loadAsync();
    expect(repo.getAuthoritativeOrganizationId()).toBe("org_server");
    expect(repo.load()?.crmFollowUps[0]?.id).toBe("cfu_org_server");

    // Client tries to save only foreign-org records (mismatch).
    await expect(repo.saveAsync(sampleState("org_client"))).rejects.toThrow(
      /org_mismatch_refused_empty_put/,
    );
    expect(server.rows.get("org_server")?.crmFollowUps[0]?.id).toBe(
      "cfu_org_server",
    );
    expect(repo.load()?.crmFollowUps[0]?.id).toBe("cfu_org_server");
  });

  it("hydrate adopts server organizationId, not divergent client hint (High #3)", async () => {
    const server = createMockServer([
      { organizationId: "org_server", payload: sampleState("org_server") },
    ]);
    server.setActorOrg("org_server");
    setAgentsRepository(
      new RestAgentsRepository("/api/v1/agents/os-state", server.fetchImpl),
    );
    await agentsStore.hydrateAsync({
      force: true,
      forceOrgSwitch: true,
      organizationId: "org_client_hint",
    });
    expect(agentsStore.getHydratedOrganizationId()).toBe("org_server");
    expect(agentsStore.getSnapshot().crmFollowUps[0]?.id).toBe(
      "cfu_org_server",
    );
  });

  it("org switch clears old org state and hydrates the authenticated org", async () => {
    const server = createMockServer();
    server.setActorOrg("org_a");
    setAgentsRepository(
      new RestAgentsRepository("/api/v1/agents/os-state", server.fetchImpl),
    );
    await agentsStore.hydrateAsync({ force: true, forceOrgSwitch: true });
    agentsStore.upsertGrowthCrmFollowUp(sampleState("org_a").crmFollowUps[0]!);
    await agentsStore.flushPersistence();
    expect(agentsStore.getSnapshot().crmFollowUps[0]?.id).toBe("cfu_org_a");

    server.setActorOrg("org_b");
    setAgentsRepository(
      new RestAgentsRepository("/api/v1/agents/os-state", server.fetchImpl),
    );
    await agentsStore.hydrateAsync({ force: true, forceOrgSwitch: true });
    expect(agentsStore.getHydratedOrganizationId()).toBe("org_b");
    expect(
      agentsStore
        .getSnapshot()
        .crmFollowUps.some((f) => f.organizationId === "org_a"),
    ).toBe(false);
  });

  it("MemoryAgentsRepository supports same-org consistency without network", () => {
    const shared = new MemoryAgentsRepository();
    shared.save(sampleState("org_a"));
    setAgentsRepository(shared);
    agentsStore.hydrate({ force: true, organizationId: "org_a" });
    expect(agentsStore.getSnapshot().crmFollowUps).toHaveLength(1);
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
    expect((await getAgentOsStateForActor(actorA)).crmFollowUps[0]?.id).toBe(
      "cfu_org_a",
    );
    expect((await getAgentOsStateForActor(actorB)).crmFollowUps).toHaveLength(0);

    await putAgentOsStateForActor(actorB, sampleState("org_a"));
    expect((await getAgentOsStateForActor(actorB)).crmFollowUps).toHaveLength(0);
    expect((await getAgentOsStateForActor(actorA)).crmFollowUps[0]?.id).toBe(
      "cfu_org_a",
    );

    await expect(putAgentOsStateForActor(actorA, null)).rejects.toBeInstanceOf(
      PersistenceError,
    );
  });
});
