/**
 * Phase 50 — local CRM directory activity regression (LocalStorage repository).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmDirectoryRepository } from "@/app/lib/crm/directory/repository";

describe("Phase 50 local-mode activity regression", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    });
    vi.stubGlobal("window", { localStorage: globalThis.localStorage });
  });

  it("creates activity rows via contact create and lists them per customer", async () => {
    await crmDirectoryRepository.createCustomer({
      organizationId: "org_local_1",
      companyName: "Local Co",
      contactName: "Local Contact",
      email: "local@example.com",
      phone: "+49 40 111111",
      website: "",
      industry: "Tech",
      country: "DE",
      city: "Berlin",
      address: "",
      taxNumber: "",
      status: "lead",
      owner: "Owner",
      tags: [],
    });
    const db = crmDirectoryRepository.getDatabase();
    const customer = db.customers[0]!;
    await crmDirectoryRepository.createContact({
      customerId: customer.id,
      organizationId: customer.organizationId,
      name: "Alice",
      role: "",
      email: "",
      phone: "",
      mobile: "",
      notes: "",
    });
    const listed = await crmDirectoryRepository.listActivities(customer.id);
    expect(listed.some((row) => row.kind === "customer_created")).toBe(true);
    expect(listed.some((row) => row.kind === "contact_added")).toBe(true);
    expect(listed.find((row) => row.kind === "contact_added")?.detail).toBe("Alice");
  });

  it("preserves the global 500-activity cap behavior in local repository", async () => {
    const customer = await crmDirectoryRepository.createCustomer({
      organizationId: "org_cap",
      companyName: "Cap Co",
      contactName: "Cap",
      email: "cap@example.com",
      phone: "+49 40 222222",
      website: "",
      industry: "Tech",
      country: "DE",
      city: "Berlin",
      address: "",
      taxNumber: "",
      status: "lead",
      owner: "Owner",
      tags: [],
    });
    for (let i = 0; i < 502; i++) {
      await crmDirectoryRepository.createNote({
        customerId: customer.id,
        organizationId: customer.organizationId,
        title: `Note ${i}`,
        body: "Body",
        author: "Author",
      });
    }
    const db = crmDirectoryRepository.getDatabase();
    expect(db.activities.length).toBeLessThanOrEqual(500);
  });
});
