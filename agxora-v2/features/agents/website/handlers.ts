import type { ToolInvocationContext, ToolInvocationResult } from "../types";
import { agentsStore } from "../store";
import { generateWebsiteProject } from "./generator";
import { getWebsitePublisher } from "./publisher";
import type { WebsiteProject } from "./types";

function readString(params: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function latestProject(
  organizationId: string,
  projectId?: string,
): WebsiteProject | undefined {
  const projects = agentsStore
    .getSnapshot()
    .websiteProjects.filter((item) => item.organizationId === organizationId);
  if (projectId) return projects.find((item) => item.id === projectId);
  return projects[0];
}

export async function handleWebsiteTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const profileId = readString(ctx.params, "profileId");
  const projectId = readString(ctx.params, "projectId");
  const profile = agentsStore
    .getSnapshot()
    .growthProfiles.find(
      (item) =>
        item.organizationId === ctx.organizationId &&
        (profileId ? item.id === profileId : true),
    );
  if (!profile) {
    return {
      ok: false,
      error: "Growth profile is required before website generation.",
      durationMs: Date.now() - started,
    };
  }

  const generated = generateWebsiteProject({
    organizationId: ctx.organizationId,
    profile,
    projectId,
  });
  const previous = latestProject(ctx.organizationId, generated.id);
  const project: WebsiteProject = {
    ...generated,
    status: "PREVIEW",
    taskId: ctx.taskId,
    createdAt: previous?.createdAt ?? generated.createdAt,
    updatedAt: generated.updatedAt,
  };
  agentsStore.upsertWebsiteProject(project);
  return {
    ok: true,
    output: {
      generated: true,
      projectId: project.id,
      status: project.status,
      pageCount: project.pages.length,
      published: false,
    },
    durationMs: Date.now() - started,
  };
}

export async function handleWebsitePublishTool(
  ctx: ToolInvocationContext,
): Promise<ToolInvocationResult> {
  const started = Date.now();
  const projectId = readString(ctx.params, "projectId");
  const project = latestProject(ctx.organizationId, projectId);
  if (!project) {
    return {
      ok: false,
      error: "Website project not found.",
      durationMs: Date.now() - started,
    };
  }
  if (project.approvalState === "REJECTED") {
    agentsStore.upsertWebsiteProject({
      ...project,
      status: "NEEDS_CHANGES",
      updatedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      error: "Rejected website projects cannot be published.",
      durationMs: Date.now() - started,
    };
  }

  const result = await getWebsitePublisher().publish(project);
  const published =
    result.available && result.published && result.status === "published";
  const next: WebsiteProject = {
    ...project,
    taskId: ctx.taskId,
    publishResult: result,
    status: published
      ? "PUBLISHED"
      : project.approvalState === "APPROVED"
        ? "APPROVED"
        : "READY",
    updatedAt: new Date().toISOString(),
  };
  agentsStore.upsertWebsiteProject(next);
  return {
    ok: true,
    output: {
      available: result.available,
      status: result.status,
      published: next.status === "PUBLISHED",
      projectStatus: next.status,
    },
    durationMs: Date.now() - started,
  };
}
