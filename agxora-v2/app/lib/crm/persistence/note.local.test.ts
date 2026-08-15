/**
 * Phase 48 — local CRM directory note regression (LocalStorage repository).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmDirectoryRepository } from "@/app/lib/crm/directory/repository";
import { validateNoteDraft } from "@/app/lib/crm/directory/validation";

describe("Phase 48 local-mode note regression", () => {
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

  it("validates note drafts used by both modes", () => {
    const ok = validateNoteDraft({
      title: "Local Note",
      body: "Body text",
      author: "Local User",
    });
    expect(ok.ok).toBe(true);

    const bad = validateNoteDraft({
      title: "",
      body: "",
      author: "",
    });
    expect(bad.ok).toBe(false);
  });

  it("creates, lists, updates, and deletes notes in local repository", async () => {
    const created = await crmDirectoryRepository.createNote({
      customerId: "cust_local_1",
      organizationId: "org_local_1",
      title: "Local Note",
      body: "Stored in LocalStorage",
      author: "Local Author",
    });
    expect(created.id.startsWith("cnote_")).toBe(true);

    const listed = await crmDirectoryRepository.listNotes("cust_local_1");
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    const updated = await crmDirectoryRepository.updateNote(created.id, {
      title: "Local Updated",
    });
    expect(updated.title).toBe("Local Updated");

    await crmDirectoryRepository.deleteNote(created.id);
    const after = await crmDirectoryRepository.listNotes("cust_local_1");
    expect(after.some((row) => row.id === created.id)).toBe(false);
  });
});
