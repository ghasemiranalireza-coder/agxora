/**
 * Phase 49 — local CRM directory document metadata regression (LocalStorage repository).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { crmDirectoryRepository } from "@/app/lib/crm/directory/repository";
import { validateDocumentDraft } from "@/app/lib/crm/directory/validation";

describe("Phase 49 local-mode document metadata regression", () => {
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

  it("validates document drafts used by both modes", () => {
    const ok = validateDocumentDraft({
      name: "Local Doc.pdf",
      mimeType: "application/pdf",
      size: 2048,
      uploadedBy: "Local User",
    });
    expect(ok.ok).toBe(true);

    const bad = validateDocumentDraft({
      name: "",
      mimeType: "",
      size: -1,
      uploadedBy: "",
    });
    expect(bad.ok).toBe(false);
  });

  it("creates, lists, and deletes document metadata in local repository", async () => {
    const created = await crmDirectoryRepository.createDocument({
      customerId: "cust_local_1",
      organizationId: "org_local_1",
      name: "Local Doc.pdf",
      mimeType: "application/pdf",
      size: 4096,
      uploadedBy: "Local Author",
    });
    expect(created.id.startsWith("cdoc_")).toBe(true);

    const listed = await crmDirectoryRepository.listDocuments("cust_local_1");
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    await crmDirectoryRepository.deleteDocument(created.id);
    const after = await crmDirectoryRepository.listDocuments("cust_local_1");
    expect(after.some((row) => row.id === created.id)).toBe(false);
  });
});
