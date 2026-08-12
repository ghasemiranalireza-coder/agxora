/**
 * Bridge existing LocalStorage feature stores into LocalDataProvider handlers.
 * Preserves current module behavior while UI migrates to repositories.
 */

import { localDataProvider } from "./LocalDataProvider";
import { mockOk } from "../../mock/mockServer";
import type { ApiRequestOptions, ApiResponse, Paginated } from "../../types";

async function emptyPage(): Promise<ApiResponse<Paginated<unknown>>> {
  return mockOk({ items: [], total: 0, page: 1, pageSize: 25 });
}

/**
 * Register default local handlers. Feature modules can override with richer adapters.
 */
export function registerLocalDataHandlers(): void {
  localDataProvider.register("/health", () =>
    mockOk({
      status: "ok",
      provider: "local",
      at: new Date().toISOString(),
    }),
  );

  localDataProvider.register("/crm/customers", async (options) => {
    try {
      const { crmDirectoryRepository } = await import(
        "@/app/lib/crm/directory/repository"
      );
      const orgId = readQuery(options, "organizationId") ?? undefined;
      const customers = await crmDirectoryRepository.listCustomers(orgId);
      return mockOk({
        items: customers,
        total: customers.length,
        page: 1,
        pageSize: Math.max(customers.length, 25),
      });
    } catch {
      return emptyPage();
    }
  });

  localDataProvider.register("/projects", async (options) => {
    try {
      const { projectRepository } = await import(
        "@/app/lib/projects/repository"
      );
      const orgId = readQuery(options, "organizationId") ?? undefined;
      const projects = await projectRepository.listProjects(orgId);
      return mockOk({
        items: projects,
        total: projects.length,
        page: 1,
        pageSize: Math.max(projects.length, 25),
      });
    } catch {
      return emptyPage();
    }
  });

  localDataProvider.register("/finance/invoices", async () => {
    try {
      const { FINANCE_INVOICES } = await import("@/app/lib/finance/mock-data");
      return mockOk({
        items: FINANCE_INVOICES,
        total: FINANCE_INVOICES.length,
        page: 1,
        pageSize: Math.max(FINANCE_INVOICES.length, 25),
      });
    } catch {
      return emptyPage();
    }
  });

  localDataProvider.register("/documents", async () => {
    try {
      const { KNOWLEDGE_DOCUMENTS } = await import(
        "@/app/lib/documents/mock-data"
      );
      return mockOk({
        items: KNOWLEDGE_DOCUMENTS,
        total: KNOWLEDGE_DOCUMENTS.length,
        page: 1,
        pageSize: Math.max(KNOWLEDGE_DOCUMENTS.length, 25),
      });
    } catch {
      return emptyPage();
    }
  });

  localDataProvider.register("/ai/conversations", async () => {
    try {
      const { aiConversationStore } = await import(
        "@/features/ai/store/conversationStore"
      );
      if (typeof window !== "undefined") {
        aiConversationStore.hydrate();
      }
      const items = aiConversationStore.listSummaries({
        includeArchived: false,
      });
      return mockOk({
        items,
        total: items.length,
        page: 1,
        pageSize: Math.max(items.length, 25),
      });
    } catch {
      return emptyPage();
    }
  });

  localDataProvider.register("/identity/me", async () => {
    try {
      const { getActiveAuthAdapter } = await import(
        "@/app/lib/auth/createDefaultAuthAdapter"
      );
      const user = await getActiveAuthAdapter().getUser();
      if (!user) {
        return {
          ok: false,
          status: 401,
          code: "unauthorized",
          message: "Not authenticated",
        };
      }
      return mockOk(user);
    } catch {
      return {
        ok: false,
        status: 401,
        code: "unauthorized",
        message: "Not authenticated",
      };
    }
  });
}

function readQuery(options: ApiRequestOptions, key: string): string | null {
  const idx = options.path.indexOf("?");
  if (idx < 0) return null;
  const params = new URLSearchParams(options.path.slice(idx + 1));
  return params.get(key);
}
