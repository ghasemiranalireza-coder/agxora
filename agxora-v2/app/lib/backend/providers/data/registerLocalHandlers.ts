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

  localDataProvider.register("/agents", async (options) => {
    try {
      const { agentOsService } = await import("@/features/agents/services");
      const path = stripQuery(options.path);
      const body =
        options.body && typeof options.body === "object"
          ? (options.body as Record<string, unknown>)
          : {};
      const organizationId =
        readQuery(options, "organizationId") ??
        (typeof body.organizationId === "string" ? body.organizationId : null);

      if (!organizationId) {
        return {
          ok: false,
          status: 400,
          code: "missing_organization_id",
          message: "organizationId is required",
        };
      }

      agentOsService.ensureWorkspace(organizationId);

      if (options.method === "GET" && path === "/agents/executions") {
        return mockOk(agentOsService.listExecutions(organizationId));
      }
      if (options.method === "GET" && path === "/agents/approvals") {
        return mockOk(agentOsService.listApprovals(organizationId));
      }
      if (options.method === "GET" && path === "/agents/audit") {
        return mockOk(agentOsService.listStepExecutions(organizationId));
      }
      const { operationsService } = await import("@/features/agents/execution/service");
      if (options.method === "GET" && path === "/agents/operations") {
        return mockOk(operationsService.overview(organizationId));
      }
      if (options.method === "GET" && path === "/agents/operations/events") {
        return mockOk(operationsService.events(organizationId));
      }
      if (options.method === "POST" && path === "/agents/operations/enqueue") {
        if (typeof body.toolId !== "string") {
          return {
            ok: false,
            status: 400,
            code: "invalid_operations_enqueue",
            message: "toolId is required",
          };
        }
        return mockOk(
          operationsService.enqueue({
            organizationId,
            toolId: body.toolId as import("@/features/agents/types").ToolId,
            title: typeof body.title === "string" ? body.title : undefined,
            campaignId: typeof body.campaignId === "string" ? body.campaignId : undefined,
            campaignTaskId:
              typeof body.campaignTaskId === "string" ? body.campaignTaskId : undefined,
            priority:
              body.priority === "LOW" ||
              body.priority === "NORMAL" ||
              body.priority === "HIGH" ||
              body.priority === "URGENT"
                ? body.priority
                : undefined,
            params:
              body.params && typeof body.params === "object"
                ? (body.params as Record<string, unknown>)
                : undefined,
          }),
          201,
        );
      }
      const operationsStart = path.match(/^\/agents\/operations\/([^/]+)\/start$/);
      if (options.method === "POST" && operationsStart) {
        return mockOk(await operationsService.start(organizationId, operationsStart[1]));
      }
      const operationsCancel = path.match(/^\/agents\/operations\/([^/]+)\/cancel$/);
      if (options.method === "POST" && operationsCancel) {
        return mockOk(operationsService.cancel(organizationId, operationsCancel[1]));
      }
      const operationsRetry = path.match(/^\/agents\/operations\/([^/]+)\/retry$/);
      if (options.method === "POST" && operationsRetry) {
        return mockOk(await operationsService.retry(organizationId, operationsRetry[1]));
      }
      const operationsPause = path.match(/^\/agents\/operations\/([^/]+)\/pause$/);
      if (options.method === "POST" && operationsPause) {
        return mockOk(operationsService.pause(organizationId, operationsPause[1]));
      }
      const operationsMatch = path.match(/^\/agents\/operations\/([^/]+)$/);
      if (options.method === "GET" && operationsMatch) {
        const job = operationsService.get(organizationId, operationsMatch[1]);
        if (!job) {
          return {
            ok: false,
            status: 404,
            code: "operations_job_missing",
            message: "Execution job not found",
          };
        }
        return mockOk({
          job,
          events: operationsService
            .events(organizationId)
            .filter((event) => event.executionJobId === job.id),
        });
      }
      if (options.method === "POST" && path === "/agents/tasks") {
        if (
          typeof body.agentInstanceId !== "string" ||
          typeof body.title !== "string"
        ) {
          return {
            ok: false,
            status: 400,
            code: "invalid_agent_task",
            message: "agentInstanceId and title are required",
          };
        }
        const task = await agentOsService.enqueueTask({
          organizationId,
          agentInstanceId: body.agentInstanceId,
          title: body.title,
          goal:
            typeof body.goal === "string" ? body.goal : body.title,
          payload:
            body.payload && typeof body.payload === "object"
              ? (body.payload as Record<string, unknown>)
              : undefined,
        });
        return mockOk(task, 201);
      }
      if (options.method === "POST" && path === "/agents/approvals/resolve") {
        if (
          typeof body.approvalId !== "string" ||
          (body.state !== "APPROVED" && body.state !== "REJECTED")
        ) {
          return {
            ok: false,
            status: 400,
            code: "invalid_approval_resolution",
            message: "approvalId and valid state are required",
          };
        }
        const { growthService } = await import("@/features/agents/growth/service");
        const approval = await growthService.resolveApproval({
          approvalId: body.approvalId,
          state: body.state,
          decidedBy:
            typeof body.decidedBy === "string" ? body.decidedBy : undefined,
          comment:
            typeof body.comment === "string" ? body.comment : undefined,
        });
        return mockOk(approval);
      }

      const { growthService } = await import("@/features/agents/growth/service");
      growthService.ensure(organizationId);

      if (options.method === "GET" && path === "/agents/growth/business-profile") {
        return mockOk(growthService.getProfile(organizationId) ?? null);
      }
      if (options.method === "POST" && path === "/agents/growth/business-profile") {
        const draft =
          body.draft && typeof body.draft === "object"
            ? (body.draft as Record<string, unknown>)
            : body;
        const profile = growthService.saveProfile({
          organizationId,
          seedFromBusinessOs: body.seedFromBusinessOs !== false,
          draft: {
            companyName:
              typeof draft.companyName === "string" ? draft.companyName : undefined,
            businessType:
              typeof draft.businessType === "string" ? draft.businessType : undefined,
            industry: typeof draft.industry === "string" ? draft.industry : undefined,
            description:
              typeof draft.description === "string" ? draft.description : undefined,
            services: Array.isArray(draft.services)
              ? draft.services.filter((item): item is string => typeof item === "string")
              : undefined,
            products: Array.isArray(draft.products)
              ? draft.products.filter((item): item is string => typeof item === "string")
              : undefined,
            targetAudience:
              typeof draft.targetAudience === "string"
                ? draft.targetAudience
                : undefined,
            uniqueSellingProposition:
              typeof draft.uniqueSellingProposition === "string"
                ? draft.uniqueSellingProposition
                : undefined,
            websiteGoal:
              typeof draft.websiteGoal === "string" ? draft.websiteGoal : undefined,
          },
        });
        return mockOk(profile, 201);
      }
      if (options.method === "POST" && path === "/agents/growth/website/generate") {
        return mockOk(await growthService.generateWebsite(organizationId), 201);
      }
      if (options.method === "GET" && path === "/agents/growth/website/projects") {
        return mockOk(growthService.listWebsiteProjects(organizationId));
      }
      const projectMatch = path.match(/^\/agents\/growth\/website\/projects\/([^/]+)$/);
      if (options.method === "GET" && projectMatch) {
        const project = growthService.getWebsiteProject(organizationId, projectMatch[1]);
        if (!project) {
          return {
            ok: false,
            status: 404,
            code: "website_project_missing",
            message: "Website project not found",
          };
        }
        return mockOk(project);
      }
      if (options.method === "POST" && path === "/agents/growth/social/strategy") {
        return mockOk(await growthService.generateSocialStrategy(organizationId), 201);
      }
      if (options.method === "POST" && path === "/agents/growth/social/calendar") {
        return mockOk(await growthService.generateCalendar(organizationId), 201);
      }
      if (options.method === "GET" && path === "/agents/growth/social/calendar") {
        return mockOk(growthService.listCalendars(organizationId));
      }
      if (options.method === "POST" && path === "/agents/growth/content/generate") {
        return mockOk(await growthService.generateContent(organizationId), 201);
      }
      if (options.method === "GET" && path === "/agents/growth/campaigns") {
        return mockOk(growthService.listCampaigns(organizationId));
      }
      if (options.method === "POST" && path === "/agents/growth/campaigns") {
        return mockOk(await growthService.planCampaign(organizationId, {
          objective: typeof body.objective === "string" ? body.objective : undefined,
          audience: typeof body.audience === "string" ? body.audience : undefined,
          offer: typeof body.offer === "string" ? body.offer : undefined,
          channels: Array.isArray(body.channels)
            ? body.channels.filter((item): item is string => typeof item === "string")
            : undefined,
        }), 201);
      }
      if (options.method === "POST" && path === "/agents/growth/campaigns/plan") {
        return mockOk(await growthService.planCampaign(organizationId, {
          objective: typeof body.objective === "string" ? body.objective : undefined,
          audience: typeof body.audience === "string" ? body.audience : undefined,
          offer: typeof body.offer === "string" ? body.offer : undefined,
          channels: Array.isArray(body.channels)
            ? body.channels.filter((item): item is string => typeof item === "string")
            : undefined,
        }), 201);
      }
      if (options.method === "POST" && path === "/agents/growth/campaigns/readiness") {
        return mockOk(await growthService.evaluateReadiness(organizationId));
      }
      if (options.method === "POST" && path === "/agents/growth/insights") {
        return mockOk(await growthService.generateInsights(organizationId), 201);
      }
      if (options.method === "GET" && path === "/agents/growth/crm/link") {
        return mockOk({
          link: growthService.getCrmLink(organizationId) ?? null,
          sync: growthService.getCrmSync(organizationId) ?? null,
          lead: await growthService.getCrmLinkedLeadLive(organizationId),
        });
      }
      if (options.method === "POST" && path === "/agents/growth/crm/sync") {
        const campaignId =
          typeof body.campaignId === "string" ? body.campaignId : undefined;
        return mockOk(await growthService.requestCrmSync(organizationId, campaignId), 201);
      }
      if (options.method === "GET" && path === "/agents/growth/crm/follow-ups") {
        const campaignId = readQuery(options, "campaignId") ?? undefined;
        const customerId = readQuery(options, "customerId") ?? undefined;
        return mockOk({
          followUps: growthService.listCrmFollowUps(organizationId, {
            campaignId,
            customerId,
          }),
          lead: await growthService.getCrmLinkedLeadLive(organizationId),
        });
      }
      if (options.method === "GET" && path === "/agents/growth/crm/leads/priority") {
        const queue = await growthService.getLeadActionQueue(organizationId);
        return mockOk({
          queue,
          readOnly: true,
        });
      }
      const leadAction = path.match(
        /^\/agents\/growth\/crm\/leads\/([^/]+)\/actions$/,
      );
      if (options.method === "POST" && leadAction) {
        const targetCrmStatus =
          body.targetCrmStatus === "lead" ||
          body.targetCrmStatus === "prospect" ||
          body.targetCrmStatus === "active" ||
          body.targetCrmStatus === "inactive" ||
          body.targetCrmStatus === "vip" ||
          body.targetCrmStatus === "archived"
            ? body.targetCrmStatus
            : body.targetStatus === "lead" ||
                body.targetStatus === "prospect" ||
                body.targetStatus === "active" ||
                body.targetStatus === "inactive" ||
                body.targetStatus === "vip" ||
                body.targetStatus === "archived"
              ? body.targetStatus
              : undefined;
        return mockOk(
          await growthService.executeLeadAction(organizationId, {
            profileId: decodeURIComponent(leadAction[1]),
            action: typeof body.action === "string" ? body.action : "",
            followUpId:
              typeof body.followUpId === "string" ? body.followUpId : undefined,
            campaignId:
              typeof body.campaignId === "string" ? body.campaignId : undefined,
            summary: typeof body.summary === "string" ? body.summary : undefined,
            completionNote:
              typeof body.completionNote === "string"
                ? body.completionNote
                : undefined,
            dueAt: typeof body.dueAt === "string" ? body.dueAt : undefined,
            targetCrmStatus,
          }),
          201,
        );
      }
      if (options.method === "POST" && path === "/agents/growth/crm/follow-ups") {
        return mockOk(
          await growthService.requestCrmFollowUp(organizationId, {
            campaignId:
              typeof body.campaignId === "string" ? body.campaignId : undefined,
            kind:
              body.kind === "call" ||
              body.kind === "email_draft" ||
              body.kind === "meeting" ||
              body.kind === "general"
                ? body.kind
                : undefined,
            title: typeof body.title === "string" ? body.title : undefined,
            summary: typeof body.summary === "string" ? body.summary : undefined,
            dueAt: typeof body.dueAt === "string" ? body.dueAt : undefined,
          }),
          201,
        );
      }
      const followUpComplete = path.match(
        /^\/agents\/growth\/crm\/follow-ups\/([^/]+)\/complete$/,
      );
      if (options.method === "POST" && followUpComplete) {
        return mockOk(
          await growthService.requestCrmFollowUpComplete(organizationId, {
            followUpId: followUpComplete[1],
            completionNote:
              typeof body.completionNote === "string"
                ? body.completionNote
                : undefined,
            campaignId:
              typeof body.campaignId === "string" ? body.campaignId : undefined,
          }),
          201,
        );
      }
      const campaignCrmSync = path.match(/^\/agents\/growth\/campaigns\/([^/]+)\/crm-sync$/);
      if (options.method === "POST" && campaignCrmSync) {
        return mockOk(
          await growthService.requestCrmSync(organizationId, campaignCrmSync[1]),
          201,
        );
      }
      if (options.method === "GET" && campaignCrmSync) {
        return mockOk({
          sync: growthService.getCrmSync(organizationId, campaignCrmSync[1]) ?? null,
          link: growthService.getCrmLink(organizationId) ?? null,
        });
      }
      const campaignApprove = path.match(/^\/agents\/growth\/campaigns\/([^/]+)\/approve$/);
      if (options.method === "POST" && campaignApprove) {
        return mockOk(await growthService.requestCampaignApproval(organizationId, campaignApprove[1]));
      }
      const campaignMatch = path.match(/^\/agents\/growth\/campaigns\/([^/]+)$/);
      if (options.method === "GET" && campaignMatch) {
        const campaign = growthService.getCampaign(organizationId, campaignMatch[1]);
        if (!campaign) {
          return {
            ok: false,
            status: 404,
            code: "campaign_missing",
            message: "Campaign not found",
          };
        }
        return mockOk(campaign);
      }

      return {
        ok: false,
        status: 404,
        code: "agent_handler_missing",
        message: `No agent handler for ${options.method ?? "GET"} ${path}`,
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        code: "agent_handler_error",
        message:
          error instanceof Error ? error.message : "Agent handler failed",
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

function stripQuery(path: string): string {
  const idx = path.indexOf("?");
  return idx >= 0 ? path.slice(0, idx) : path;
}
