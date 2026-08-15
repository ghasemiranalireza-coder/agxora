/**
 * Phase 47 — local CRM directory contact regression (LocalStorage repository).
 * Ensures local mode contact CRUD still works without the database path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmDirectoryRepository } from "@/app/lib/crm/directory/repository";
import { validateContactDraft } from "@/app/lib/crm/directory/validation";

describe("Phase 47 local-mode contact regression", () => {
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

  it("validates contact drafts used by both modes", () => {
    const ok = validateContactDraft({
      name: "Local Person",
      role: "Buyer",
      email: "local@example.com",
      phone: "+1 555 0100",
      mobile: "",
      notes: "",
    });
    expect(ok.ok).toBe(true);

    const bad = validateContactDraft({
      name: "",
      role: "",
      email: "bad",
      phone: "x",
      mobile: "",
      notes: "",
    });
    expect(bad.ok).toBe(false);
  });

  it("creates, lists, updates, and deletes contacts in local repository", async () => {
    const created = await crmDirectoryRepository.createContact({
      customerId: "cust_local_1",
      organizationId: "org_local_1",
      name: "Local Contact",
      role: "Manager",
      email: "lc@example.com",
      phone: "+1 555 0101",
      mobile: "",
      notes: "ls notes",
    });
    expect(created.id.startsWith("ccon_")).toBe(true);

    const listed = await crmDirectoryRepository.listContacts("cust_local_1");
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const updated = await crmDirectoryRepository.updateContact(created.id, {
      name: "Local Updated",
    });
    expect(updated.name).toBe("Local Updated");

    await crmDirectoryRepository.deleteContact(created.id);
    const after = await crmDirectoryRepository.listContacts("cust_local_1");
    expect(after.some((row) => row.id === created.id)).toBe(false);
  });
});
