import { recordActivity } from "../backend/activity";
import { auditLog } from "../backend/audit";
import { projectRepository } from "./repository";
import type {
  MemberDraft,
  NoteDraft,
  ProjectDraft,
  ProjectFileRecord,
  ProjectId,
  ProjectNoteRecord,
  ProjectRecord,
  TaskDraft,
  TaskId,
  TaskRecord,
  TaskStatus,
} from "./types";
import {
  validateMemberDraft,
  validateNoteDraft,
  validateProjectDraft,
  validateTaskDraft,
  type MemberFieldError,
  type NoteFieldError,
  type ProjectFieldError,
  type TaskFieldError,
} from "./validation";

const HREF = "/dashboard/projects";

export class ProjectValidationError extends Error {
  readonly errors: readonly ProjectFieldError[];

  constructor(errors: readonly ProjectFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "ProjectValidationError";
    this.errors = errors;
  }
}

export class TaskValidationError extends Error {
  readonly errors: readonly TaskFieldError[];

  constructor(errors: readonly TaskFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "TaskValidationError";
    this.errors = errors;
  }
}

export class MemberValidationError extends Error {
  readonly errors: readonly MemberFieldError[];

  constructor(errors: readonly MemberFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "MemberValidationError";
    this.errors = errors;
  }
}

export class NoteValidationError extends Error {
  readonly errors: readonly NoteFieldError[];

  constructor(errors: readonly NoteFieldError[]) {
    super(errors[0]?.message ?? "Validation failed");
    this.name = "NoteValidationError";
    this.errors = errors;
  }
}

const MAX_INLINE_FILE_BYTES = 750_000;

export class ProjectManagementService {
  constructor(private readonly repo = projectRepository) {}

  list(organizationId?: string) {
    return this.repo.listProjects(organizationId);
  }

  getById(id: ProjectId) {
    return this.repo.getProject(id);
  }

  subscribe(listener: () => void) {
    return this.repo.subscribe(listener);
  }

  listTasks(projectId: ProjectId) {
    return this.repo.listTasks(projectId);
  }

  listFiles(projectId: ProjectId) {
    return this.repo.listFiles(projectId);
  }

  listNotes(projectId: ProjectId) {
    return this.repo.listNotes(projectId);
  }

  listActivities(projectId: ProjectId) {
    return this.repo.listActivities(projectId);
  }

  getKanbanOrder(projectId: ProjectId) {
    return this.repo.getKanbanOrder(projectId);
  }

  getDatabase() {
    return this.repo.getDatabase();
  }

  async createFromDraft(
    draft: ProjectDraft,
    organizationId: string,
  ): Promise<ProjectRecord> {
    const result = validateProjectDraft(draft);
    if (!result.ok) throw new ProjectValidationError(result.errors);
    const project = await this.repo.createProject({
      organizationId,
      ...result.value,
    });
    recordActivity({
      kind: "project_updated",
      title: "Project Created",
      detail: project.name,
      entityId: project.id,
      organizationId: project.organizationId,
      href: `${HREF}/${project.id}`,
    });
    auditLog({
      action: "project.create",
      resource: "project",
      resourceId: project.id,
      organizationId: project.organizationId,
    });
    return project;
  }

  async updateFromDraft(
    id: ProjectId,
    draft: ProjectDraft,
  ): Promise<ProjectRecord> {
    const result = validateProjectDraft(draft);
    if (!result.ok) throw new ProjectValidationError(result.errors);
    const project = await this.repo.updateProject(id, result.value);
    recordActivity({
      kind: "project_updated",
      title: "Project Updated",
      detail: project.name,
      entityId: project.id,
      organizationId: project.organizationId,
      href: `${HREF}/${project.id}`,
    });
    auditLog({
      action: "project.update",
      resource: "project",
      resourceId: project.id,
      organizationId: project.organizationId,
    });
    return project;
  }

  async deleteProject(id: ProjectId): Promise<ProjectRecord | null> {
    const existing = await this.repo.getProject(id);
    if (!existing) return null;
    await this.repo.deleteProject(id);
    recordActivity({
      kind: "project_updated",
      title: "Project Deleted",
      detail: existing.name,
      entityId: existing.id,
      organizationId: existing.organizationId,
      href: HREF,
    });
    auditLog({
      action: "project.delete",
      resource: "project",
      resourceId: existing.id,
      organizationId: existing.organizationId,
    });
    return existing;
  }

  async createTaskFromDraft(
    draft: TaskDraft,
    projectId: ProjectId,
    organizationId: string,
  ): Promise<TaskRecord> {
    const result = validateTaskDraft(draft);
    if (!result.ok) throw new TaskValidationError(result.errors);
    return this.repo.createTask({
      projectId,
      organizationId,
      ...result.value,
    });
  }

  async updateTaskFromDraft(
    id: TaskId,
    draft: TaskDraft,
  ): Promise<TaskRecord> {
    const result = validateTaskDraft(draft);
    if (!result.ok) throw new TaskValidationError(result.errors);
    return this.repo.updateTask(id, result.value);
  }

  async completeTask(id: TaskId): Promise<TaskRecord> {
    return this.repo.updateTask(id, { status: "done", progress: 100 });
  }

  deleteTask(id: TaskId) {
    return this.repo.deleteTask(id);
  }

  moveTask(
    projectId: ProjectId,
    taskId: TaskId,
    toStatus: TaskStatus,
    toIndex: number,
  ) {
    return this.repo.moveTask(projectId, taskId, toStatus, toIndex);
  }

  async addMemberFromDraft(projectId: ProjectId, draft: MemberDraft) {
    const result = validateMemberDraft(draft);
    if (!result.ok) throw new MemberValidationError(result.errors);
    const { id: _id, ...member } = result.value;
    void _id;
    return this.repo.addMember(projectId, member);
  }

  removeMember(projectId: ProjectId, memberId: string) {
    return this.repo.removeMember(projectId, memberId);
  }

  async createNoteFromDraft(
    draft: NoteDraft,
    projectId: ProjectId,
    organizationId: string,
  ): Promise<ProjectNoteRecord> {
    const result = validateNoteDraft(draft);
    if (!result.ok) throw new NoteValidationError(result.errors);
    return this.repo.createNote({
      projectId,
      organizationId,
      ...result.value,
    });
  }

  async updateNoteFromDraft(id: string, draft: NoteDraft) {
    const result = validateNoteDraft(draft);
    if (!result.ok) throw new NoteValidationError(result.errors);
    return this.repo.updateNote(id, result.value);
  }

  deleteNote(id: string) {
    return this.repo.deleteNote(id);
  }

  async uploadFile(
    projectId: ProjectId,
    organizationId: string,
    file: File,
    uploadedBy: string,
  ): Promise<ProjectFileRecord> {
    const dataUrl =
      file.size <= MAX_INLINE_FILE_BYTES
        ? await readFileAsDataUrl(file)
        : "";
    return this.repo.createFile({
      projectId,
      organizationId,
      name: file.name,
      mimeType: file.type || guessMime(file.name),
      size: file.size,
      dataUrl,
      uploadedBy: uploadedBy.trim() || "System",
    });
  }

  deleteFile(id: string) {
    return this.repo.deleteFile(id);
  }
}

function guessMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export const projectManagementService = new ProjectManagementService();
