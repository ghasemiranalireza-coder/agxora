import { describe, expect, it } from "vitest";
import { PersistenceError } from "@/app/lib/tenancy/errors";
import type { Actor } from "@/app/lib/tenancy/types";
import type { AIRuntimeContext } from "./AIContext";
import { bindChatContextToActor } from "./chatAuth";

const actor: Actor = {
  userId: "user-ai-1",
  email: "owner-a@agxora.dev",
  name: "Owner A",
  organizationId: "org-actor",
  workspaceId: "ws-actor",
  membershipId: "mem-actor",
  role: "OWNER",
  sessionToken: "test-session",
};

function context(organizationId: string | null, workspaceId: string | null = null): AIRuntimeContext {
  return {
    organization: { organizationId, workspaceId },
    conversation: [],
    userPrompt: "Hello, how are you?",
  };
}

describe("bindChatContextToActor", () => {
  it("uses the authenticated actor organization when the client omits org", () => {
    const bound = bindChatContextToActor(actor, context(null));
    expect(bound.organization.organizationId).toBe("org-actor");
    expect(bound.organization.workspaceId).toBe("ws-actor");
  });

  it("accepts a matching client organization id", () => {
    const bound = bindChatContextToActor(actor, context("org-actor", "ws-other"));
    expect(bound.organization.organizationId).toBe("org-actor");
    expect(bound.organization.workspaceId).toBe("ws-actor");
  });

  it("rejects a different client organization id", () => {
    expect(() => bindChatContextToActor(actor, context("org-other"))).toThrow(
      PersistenceError,
    );
    try {
      bindChatContextToActor(actor, context("org-other"));
    } catch (error) {
      expect(error).toBeInstanceOf(PersistenceError);
      expect((error as PersistenceError).code).toBe("forbidden");
      expect((error as PersistenceError).status).toBe(403);
    }
  });
});
