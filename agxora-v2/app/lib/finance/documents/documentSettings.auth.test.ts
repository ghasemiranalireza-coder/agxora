import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "@/app/lib/tenancy/types";

const actorMocks = vi.hoisted(() => ({
  actor: null as Actor | null,
}));

const settingsMocks = vi.hoisted(() => ({
  patchDocumentSettingsForActor: vi.fn(),
  getDocumentSettingsForActor: vi.fn(),
}));

vi.mock("@/app/lib/tenancy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/tenancy")>();
  return {
    ...actual,
    requireCurrentActor: vi.fn(async () => {
      if (!actorMocks.actor) {
        throw new actual.PersistenceError("unauthorized", "Authentication required");
      }
      return actorMocks.actor;
    }),
  };
});

vi.mock("@/app/lib/finance/persistence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/lib/finance/persistence")>();
  return {
    ...actual,
    patchDocumentSettingsForActor: settingsMocks.patchDocumentSettingsForActor,
    getDocumentSettingsForActor: settingsMocks.getDocumentSettingsForActor,
  };
});

import { PATCH } from "@/app/api/v1/finance/document-settings/route";

const owner: Actor = {
  userId: "user-docs-auth",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-actor",
  workspaceId: "ws-actor",
  membershipId: "mem-actor",
  role: "OWNER",
  sessionToken: "test-session",
};

function patchSettings(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/v1/finance/document-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("finance document settings API auth", () => {
  beforeEach(() => {
    actorMocks.actor = null;
    settingsMocks.patchDocumentSettingsForActor.mockReset();
    settingsMocks.getDocumentSettingsForActor.mockReset();
  });

  it("rejects unauthenticated PATCH so onboarding cannot write finance settings without a session", async () => {
    const response = await patchSettings({ companyName: "Acme GmbH" });
    const body = (await response.json()) as { ok?: boolean; code?: string };
    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("unauthorized");
    expect(settingsMocks.patchDocumentSettingsForActor).not.toHaveBeenCalled();
  });

  it("does not accept a client-provided tenant id; actor workspace remains authoritative", async () => {
    actorMocks.actor = owner;
    settingsMocks.patchDocumentSettingsForActor.mockResolvedValue({
      organizationId: owner.organizationId,
      workspaceId: owner.workspaceId,
      persisted: true,
    });
    const response = await patchSettings({
      companyName: "Acme GmbH",
      organizationId: "org-from-client",
      workspaceId: "ws-from-client",
    });
    expect(response.status).toBe(200);
    expect(settingsMocks.patchDocumentSettingsForActor).toHaveBeenCalledTimes(1);
    const [actorArg, patchArg] = settingsMocks.patchDocumentSettingsForActor.mock.calls[0] as [
      Actor,
      Record<string, unknown>,
    ];
    expect(actorArg.organizationId).toBe("org-actor");
    expect(actorArg.workspaceId).toBe("ws-actor");
    expect(patchArg.companyName).toBe("Acme GmbH");
    expect(actorArg.organizationId).not.toBe("org-from-client");
  });
});
