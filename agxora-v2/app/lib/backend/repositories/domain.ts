/**
 * Domain repository façades — CRM / Projects / Documents / Finance / AI / Identity.
 * Each façade talks to the active DataProvider; LocalStorage stays behind adapters.
 */

import { getActiveDataProvider } from "../providers/data";
import { CacheTags, cacheInvalidateByTag, queryFetch } from "../utils/cache";
import { logPlatformEvent } from "../observability/logger";
import type { ApiResponse, Paginated } from "../types";
import type { Customer, Document, Invoice, Project, User } from "../types/models";

async function providerRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  logPlatformEvent(method === "GET" ? "repo.read" : "repo.write", { path, method });
  return getActiveDataProvider().request<T>({ method, path, body });
}

export const crmDataRepository = {
  async listCustomers(organizationId?: string): Promise<Paginated<Customer>> {
    return queryFetch(
      ["crm", "customers", organizationId ?? "all"],
      async () => {
        const result = await providerRequest<Paginated<Customer>>(
          "GET",
          organizationId
            ? `/crm/customers?organizationId=${encodeURIComponent(organizationId)}`
            : "/crm/customers",
        );
        if (!result.ok) {
          return { items: [], total: 0, page: 1, pageSize: 25 };
        }
        return result.data;
      },
      { tags: [CacheTags.crm], ttlMs: 30_000, staleWhileRevalidate: true },
    );
  },

  async getCustomer(id: string): Promise<Customer | null> {
    const result = await providerRequest<Customer>("GET", `/crm/customers/${id}`);
    return result.ok ? result.data : null;
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.crm);
  },
};

export const projectsDataRepository = {
  async listProjects(organizationId?: string): Promise<Paginated<Project>> {
    return queryFetch(
      ["projects", organizationId ?? "all"],
      async () => {
        const result = await providerRequest<Paginated<Project>>(
          "GET",
          organizationId
            ? `/projects?organizationId=${encodeURIComponent(organizationId)}`
            : "/projects",
        );
        if (!result.ok) {
          return { items: [], total: 0, page: 1, pageSize: 25 };
        }
        return result.data;
      },
      { tags: [CacheTags.projects], ttlMs: 30_000, staleWhileRevalidate: true },
    );
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.projects);
  },
};

export const financeDataRepository = {
  async listInvoices(organizationId?: string): Promise<Paginated<Invoice>> {
    return queryFetch(
      ["finance", "invoices", organizationId ?? "all"],
      async () => {
        const result = await providerRequest<Paginated<Invoice>>(
          "GET",
          organizationId
            ? `/finance/invoices?organizationId=${encodeURIComponent(organizationId)}`
            : "/finance/invoices",
        );
        if (!result.ok) {
          return { items: [], total: 0, page: 1, pageSize: 25 };
        }
        return result.data;
      },
      { tags: [CacheTags.finance], ttlMs: 30_000 },
    );
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.finance);
  },
};

export const documentsDataRepository = {
  async listDocuments(organizationId?: string): Promise<Paginated<Document>> {
    return queryFetch(
      ["documents", organizationId ?? "all"],
      async () => {
        const result = await providerRequest<Paginated<Document>>(
          "GET",
          organizationId
            ? `/documents?organizationId=${encodeURIComponent(organizationId)}`
            : "/documents",
        );
        if (!result.ok) {
          return { items: [], total: 0, page: 1, pageSize: 25 };
        }
        return result.data;
      },
      { tags: [CacheTags.documents], ttlMs: 30_000 },
    );
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.documents);
  },
};

export const aiDataRepository = {
  async listConversations(): Promise<Paginated<{ id: string; title: string }>> {
    return queryFetch(
      ["ai", "conversations"],
      async () => {
        const result = await providerRequest<
          Paginated<{ id: string; title: string }>
        >("GET", "/ai/conversations");
        if (!result.ok) {
          return { items: [], total: 0, page: 1, pageSize: 25 };
        }
        return result.data;
      },
      { tags: [CacheTags.ai], ttlMs: 15_000 },
    );
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.ai);
  },
};

export const identityDataRepository = {
  async getMe(): Promise<User | null> {
    return queryFetch(
      ["identity", "me"],
      async () => {
        const result = await providerRequest<User>("GET", "/identity/me");
        return result.ok ? result.data : null;
      },
      { tags: [CacheTags.identity], ttlMs: 60_000 },
    );
  },

  invalidate(): void {
    cacheInvalidateByTag(CacheTags.identity);
  },
};

export interface DomainRepositoryRegistry {
  readonly crm: typeof crmDataRepository;
  readonly projects: typeof projectsDataRepository;
  readonly finance: typeof financeDataRepository;
  readonly documents: typeof documentsDataRepository;
  readonly ai: typeof aiDataRepository;
  readonly identity: typeof identityDataRepository;
}

export const domainRepositories: DomainRepositoryRegistry = {
  crm: crmDataRepository,
  projects: projectsDataRepository,
  finance: financeDataRepository,
  documents: documentsDataRepository,
  ai: aiDataRepository,
  identity: identityDataRepository,
};
