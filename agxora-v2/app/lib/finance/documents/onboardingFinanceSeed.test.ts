import { describe, expect, it, vi } from "vitest";
import {
  buildOnboardingFinancePatch,
  composeOnboardingStreet,
  hasOnboardingFinancePatch,
} from "./onboardingFinanceSeed";
import { persistOnboardingFinanceSettings } from "./onboardingFinanceClient";

describe("onboarding finance seed", () => {
  it("maps supported onboarding company data onto FinanceDocumentSettings fields", () => {
    const patch = buildOnboardingFinancePatch({
      companyName: "  Nordlicht Handel GmbH  ",
      street: "Speicherstadt",
      houseNumber: "12",
      postalCode: "20457",
      city: "Hamburg",
      country: "Deutschland",
      vatId: "DE813312217",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
    });

    expect(patch).toEqual({
      companyName: "Nordlicht Handel GmbH",
      street: "Speicherstadt 12",
      postalCode: "20457",
      city: "Hamburg",
      country: "Deutschland",
      vatId: "DE813312217",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
    });
  });

  it("composes house number into the existing street field", () => {
    expect(composeOnboardingStreet("Speicherstadt", "12")).toBe("Speicherstadt 12");
    expect(composeOnboardingStreet("Speicherstadt 12", "")).toBe("Speicherstadt 12");
    expect(composeOnboardingStreet("", "12")).toBe("12");
    expect(composeOnboardingStreet("  ", "  ")).toBe("");
  });

  it("omits empty optional VAT, IBAN, BIC, and address fields so they cannot overwrite existing settings", () => {
    const patch = buildOnboardingFinancePatch({
      companyName: "Acme GmbH",
      country: "Germany",
      street: "  ",
      houseNumber: "",
      postalCode: null,
      city: undefined,
      vatId: "   ",
      iban: "",
      bic: null,
    });

    expect(patch).toEqual({
      companyName: "Acme GmbH",
      country: "Germany",
    });
    expect(patch).not.toHaveProperty("vatId");
    expect(patch).not.toHaveProperty("iban");
    expect(patch).not.toHaveProperty("bic");
    expect(patch).not.toHaveProperty("street");
    expect(hasOnboardingFinancePatch(patch)).toBe(true);
  });

  it("does not invent a finance patch when every field is absent", () => {
    const patch = buildOnboardingFinancePatch({});
    expect(patch).toEqual({});
    expect(hasOnboardingFinancePatch(patch)).toBe(false);
  });

  it("ignores a client-supplied tenant id because it is not part of the finance patch", () => {
    const patch = buildOnboardingFinancePatch({
      companyName: "Acme GmbH",
      country: "DE",
      // @ts-expect-error — onboarding must never accept a client tenant id
      organizationId: "org-from-client",
      workspaceId: "ws-from-client",
    });
    expect(patch).toEqual({ companyName: "Acme GmbH", country: "DE" });
    expect(patch).not.toHaveProperty("organizationId");
    expect(patch).not.toHaveProperty("workspaceId");
  });
});

describe("persistOnboardingFinanceSettings", () => {
  it("skips the finance write in local/demo auth mode", async () => {
    const fetchMock = vi.fn();
    await persistOnboardingFinanceSettings(
      { companyName: "Acme GmbH", country: "DE" },
      { enabled: false, fetch: fetchMock as unknown as typeof fetch },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not PATCH when the onboarding payload has no supported values", async () => {
    const fetchMock = vi.fn();
    await persistOnboardingFinanceSettings(
      { vatId: "  ", iban: "" },
      { enabled: true, fetch: fetchMock as unknown as typeof fetch },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PATCHes only non-empty fields through the existing document-settings API", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await persistOnboardingFinanceSettings(
      {
        companyName: "Acme GmbH",
        country: "Deutschland",
        vatId: "",
        iban: "  ",
        street: "Hafen",
        houseNumber: "1",
      },
      { enabled: true, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/finance/document-settings");
    expect(init.method).toBe("PATCH");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(String(init.body))).toEqual({
      companyName: "Acme GmbH",
      country: "Deutschland",
      street: "Hafen 1",
    });
  });

  it("fails closed when the authenticated finance write is rejected", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, code: "unauthorized" }), { status: 401 }),
    );
    await expect(
      persistOnboardingFinanceSettings(
        { companyName: "Acme GmbH" },
        { enabled: true, fetch: fetchMock as unknown as typeof fetch },
      ),
    ).rejects.toThrow("onboarding.financeSaveFailed");
  });
});
