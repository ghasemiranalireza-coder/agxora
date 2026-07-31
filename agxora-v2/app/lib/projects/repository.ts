/**
 * Projects repository — local persistence today, SQL/API tomorrow.
 * Never overwrites existing storage unexpectedly; migrates safely.
 */

import type {
  KanbanColumnOrder,
  ProjectActivityKind,
  ProjectActivityRecord,
  ProjectCreateInput,
  ProjectFileRecord,
  ProjectId,
  ProjectMember,
  ProjectNoteRecord,
  ProjectRecord,
  ProjectUpdateInput,
  TaskCreateInput,
  TaskId,
  TaskRecord,
  TaskStatus,
  TaskUpdateInput,
} from "./types";
import { TASK_STATUSES, createMutableKanbanOrder, emptyKanbanOrder, initialsFromName } from "./types";

export const PROJECTS_STORAGE_KEY = "agxora-projects-v1";
export const STORAGE_VERSION = 1;

type Listener = () => void;

export interface ProjectsDatabase {
  readonly version: number;
  readonly projects: ProjectRecord[];
  readonly tasks: TaskRecord[];
  readonly files: ProjectFileRecord[];
  readonly notes: ProjectNoteRecord[];
  readonly activities: ProjectActivityRecord[];
  readonly kanbanOrder: Record<string, KanbanColumnOrder>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDb(): ProjectsDatabase {
  return {
    version: STORAGE_VERSION,
    projects: [],
    tasks: [],
    files: [],
    notes: [],
    activities: [],
    kanbanOrder: {},
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrate(raw: unknown): ProjectsDatabase {
  if (!isObject(raw)) return emptyDb();

  const version =
    typeof raw.version === "number" && Number.isFinite(raw.version)
      ? raw.version
      : 0;

  // Future migrations branch on `version`. Unknown shapes fall back carefully.
  const base = emptyDb();

  const projects = Array.isArray(raw.projects)
    ? (raw.projects as ProjectRecord[])
    : Array.isArray(raw) // legacy: bare array of projects
      ? (raw as ProjectRecord[])
      : base.projects;

  const tasks = Array.isArray(raw.tasks) ? (raw.tasks as TaskRecord[]) : [];
  const files = Array.isArray(raw.files) ? (raw.files as ProjectFileRecord[]) : [];
  const notes = Array.isArray(raw.notes) ? (raw.notes as ProjectNoteRecord[]) : [];
  const activities = Array.isArray(raw.activities)
    ? (raw.activities as ProjectActivityRecord[])
    : [];

  const kanbanOrder: Record<string, KanbanColumnOrder> = {};
  if (isObject(raw.kanbanOrder)) {
    for (const [projectId, columns] of Object.entries(raw.kanbanOrder)) {
      if (!isObject(columns)) continue;
      const next = createMutableKanbanOrder();
      for (const status of TASK_STATUSES) {
        const list = columns[status];
        next[status] = Array.isArray(list)
          ? (list.filter((id) => typeof id === "string") as string[])
          : [];
      }
      kanbanOrder[projectId] = next;
    }
  }

  void version;
  return {
    version: STORAGE_VERSION,
    projects: [...projects],
    tasks: [...tasks],
    files: [...files],
    notes: [...notes],
    activities: [...activities],
    kanbanOrder,
  };
}

function readDb(): ProjectsDatabase {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return emptyDb();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return emptyDb();
  }
}

function writeDb(db: ProjectsDatabase): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota / private mode — keep in-memory only for this session.
  }
}

let cache: ProjectsDatabase | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function ensureDb(): ProjectsDatabase {
  if (cache === null) {
    cache = typeof window === "undefined" ? emptyDb() : readDb();
  }
  return cache;
}

function persist(next: ProjectsDatabase): void {
  cache = next;
  writeDb(next);
  emit();
}

