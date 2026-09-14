import { describe, expect, it } from "vitest";
import {
  CANONICAL_PROVIDER_IDS,
  PROVIDER_REGISTRY,
  PROVIDER_CATEGORIES,
  PROVIDER_IMPLEMENTATION_STATUSES,
  PROVIDER_CAPABILITIES,
  getProviderDefinition,
  isCanonicalProviderId,
  knownProviderAlias,
  toCanonicalProviderId,
  toPersistenceProviderId,
  socialCredentialPlatformFor,
  routeProviderId,
} from "./index";

describe("canonical provider registry", () => {
  it("contains every canonical id exactly once", () => {
    const ids = PROVIDER_REGISTRY.map((entry) => entry.providerId);
    expect(ids).toEqual([...CANONICAL_PROVIDER_IDS]);
    expect(new Set(ids).size).toBe(CANONICAL_PROVIDER_IDS.length);
  });

  it("uses only valid categories, statuses, and capabilities", () => {
    for (const entry of PROVIDER_REGISTRY) {
      expect(PROVIDER_CATEGORIES).toContain(entry.category);
      expect(PROVIDER_IMPLEMENTATION_STATUSES).toContain(
        entry.implementationStatus,
      );
      expect(["oauth2", "api_key", "webhook", "none"]).toContain(entry.authMethod);
      for (const capability of entry.capabilities) {
        expect(PROVIDER_CAPABILITIES).toContain(capability);
      }
      for (const capability of entry.implementedCapabilities) {
        expect(entry.capabilities).toContain(capability);
      }
      expect(["connected", "healthy", "ready", "installed"]).not.toContain(
        entry.implementationStatus,
      );
    }
  });

  it("marks only Gmail and YouTube as available production integrations", () => {
    const available = PROVIDER_REGISTRY.filter(
      (entry) => entry.implementationStatus === "available",
    ).map((entry) => entry.providerId);
    expect(available).toEqual(["gmail", "youtube"]);
    expect(getProviderDefinition("linkedin").implementationStatus).toBe(
      "coming_soon",
    );
    expect(getProviderDefinition("amazon_seller").implementationStatus).toBe(
      "coming_soon",
    );
    expect(getProviderDefinition("shopify").supportsConnection).toBe(false);
    expect(getProviderDefinition("gmail").supportsConnection).toBe(true);
    expect(getProviderDefinition("youtube").supportsConnection).toBe(true);
  });

  it("keeps implemented capabilities as a truthful subset", () => {
    expect(getProviderDefinition("gmail").implementedCapabilities).toEqual([
      "connect",
      "read",
      "create",
      "send",
    ]);
    expect(getProviderDefinition("youtube").implementedCapabilities).toEqual([
      "connect",
      "read",
      "create",
      "publish",
    ]);
    expect(getProviderDefinition("youtube").implementedCapabilities).not.toContain(
      "schedule",
    );
    expect(getProviderDefinition("linkedin").implementedCapabilities).toEqual([]);
  });
});

describe("provider identity mapping", () => {
  it("maps legacy Gmail/Microsoft ids without renaming persistence", () => {
    expect(toCanonicalProviderId("email_gmail")).toBe("gmail");
    expect(toCanonicalProviderId("gmail")).toBe("gmail");
    expect(toPersistenceProviderId("gmail")).toBe("email_gmail");
    expect(toPersistenceProviderId("email_gmail")).toBe("email_gmail");
    expect(routeProviderId("gmail")).toBe("email_gmail");
    expect(toCanonicalProviderId("email_microsoft")).toBe("microsoft365");
    expect(toPersistenceProviderId("microsoft365")).toBe("email_microsoft");
    expect(socialCredentialPlatformFor("gmail")).toBe("gmail");
    expect(socialCredentialPlatformFor("email_gmail")).toBe("gmail");
    expect(socialCredentialPlatformFor("youtube")).toBe("youtube");
    expect(socialCredentialPlatformFor("linkedin")).toBeNull();
  });

  it("keeps alias mappings unique onto one canonical id", () => {
    const aliases = [
      "gmail",
      "email_gmail",
      "google_gmail",
      "microsoft365",
      "email_microsoft",
      "m365",
      "outlook",
      "microsoft",
      "amazon",
      "amazon_seller",
      "facebook-pages",
      "facebook_pages",
      "twitter",
      "google-workspace",
      "google-drive",
    ];
    const mapped = aliases.map((alias) => toCanonicalProviderId(alias));
    expect(mapped.every((id) => id != null)).toBe(true);
    expect(toCanonicalProviderId("gmail")).toBe(toCanonicalProviderId("email_gmail"));
    expect(toCanonicalProviderId("amazon")).toBe(toCanonicalProviderId("amazon_seller"));
  });

  it("maps module catalog aliases onto the same canonical ids", () => {
    expect(toCanonicalProviderId("google-workspace")).toBe("google_workspace");
    expect(toCanonicalProviderId("google-drive")).toBe("google_drive");
    expect(toCanonicalProviderId("m365")).toBe("microsoft365");
    expect(toCanonicalProviderId("amazon")).toBe("amazon_seller");
    expect(toCanonicalProviderId("facebook-pages")).toBe("facebook");
    expect(knownProviderAlias("email_gmail")).toBe(true);
    expect(isCanonicalProviderId("email_gmail")).toBe(false);
    expect(isCanonicalProviderId("gmail")).toBe(true);
    expect(toCanonicalProviderId("not-a-provider")).toBeNull();
  });
});
