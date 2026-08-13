import { describe, expect, it } from "vitest";
import { profileInitials, resolveProfileIdentity } from "./profileIdentity";

describe("Settings Profile server identity", () => {
  it("never labels an authenticated owner as guest", () => {
    const view = resolveProfileIdentity({
      hydrated: true,
      authenticated: true,
      displayName: "Owner Alpha",
      email: "owner-a@agxora.dev",
      workspaceRole: "OWNER",
    });
    expect(view.status).toBe("ready");
    expect(view.displayName).toBe("Owner Alpha");
    expect(view.email).toBe("owner-a@agxora.dev");
    expect(view.role).toBe("OWNER");
    expect(view.initials).toBe("OA");
    expect(JSON.stringify(view).toLowerCase()).not.toContain("guest");
  });

  it("shows MEMBER identity from the server actor, not a local guest fallback", () => {
    const view = resolveProfileIdentity({
      hydrated: true,
      authenticated: true,
      displayName: "Member Alpha",
      email: "member-a@agxora.dev",
      workspaceRole: "MEMBER",
    });
    expect(view.role).toBe("MEMBER");
    expect(view.displayName).toBe("Member Alpha");
    expect(JSON.stringify(view).toLowerCase()).not.toContain("guest");
  });

  it("clears identity when signed out instead of keeping a guest profile", () => {
    const view = resolveProfileIdentity({
      hydrated: true,
      authenticated: false,
      displayName: "Owner Alpha",
      email: "owner-a@agxora.dev",
      workspaceRole: "OWNER",
    });
    expect(view.status).toBe("signed_out");
    expect(view.displayName).toBe("");
    expect(view.email).toBe("");
    expect(view.role).toBeNull();
    expect(view.initials).toBe("");
  });

  it("stays empty while auth is hydrating so SSR does not flash Guest", () => {
    const view = resolveProfileIdentity({
      hydrated: false,
      authenticated: false,
      displayName: null,
      email: null,
      workspaceRole: null,
    });
    expect(view.status).toBe("loading");
    expect(view.displayName).toBe("");
    expect(view.role).toBeNull();
    expect(JSON.stringify(view).toLowerCase()).not.toContain("guest");
  });

  it("builds initials from the server display name", () => {
    expect(profileInitials("Owner Alpha")).toBe("OA");
    expect(profileInitials("  ")).toBe("");
  });
});