function pushActivity(
  db: ProjectsDatabase,
  input: {
    readonly projectId: ProjectId;
    readonly organizationId: string;
    readonly kind: ProjectActivityKind;
    readonly title: string;
    readonly detail: string;
    readonly actor?: string;
  },
): ProjectsDatabase {
  const row: ProjectActivityRecord = {
    id: createId("pact"),
    projectId: input.projectId,
    organizationId: input.organizationId,
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    actor: input.actor?.trim() || "System",
    createdAt: nowIso(),
  };
  return {
    ...db,
    activities: [row, ...db.activities].slice(0, 500),
  };
}

function rebuildKanban(
  projectId: ProjectId,
  tasks: readonly TaskRecord[],
  existing?: KanbanColumnOrder,
): KanbanColumnOrder {
  const order = createMutableKanbanOrder();
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  for (const status of TASK_STATUSES) {
    const columnTasks = projectTasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    const preferred = existing?.[status] ?? [];
    const ids = columnTasks.map((task) => task.id);
    const sorted = [
      ...preferred.filter((id) => ids.includes(id)),
      ...ids.filter((id) => !preferred.includes(id)),
    ];
    order[status] = sorted;
  }
  return order;
}

function syncProjectProgress(
  project: ProjectRecord,
  tasks: readonly TaskRecord[],
): ProjectRecord {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  if (projectTasks.length === 0) {
    return project;
  }
  const avg =
    projectTasks.reduce((sum, task) => sum + task.progress, 0) /
    projectTasks.length;
  const doneRatio =
    projectTasks.filter((task) => task.status === "done").length /
    projectTasks.length;
  const progress = Math.round(Math.max(avg, doneRatio * 100));
  if (progress === project.progress) return project;
  return { ...project, progress, updatedAt: nowIso() };
}

export interface ProjectRepository {
  listProjects(organizationId?: string): Promise<readonly ProjectRecord[]>;
  getProject(id: ProjectId): Promise<ProjectRecord | null>;
  createProject(input: ProjectCreateInput): Promise<ProjectRecord>;
  updateProject(
    id: ProjectId,
    patch: ProjectUpdateInput,
  ): Promise<ProjectRecord>;
  deleteProject(id: ProjectId): Promise<void>;

  listTasks(projectId: ProjectId): Promise<readonly TaskRecord[]>;
  createTask(input: TaskCreateInput): Promise<TaskRecord>;
  updateTask(id: TaskId, patch: TaskUpdateInput): Promise<TaskRecord>;
  deleteTask(id: TaskId): Promise<void>;
  moveTask(
    projectId: ProjectId,
    taskId: TaskId,
    toStatus: TaskStatus,
    toIndex: number,
  ): Promise<TaskRecord>;

