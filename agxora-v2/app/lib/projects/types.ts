/**
 * Enterprise Project Management domain — API-ready models.
 * Persistence can swap localStorage → SQL/API without UI changes.
 */

export type ProjectId = string;
export type TaskId = string;
export type ProjectFileId = string;
export type ProjectNoteId = string;
export type ProjectActivityId = string;
export type MemberId = string;

export type ProjectStatus =
  | "active"
  | "completed"
  | "on_hold"
  | "archived"
  | "planning";

export type ProjectPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type ProjectMemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer";

export type ProjectCurrency = "EUR" | "USD" | "GBP" | "CHF";

export type ProjectViewMode = "cards" | "table";

export type ProjectDetailTab =
  | "overview"
  | "tasks"
  | "files"
  | "notes"
  | "activity"
  | "team"
  | "settings";

export type ProjectSortKey =
  | "name"
  | "status"
  | "priority"
  | "progress"
  | "dueDate"
  | "budget"
  | "updatedAt"
  | "customer"
  | "owner";

export type SortDirection = "asc" | "desc";

export type ProjectActivityKind =
  | "project_created"
  | "project_updated"
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted"
  | "member_added"
  | "member_removed"
  | "file_uploaded"
  | "file_deleted"
  | "note_added"
  | "note_updated"
  | "note_deleted";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export const PROJECT_PRIORITIES: readonly ProjectPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const TASK_STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const MEMBER_ROLES: readonly ProjectMemberRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
  "viewer",
] as const;

export const PROJECT_CURRENCIES: readonly ProjectCurrency[] = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
] as const;

export const PROJECT_COLORS = [
  "#22d3ee",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#60a5fa",
  "#f472b6",
  "#2dd4bf",
] as const;

export const PROJECT_ICONS = [
  "folder",
  "rocket",
  "briefcase",
  "target",
  "layers",
  "zap",
] as const;

export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export interface ProjectMember {
  readonly id: MemberId;
  readonly name: string;
  readonly email: string;
  readonly role: ProjectMemberRole;
  readonly avatarInitials: string;
}

export interface ProjectMilestone {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly completed: boolean;
}

export interface ProjectRecord {
  readonly id: ProjectId;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string;
  readonly customer: string;
  readonly owner: string;
  readonly members: readonly ProjectMember[];
  readonly priority: ProjectPriority;
  readonly status: ProjectStatus;
  readonly progress: number;
  readonly budget: number;
  readonly spent: number;
  readonly currency: ProjectCurrency;
  readonly startDate: string;
  readonly dueDate: string;
  readonly tags: readonly string[];
  readonly color: string;
  readonly icon: ProjectIcon;
  readonly milestones: readonly ProjectMilestone[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaskRecord {
  readonly id: TaskId;
  readonly projectId: ProjectId;
  readonly organizationId: string;
  readonly title: string;
  readonly description: string;
  readonly assignee: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly dueDate: string;
  readonly progress: number;
  readonly labels: readonly string[];
  readonly order: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectFileRecord {
  readonly id: ProjectFileId;
  readonly projectId: ProjectId;
  readonly organizationId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  /** Data URL or empty for metadata-only / oversized stubs */
  readonly dataUrl: string;
  readonly uploadedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectNoteRecord {
  readonly id: ProjectNoteId;
  readonly projectId: ProjectId;
  readonly organizationId: string;
  readonly title: string;
  readonly body: string;
  readonly author: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectActivityRecord {
  readonly id: ProjectActivityId;
  readonly projectId: ProjectId;
  readonly organizationId: string;
  readonly kind: ProjectActivityKind;
  readonly title: string;
  readonly detail: string;
  readonly actor: string;
  readonly createdAt: string;
}

export type KanbanColumnOrder = Readonly<Record<TaskStatus, readonly TaskId[]>>;

export type ProjectDraft = {
  name: string;
  description: string;
  customer: string;
  owner: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  budget: string;
  currency: ProjectCurrency;
  startDate: string;
  dueDate: string;
  color: string;
  icon: ProjectIcon;
  tags: string;
};

export type TaskDraft = {
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  progress: string;
  labels: string;
};

export type MemberDraft = {
  name: string;
  email: string;
  role: ProjectMemberRole;
};

export type NoteDraft = {
  title: string;
  body: string;
  author: string;
};

export type ProjectCreateInput = Omit<
  ProjectRecord,
  "id" | "createdAt" | "updatedAt" | "members" | "milestones" | "spent" | "progress" | "tags"
> & {
  readonly tags?: readonly string[];
  readonly members?: readonly ProjectMember[];
  readonly milestones?: readonly ProjectMilestone[];
  readonly spent?: number;
  readonly progress?: number;
};

export type ProjectUpdateInput = Partial<
  Omit<ProjectRecord, "id" | "organizationId" | "createdAt" | "updatedAt">
>;

export type TaskCreateInput = Omit<
  TaskRecord,
  "id" | "createdAt" | "updatedAt" | "labels" | "order"
> & {
  readonly labels?: readonly string[];
  readonly order?: number;
};

export type TaskUpdateInput = Partial<
  Omit<TaskRecord, "id" | "projectId" | "organizationId" | "createdAt" | "updatedAt">
>;

export function parseTags(raw: string): readonly string[] {
  return raw
    .split(/[,;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";
}

export function emptyProjectDraft(
  defaults?: Partial<ProjectDraft>,
): ProjectDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "",
    description: "",
    customer: "",
    owner: "",
    priority: "medium",
    status: "planning",
    budget: "",
    currency: "EUR",
    startDate: today,
    dueDate: "",
    color: PROJECT_COLORS[0],
    icon: "folder",
    tags: "",
    ...defaults,
  };
}

export function draftFromProject(project: ProjectRecord): ProjectDraft {
  return {
    name: project.name,
    description: project.description,
    customer: project.customer,
    owner: project.owner,
    priority: project.priority,
    status: project.status,
    budget: String(project.budget || ""),
    currency: project.currency,
    startDate: project.startDate.slice(0, 10),
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
    color: project.color,
    icon: project.icon,
    tags: project.tags.join(", "),
  };
}

export function emptyTaskDraft(defaults?: Partial<TaskDraft>): TaskDraft {
  return {
    title: "",
    description: "",
    assignee: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    progress: "0",
    labels: "",
    ...defaults,
  };
}

export function draftFromTask(task: TaskRecord): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    assignee: task.assignee,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    progress: String(task.progress),
    labels: task.labels.join(", "),
  };
}

export function emptyMemberDraft(
  defaults?: Partial<MemberDraft>,
): MemberDraft {
  return {
    name: "",
    email: "",
    role: "member",
    ...defaults,
  };
}

export function emptyNoteDraft(defaults?: Partial<NoteDraft>): NoteDraft {
  return {
    title: "",
    body: "",
    author: "",
    ...defaults,
  };
}

export function emptyKanbanOrder(): KanbanColumnOrder {
  return {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
}

/** Mutable builder used by the repository before freezing into KanbanColumnOrder. */
export function createMutableKanbanOrder(): Record<TaskStatus, TaskId[]> {
  return {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
}

export function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case "on_hold":
      return "On Hold";
    case "planning":
      return "Planning";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "To Do";
    case "in_progress":
      return "In Progress";
    case "review":
      return "Review";
    case "done":
      return "Done";
    default:
      return status;
  }
}

export function priorityLabel(priority: ProjectPriority | TaskPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function roleLabel(role: ProjectMemberRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
