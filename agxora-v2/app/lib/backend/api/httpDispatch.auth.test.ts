import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";
import { agentsStore } from "@/features/agents/store";
import { localDataProvider } from "@/app/lib/backend/providers/data/LocalDataProvider";
import { registerLocalDataHandlers } from "@/app/lib/backend/providers/data/registerLocalHandlers";

const actorMocks = vi.hoisted(() => ({
  actor: null as Actor | null,
}));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorMocks.actor) {
        throw new actual.PersistenceError(
          "unauthorized",
          "Authentication required",
        );
      }
      return actorMocks.actor;
    }),
  };
});

import { dispatchApiRequest } from "./httpDispatch";

const actor: Actor = {
  userId: "user-catch-all",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-actor",
  workspaceId: "ws-actor",
  membershipId: "mem-actor",
  role: "OWNER",
  sessionToken: "test-session",
};

function request(
  path: string,
  init?: { method?: string; body?: unknown },
): Request {
  return new Request(`http://localhost${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe("catch-all API actor tenancy", () => {
  beforeEach(() => {
    actorMocks.actor = null;
    agentsStore.reset();
    registerLocalDataHandlers();
  });

  it("rejects unauthenticated protected catch-all requests", async () => {
    const response = await dispatchApiRequest(
      request("/api/v1/agents/growth/campaigns"),
      "/v1/agents/growth/campaigns",
    );
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("unauthorized");
  });

  it("rejects authenticated requests that select another organization", async () => {
    actorMocks.actor = actor;
    const response = await dispatchApiRequest(
      request("/api/v1/agents/growth/campaigns?organizationId=org-other"),
      "/v1/agents/growth/campaigns",
    );
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("forbidden");
  });

  it("rejects organizationId in the body that does not match the actor", async () => {
    actorMocks.actor = actor;
    const response = await dispatchApiRequest(
      request("/api/v1/agents/growth/campaigns", {
        method: "POST",
        body: { organizationId: "org-other", objective: "steal" },
      }),
      "/v1/agents/growth/campaigns",
    );
    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(403);
    expect(payload.code).toBe("forbidden");
  });

  it("uses the actor organization and workspace for authenticated requests", async () => {
    actorMocks.actor = actor;
    const created = await dispatchApiRequest(
      request("/api/v1/agents/growth/business-profile", {
        method: "POST",
        body: { draft: { companyName: "Actor Org Co", services: ["ops"] } },
      }),
      "/v1/agents/growth/business-profile",
    );
    expect(created.status).toBe(201);
    const profile = (await created.json()) as { organizationId: string };
    expect(profile.organizationId).toBe("org-actor");

    const listed = await dispatchApiRequest(
      request("/api/v1/agents/growth/campaigns"),
      "/v1/agents/growth/campaigns",
    );
    expect(listed.status).toBe(200);
    const campaigns = (await listed.json()) as unknown;
    expect(Array.isArray(campaigns)).toBe(true);
  });

  it("keeps health public", async () => {
    const response = await dispatchApiRequest(
      request("/api/v1/health"),
      "/v1/health",
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.provider).toBe("api-route");
    expect(actorMocks.actor).toBeNull();
  });

  it("does not require HTTP actor binding for in-process local handlers", async () => {
    const created = await localDataProvider.request<{
      readonly organizationId: string;
    }>({
      method: "POST",
      path: "/agents/growth/business-profile",
      body: {
        organizationId: "org_local_in_process",
        draft: { companyName: "Local Demo Co", services: ["ops"] },
      },
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data.organizationId).toBe("org_local_in_process");
    }
  });
});