  listFiles(projectId: ProjectId): Promise<readonly ProjectFileRecord[]>;
  createFile(
    input: Omit<ProjectFileRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<ProjectFileRecord>;
  deleteFile(id: string): Promise<void>;

  listNotes(projectId: ProjectId): Promise<readonly ProjectNoteRecord[]>;
  createNote(
    input: Omit<ProjectNoteRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<ProjectNoteRecord>;
  updateNote(
    id: string,
    patch: Partial<Pick<ProjectNoteRecord, "title" | "body" | "author">>,
  ): Promise<ProjectNoteRecord>;
  deleteNote(id: string): Promise<void>;

  listActivities(projectId: ProjectId): Promise<readonly ProjectActivityRecord[]>;
  getKanbanOrder(projectId: ProjectId): Promise<KanbanColumnOrder>;
  addMember(
    projectId: ProjectId,
    member: Omit<ProjectMember, "id" | "avatarInitials"> & {
      readonly avatarInitials?: string;
    },
  ): Promise<ProjectRecord>;
  removeMember(projectId: ProjectId, memberId: string): Promise<ProjectRecord>;

  subscribe(listener: Listener): () => void;
  replaceAll(db: ProjectsDatabase): void;
  getDatabase(): ProjectsDatabase;
}

export const projectRepository: ProjectRepository = {
  async listProjects(organizationId) {
    const rows = ensureDb().projects;
    if (!organizationId) return [...rows];
    return rows.filter((row) => row.organizationId === organizationId);
  },

  async getProject(id) {
    return ensureDb().projects.find((row) => row.id === id) ?? null;
  },

  async createProject(input) {
    const stamp = nowIso();
    const ownerMember: ProjectMember = {
      id: createId("pmem"),
      name: input.owner,
      email: "",
      role: "owner",
      avatarInitials: initialsFromName(input.owner),
    };
    const row: ProjectRecord = {
      id: createId("prj"),
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      customer: input.customer,
      owner: input.owner,
      members: input.members?.length ? [...input.members] : [ownerMember],
      priority: input.priority,
      status: input.status,
      progress: input.progress ?? 0,
      budget: input.budget,
      spent: input.spent ?? 0,
      currency: input.currency,
      startDate: input.startDate,
      dueDate: input.dueDate,
      tags: input.tags ?? [],
      color: input.color,
      icon: input.icon,
      milestones: input.milestones ?? [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = {
      ...db,
      projects: [row, ...db.projects],
      kanbanOrder: {
        ...db.kanbanOrder,
        [row.id]: emptyKanbanOrder(),
      },
    };
    db = pushActivity(db, {
      projectId: row.id,
      organizationId: row.organizationId,
      kind: "project_created",
      title: "Project Created",
      detail: row.name,
      actor: row.owner,
    });
    persist(db);
    return row;
  },

  async updateProject(id, patch) {
    const db = ensureDb();
    const index = db.projects.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Project not found: ${id}`);
    const existing = db.projects[index];
    const updated: ProjectRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      organizationId: existing.organizationId,
      members: patch.members ?? existing.members,
      tags: patch.tags ?? existing.tags,
      milestones: patch.milestones ?? existing.milestones,
      updatedAt: nowIso(),
    };
    const projects = [...db.projects];
    projects[index] = updated;
    let next = { ...db, projects };
    next = pushActivity(next, {
      projectId: updated.id,
      organizationId: updated.organizationId,
      kind: "project_updated",
      title: "Project Updated",
      detail: updated.name,
      actor: updated.owner,
    });
    persist(next);
    return updated;
  },

  async deleteProject(id) {
    let db = ensureDb();
    const { [id]: _removed, ...kanbanRest } = db.kanbanOrder;
    void _removed;
    db = {
      ...db,
      projects: db.projects.filter((row) => row.id !== id),
      tasks: db.tasks.filter((row) => row.projectId !== id),
      files: db.files.filter((row) => row.projectId !== id),
      notes: db.notes.filter((row) => row.projectId !== id),
      activities: db.activities.filter((row) => row.projectId !== id),
      kanbanOrder: kanbanRest,
    };
    persist(db);
  },

  async listTasks(projectId) {
    return ensureDb()
      .tasks.filter((row) => row.projectId === projectId)
      .slice()
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  },

  async createTask(input) {
    const stamp = nowIso();
    const existing = ensureDb().tasks.filter(
      (row) => row.projectId === input.projectId && row.status === input.status,
    );
    const row: TaskRecord = {
      id: createId("task"),
      projectId: input.projectId,
      organizationId: input.organizationId,
      title: input.title,
      description: input.description,
      assignee: input.assignee,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate,
      progress: input.progress,
      labels: input.labels ?? [],
      order: input.order ?? existing.length,
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    const tasks = [row, ...db.tasks];
    const projects = db.projects.map((project) =>
      project.id === row.projectId ? syncProjectProgress(project, tasks) : project,
    );
    const kanban = rebuildKanban(
      row.projectId,
      tasks,
      db.kanbanOrder[row.projectId],
    );
    db = {
      ...db,
      tasks,
      projects,
      kanbanOrder: { ...db.kanbanOrder, [row.projectId]: kanban },
    };
    db = pushActivity(db, {
      projectId: row.projectId,
      organizationId: row.organizationId,
      kind: "task_created",
      title: "Task Created",
      detail: row.title,
      actor: row.assignee || "System",
    });
    persist(db);
    return row;
  },

  async updateTask(id, patch) {
    let db = ensureDb();
    const index = db.tasks.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Task not found: ${id}`);
    const existing = db.tasks[index];
    const updated: TaskRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      projectId: existing.projectId,
      organizationId: existing.organizationId,
      labels: patch.labels ?? existing.labels,
      updatedAt: nowIso(),
    };
    const tasks = [...db.tasks];
    tasks[index] = updated;
    const projects = db.projects.map((project) =>
      project.id === updated.projectId
        ? syncProjectProgress(project, tasks)
        : project,
    );
    const kanban = rebuildKanban(
      updated.projectId,
      tasks,
      db.kanbanOrder[updated.projectId],
    );
    db = {
      ...db,
      tasks,
      projects,
      kanbanOrder: { ...db.kanbanOrder, [updated.projectId]: kanban },
    };
    const completed =
      existing.status !== "done" && updated.status === "done";
    db = pushActivity(db, {
      projectId: updated.projectId,
      organizationId: updated.organizationId,
      kind: completed ? "task_completed" : "task_updated",
      title: completed ? "Task Completed" : "Task Updated",
      detail: updated.title,
      actor: updated.assignee || "System",
    });
    persist(db);
    return updated;
  },

  async deleteTask(id) {
    let db = ensureDb();
    const existing = db.tasks.find((row) => row.id === id);
    if (!existing) return;
    const tasks = db.tasks.filter((row) => row.id !== id);
    const projects = db.projects.map((project) =>
      project.id === existing.projectId
        ? syncProjectProgress(project, tasks)
        : project,
    );
    const kanban = rebuildKanban(
      existing.projectId,
      tasks,
      db.kanbanOrder[existing.projectId],
    );
    db = {
      ...db,
      tasks,
      projects,
      kanbanOrder: { ...db.kanbanOrder, [existing.projectId]: kanban },
    };
    db = pushActivity(db, {
      projectId: existing.projectId,
      organizationId: existing.organizationId,
      kind: "task_deleted",
      title: "Task Deleted",
      detail: existing.title,
    });
    persist(db);
  },

  async moveTask(projectId, taskId, toStatus, toIndex) {
    let db = ensureDb();
    const task = db.tasks.find((row) => row.id === taskId);
    if (!task || task.projectId !== projectId) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const current =
      db.kanbanOrder[projectId] ??
      rebuildKanban(projectId, db.tasks, undefined);

    const nextOrder: Record<TaskStatus, string[]> = {
      todo: [...current.todo],
      in_progress: [...current.in_progress],
      review: [...current.review],
      done: [...current.done],
    };

    for (const status of TASK_STATUSES) {
      nextOrder[status] = nextOrder[status].filter((id) => id !== taskId);
    }
    const target = nextOrder[toStatus];
    const clamped = Math.max(0, Math.min(toIndex, target.length));
    target.splice(clamped, 0, taskId);

    const tasks = db.tasks.map((row) => {
      if (row.id !== taskId) {
        const column = TASK_STATUSES.find((status) =>
          nextOrder[status].includes(row.id),
        );
        if (!column || row.projectId !== projectId) return row;
        const order = nextOrder[column].indexOf(row.id);
        if (row.status === column && row.order === order) return row;
        return { ...row, status: column, order, updatedAt: nowIso() };
      }
      const progress =
        toStatus === "done" ? 100 : toStatus === "todo" ? row.progress : row.progress;
      return {
        ...row,
        status: toStatus,
        order: clamped,
        progress: toStatus === "done" ? 100 : progress,
        updatedAt: nowIso(),
      };
    });

    const projects = db.projects.map((project) =>
      project.id === projectId ? syncProjectProgress(project, tasks) : project,
    );

    const updated = tasks.find((row) => row.id === taskId)!;
    db = {
      ...db,
      tasks,
      projects,
      kanbanOrder: { ...db.kanbanOrder, [projectId]: nextOrder },
    };
    const completed = task.status !== "done" && toStatus === "done";
    db = pushActivity(db, {
      projectId,
      organizationId: task.organizationId,
      kind: completed ? "task_completed" : "task_updated",
      title: completed ? "Task Completed" : "Task Updated",
      detail: updated.title,
      actor: updated.assignee || "System",
    });
    persist(db);
    return updated;
  },

  async listFiles(projectId) {
    return ensureDb()
      .files.filter((row) => row.projectId === projectId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createFile(input) {
    const stamp = nowIso();
    const row: ProjectFileRecord = {
      ...input,
      id: createId("pfile"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, files: [row, ...db.files] };
    db = pushActivity(db, {
      projectId: row.projectId,
      organizationId: row.organizationId,
      kind: "file_uploaded",
      title: "File Uploaded",
      detail: row.name,
      actor: row.uploadedBy,
    });
    persist(db);
    return row;
  },

  async deleteFile(id) {
    let db = ensureDb();
    const existing = db.files.find((row) => row.id === id);
    if (!existing) return;
    db = { ...db, files: db.files.filter((row) => row.id !== id) };
    db = pushActivity(db, {
      projectId: existing.projectId,
      organizationId: existing.organizationId,
      kind: "file_deleted",
      title: "File Deleted",
      detail: existing.name,
    });
    persist(db);
  },

  async listNotes(projectId) {
    return ensureDb()
      .notes.filter((row) => row.projectId === projectId)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async createNote(input) {
    const stamp = nowIso();
    const row: ProjectNoteRecord = {
      ...input,
      id: createId("pnote"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    let db = ensureDb();
    db = { ...db, notes: [row, ...db.notes] };
    db = pushActivity(db, {
      projectId: row.projectId,
      organizationId: row.organizationId,
      kind: "note_added",
      title: "Note Added",
      detail: row.title,
      actor: row.author,
    });
    persist(db);
    return row;
  },

  async updateNote(id, patch) {
    let db = ensureDb();
    const index = db.notes.findIndex((row) => row.id === id);
    if (index < 0) throw new Error(`Note not found: ${id}`);
    const existing = db.notes[index];
    const updated: ProjectNoteRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      projectId: existing.projectId,
      organizationId: existing.organizationId,
      updatedAt: nowIso(),
    };
    const notes = [...db.notes];
    notes[index] = updated;
    db = { ...db, notes };
    db = pushActivity(db, {
      projectId: updated.projectId,
      organizationId: updated.organizationId,
      kind: "note_updated",
      title: "Note Updated",
      detail: updated.title,
      actor: updated.author,
    });
    persist(db);
    return updated;
  },

  async deleteNote(id) {
    let db = ensureDb();
    const existing = db.notes.find((row) => row.id === id);
    if (!existing) return;
    db = { ...db, notes: db.notes.filter((row) => row.id !== id) };
    db = pushActivity(db, {
      projectId: existing.projectId,
      organizationId: existing.organizationId,
      kind: "note_deleted",
      title: "Note Deleted",
      detail: existing.title,
      actor: existing.author,
    });
    persist(db);
  },

  async listActivities(projectId) {
    return ensureDb()
      .activities.filter((row) => row.projectId === projectId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getKanbanOrder(projectId) {
    const db = ensureDb();
    return (
      db.kanbanOrder[projectId] ??
      rebuildKanban(projectId, db.tasks, undefined)
    );
  },

  async addMember(projectId, member) {
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const nextMember: ProjectMember = {
      id: createId("pmem"),
      name: member.name,
      email: member.email,
      role: member.role,
      avatarInitials:
        member.avatarInitials ?? initialsFromName(member.name),
    };
    const updated = await this.updateProject(projectId, {
      members: [...project.members, nextMember],
    });
    let db = ensureDb();
    db = pushActivity(db, {
      projectId,
      organizationId: project.organizationId,
      kind: "member_added",
      title: "Member Added",
      detail: `${nextMember.name} (${nextMember.role})`,
      actor: project.owner,
    });
    persist(db);
    return updated;
  },

  async removeMember(projectId, memberId) {
    const project = await this.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const target = project.members.find((member) => member.id === memberId);
    const members = project.members.filter((member) => member.id !== memberId);
    const updated = await this.updateProject(projectId, { members });
    if (target) {
      let db = ensureDb();
      db = pushActivity(db, {
        projectId,
        organizationId: project.organizationId,
        kind: "member_removed",
        title: "Member Removed",
        detail: target.name,
        actor: project.owner,
      });
      persist(db);
    }
    return updated;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  replaceAll(db) {
    persist({ ...db, version: STORAGE_VERSION });
  },

  getDatabase() {
    return ensureDb();
  },
};
