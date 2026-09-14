import { describe, expect, it } from "vitest";
import { getProviderDefinition } from "./registry";
import {
  resolveProviderState,
  filterResolvedProviders,
  filterAgentSurfaceProviders,
} from "./resolver";
import { SAFE_PERMISSIONS } from "./permission-flags";
import { isPlanEntitlementEnforced } from "./capabilities";
import { INTEGRATION_CATALOG } from "@/app/lib/business-agent/catalog";
import { projectAgentCatalog, projectConnectorCatalog } from "./projections";
import { PROVIDER_REGISTRY } from "./registry";
import { toCanonicalProviderId } from "./ids";

const gmail = getProviderDefinition("gmail");
const youtube = getProviderDefinition("youtube");
const linkedin = getProviderDefinition("linkedin");
const amazon = getProviderDefinition("amazon_seller");

describe("connection status resolver", () => {
  it("keeps Gmail available until a real credential exists", () => {
    const resolved = resolveProviderState({
      provider: gmail,
      connection: null,
      credentialAvailable: false,
      localStorageConnected: true,
    });
    expect(resolved.implementationStatus).toBe("available");
    expect(resolved.connected).toBe(false);
    expect(resolved.uiState).toBe("available");
    expect(resolved.primaryAction).toBe("connect");
    expect(resolved.connectionStatus).toBe("not_connected");
  });

  it("treats Gmail as connected only when org credentials exist", () => {
    const resolved = resolveProviderState({
      provider: gmail,
      connection: {
        status: "connected",
        lastError: null,
        permissions: { ...SAFE_PERMISSIONS, canSendEmail: false },
        accountLabel: "ops@agxora.dev",
        externalAccountId: "acc-1",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      credentialAvailable: true,
    });
    expect(resolved.connected).toBe(true);
    expect(resolved.uiState).toBe("requires_permission");
    expect(resolved.primaryAction).toBe("configure_permissions");
    expect(resolved.accountLabel).toBe("ops@agxora.dev");
  });

  it("keeps YouTube connected and configure when publish is granted", () => {
    const resolved = resolveProviderState({
      provider: youtube,
      connection: {
        status: "connected",
        lastError: null,
        permissions: { ...SAFE_PERMISSIONS, canPublish: true },
        accountLabel: "Studio",
        externalAccountId: "yt-1",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      credentialAvailable: true,
    });
    expect(resolved.uiState).toBe("connected");
    expect(resolved.primaryAction).toBe("configure");
    expect(resolved.implementedCapabilities).toContain("publish");
  });

  it("asks for reauth when a Gmail row is connected without credentials", () => {
    const resolved = resolveProviderState({
      provider: gmail,
      connection: {
        status: "connected",
        lastError: null,
        permissions: SAFE_PERMISSIONS,
        accountLabel: null,
        externalAccountId: null,
        connectedAt: null,
      },
      credentialAvailable: false,
    });
    expect(resolved.connected).toBe(false);
    expect(resolved.uiState).toBe("requires_reauth");
    expect(resolved.primaryAction).toBe("reconnect");
  });

  it("never invents connected from localStorage or unimplemented providers", () => {
    const linkedinResolved = resolveProviderState({
      provider: linkedin,
      connection: {
        status: "connected",
        lastError: null,
        permissions: SAFE_PERMISSIONS,
        accountLabel: "fake",
        externalAccountId: "x",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      credentialAvailable: true,
      localStorageConnected: true,
    });
    expect(linkedinResolved.connected).toBe(false);
    expect(linkedinResolved.uiState).toBe("coming_soon");
    expect(linkedinResolved.primaryAction).toBe("coming_soon");
    expect(linkedinResolved.connectionStatus).toBe("not_connected");

    const amazonResolved = resolveProviderState({
      provider: amazon,
      connection: null,
      credentialAvailable: false,
      localStorageConnected: true,
    });
    expect(amazonResolved.uiState).toBe("coming_soon");
    expect(amazonResolved.connected).toBe(false);
  });

  it("never treats unsupported implementation as connected", () => {
    const unsupported = {
      ...linkedin,
      implementationStatus: "unsupported" as const,
      supportsConnection: false,
    };
    const resolved = resolveProviderState({
      provider: unsupported,
      connection: {
        status: "connected",
        lastError: null,
        permissions: SAFE_PERMISSIONS,
        accountLabel: "fake",
        externalAccountId: "x",
        connectedAt: "2026-01-01T00:00:00.000Z",
      },
      credentialAvailable: true,
      localStorageConnected: true,
    });
    expect(resolved.uiState).toBe("unsupported");
    expect(resolved.connected).toBe(false);
    expect(resolved.primaryAction).toBe("not_available");
    expect(resolved.connectionStatus).toBe("not_connected");
  });

  it("does not block production actions with plan metadata", () => {
    expect(isPlanEntitlementEnforced()).toBe(false);
    const resolved = resolveProviderState({
      provider: getProviderDefinition("hubspot"),
      connection: null,
      credentialAvailable: false,
      currentPlan: "free",
    });
    expect(resolved.uiState).not.toBe("upgrade_required");
    expect(resolved.uiState).toBe("coming_soon");
  });

  it("filters Integration Center views without duplicating catalogs", () => {
    const all = PROVIDER_REGISTRY.map((provider) =>
      resolveProviderState({
        provider,
        connection: null,
        credentialAvailable: provider.providerId === "gmail",
      }),
    );
    expect(filterResolvedProviders(all, "communication").map((i) => i.providerId)).toEqual([
      "gmail",
      "microsoft365",
    ]);
    expect(filterResolvedProviders(all, "connected").map((i) => i.providerId)).toEqual([
      "gmail",
    ]);
    expect(
      filterResolvedProviders(all, "available").some((i) => i.providerId === "youtube"),
    ).toBe(true);
    expect(
      filterResolvedProviders(all, "marketplace").every(
        (i) => i.implementationStatus !== "available",
      ),
    ).toBe(true);
    expect(
      filterAgentSurfaceProviders(all).every(
        (item) =>
          item.category === "communication" || item.category === "social",
      ),
    ).toBe(true);
    expect(filterAgentSurfaceProviders(all).map((i) => i.providerId)).toEqual([
      "gmail",
      "microsoft365",
      "youtube",
      "linkedin",
      "instagram",
      "facebook",
      "tiktok",
      "x",
    ]);
  });
});

describe("catalog projections share one identity vocabulary", () => {
  it("projects the agent catalog from the canonical registry", () => {
    const projected = projectAgentCatalog();
    expect(projected.map((row) => row.provider)).toEqual(
      INTEGRATION_CATALOG.map((row) => row.provider),
    );
    expect(projected.find((row) => row.provider === "email_gmail")?.canonicalProviderId).toBe(
      "gmail",
    );
    expect(projected.find((row) => row.provider === "email_gmail")?.implementationStatus).toBe(
      "oauth_ready",
    );
    expect(projected.find((row) => row.provider === "linkedin")?.implementationStatus).toBe(
      "not_implemented",
    );
  });

  it("does not keep a second provider identity list in the connector catalog", () => {
    for (const connector of projectConnectorCatalog()) {
      const canonical = toCanonicalProviderId(connector.id);
      expect(canonical).toBeTruthy();
      expect(PROVIDER_REGISTRY.some((entry) => entry.providerId === canonical)).toBe(true);
    }
  });

  it("projects Connected Accounts from the same registry as Integration Center", () => {
    const agentIds = projectAgentCatalog().map((row) => row.canonicalProviderId);
    const centerIds = PROVIDER_REGISTRY.filter(
      (entry) =>
        entry.category === "communication" || entry.category === "social",
    ).map((entry) => entry.providerId);
    expect([...agentIds].sort()).toEqual([...centerIds].sort());
  });
});
