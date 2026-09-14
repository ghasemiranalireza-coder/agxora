import { describe, expect, it } from "vitest";
import { SAFE_PERMISSIONS } from "@/app/lib/business-agent/catalog";
import { permissionGranted } from "@/app/lib/business-agent/authorize";
import {
  detectAgentIntents,
  resolveAgentIntentResults,
} from "@/app/lib/business-agent/agent-intent";
import { isExecutableCampaignProvider } from "@/app/lib/business-agent/campaign-providers";
import { UnimplementedProviderAdapter } from "./adapter";
import { grantedCapabilitiesFromFlags, resolveCapabilityLayers } from "./capabilities";
import { getProviderDefinition } from "./registry";

describe("capability layers and agent compatibility", () => {
  it("does not treat declared capabilities as executable", () => {
    const linkedin = getProviderDefinition("linkedin");
    const layers = resolveCapabilityLayers({
      provider: linkedin,
      connected: false,
      flags: SAFE_PERMISSIONS,
      policyAllows: true,
    });
    expect(layers.declared).toContain("publish");
    expect(layers.implemented).toEqual([]);
    expect(layers.allowed).toEqual([]);
  });

  it("maps workspace permission flags onto granted capabilities", () => {
    expect(grantedCapabilitiesFromFlags(SAFE_PERMISSIONS)).toEqual([
      "read",
      "create",
    ]);
    expect(permissionGranted(SAFE_PERMISSIONS, "publish")).toBe(false);
    expect(permissionGranted(SAFE_PERMISSIONS, "send_email")).toBe(false);
  });

  it("keeps Core Agent Gmail/YouTube resolution on persistence ids", () => {
    expect(detectAgentIntents("Summarize my latest customer emails")).toEqual([
      { kind: "gmail", provider: "email_gmail" },
    ]);
    expect(isExecutableCampaignProvider("email_gmail")).toBe(true);
    expect(isExecutableCampaignProvider("youtube")).toBe(true);
    expect(isExecutableCampaignProvider("linkedin")).toBe(false);
    const results = resolveAgentIntentResults({
      goal: "Draft a response to this customer.",
      integrations: [
        {
          provider: "email_gmail",
          label: "Gmail / Google Workspace",
          implementationStatus: "oauth_ready",
          connected: true,
          ...SAFE_PERMISSIONS,
        },
      ],
    });
    expect(results[0]?.implemented).toBe(true);
    expect(results[0]?.connected).toBe(true);
    expect(results[0]?.code).not.toBe("unsupported");
  });

  it("does not execute through unimplemented adapters", async () => {
    const adapter = new UnimplementedProviderAdapter("shopify");
    const health = await adapter.health({
      organizationId: "org-a",
      workspaceId: "ws-a",
      userId: "user-a",
    });
    expect(health.ok).toBe(false);
    const executed = await adapter.execute("read", {}, {
      organizationId: "org-a",
      workspaceId: "ws-a",
      userId: "user-a",
    });
    expect(executed.ok).toBe(false);
    expect(executed.code).toBe("not_implemented");
    const connected = await adapter.connect({
      organizationId: "org-a",
      workspaceId: "ws-a",
      userId: "user-a",
    });
    expect(connected.connected).toBe(false);
    expect(connected.code).toBe("not_implemented");
  });
});

describe("tenant scoping contract", () => {
  it("documents org credentials vs workspace enablement", () => {
    const gmail = getProviderDefinition("gmail");
    expect(gmail.supportsMultipleAccounts).toBe(false);
    const resolvedOrgA = grantedCapabilitiesFromFlags(SAFE_PERMISSIONS);
    const resolvedOrgB = grantedCapabilitiesFromFlags({
      ...SAFE_PERMISSIONS,
      canSendEmail: true,
    });
    expect(resolvedOrgA).not.toEqual(resolvedOrgB);
  });
});

describe("SAFE mode is unchanged", () => {
  it("keeps read/draft on and side effects off", () => {
    expect(SAFE_PERMISSIONS).toEqual({
      canRead: true,
      canCreateDraft: true,
      canSchedule: false,
      canPublish: false,
      canSendEmail: false,
      canDelete: false,
    });
  });
});
