"use client";

/**
 * Project store — list / detail / tasks / kanban / files / notes / team.
 * Snapshot is cached for useSyncExternalStore stability.
 */

import {
  MemberValidationError,
  NoteValidationError,
  ProjectValidationError,
  TaskValidationError,
  projectManagementService,
} from "./service";
import { projectRepository } from "./repository";
import type {
  KanbanColumnOrder,
  MemberDraft,
  NoteDraft,
  ProjectActivityRecord,
  ProjectDetailTab,
  ProjectDraft,
  ProjectFileRecord,
  ProjectId,
  ProjectNoteRecord,
  ProjectPriority,
  ProjectRecord,
  ProjectSortKey,
  ProjectStatus,
  ProjectViewMode,
  SortDirection,
  TaskDraft,
  TaskId,
  TaskRecord,
  TaskStatus,
} from "./types";
import {
  emptyKanbanOrder,
  emptyMemberDraft,
  emptyNoteDraft,
  emptyProjectDraft,
  emptyTaskDraft,
} from "./types";
import type {
  MemberFieldError,
  NoteFieldError,
  ProjectFieldError,
  TaskFieldError,
} from "./validation";

type Listener = () => void;

export type ProjectStoreSnapshot = {
  readonly items: readonly ProjectRecord[];
  readonly tasks: readonly TaskRecord[];
  readonly files: readonly ProjectFileRecord[];
  readonly notes: readonly ProjectNoteRecord[];
  readonly activities: readonly ProjectActivityRecord[];
  readonly kanbanOrder: KanbanColumnOrder;
  readonly organizationId: string | null;
  readonly hydrated: boolean;
  readonly loading: boolean;
  readonly detailLoading: boolean;
  readonly saving: boolean;
  readonly deleting: boolean;
  readonly error: string | null;
  readonly search: string;
  readonly statusFilter: ProjectStatus | "all";
  readonly priorityFilter: ProjectPriority | "all";
  readonly customerFilter: string;
  readonly ownerFilter: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly sortKey: ProjectSortKey;
  readonly sortDirection: SortDirection;
  readonly page: number;
  readonly pageSize: number;
  readonly viewMode: ProjectViewMode;
  readonly selectedId: ProjectId | null;
  readonly detailTab: ProjectDetailTab;
  readonly formOpen: boolean;
  readonly formMode: "create" | "edit";
  readonly editingId: ProjectId | null;
  readonly draft: ProjectDraft;
  readonly formErrors: readonly ProjectFieldError[];
  readonly deleteId: ProjectId | null;
  readonly taskFormOpen: boolean;
  readonly taskFormMode: "create" | "edit";
  readonly editingTaskId: TaskId | null;
  readonly taskDraft: TaskDraft;
  readonly taskFormErrors: readonly TaskFieldError[];
  readonly memberDraft: MemberDraft;
  readonly memberErrors: readonly MemberFieldError[];
  readonly noteDraft: NoteDraft;
  readonly noteErrors: readonly NoteFieldError[];
  readonly editingNoteId: string | null;
  readonly uploading: boolean;
};

const listeners = new Set<Listener>();

let snapshot: ProjectStoreSnapshot = {
  items: [],
  tasks: [],
  files: [],
  notes: [],
  activities: [],
  kanbanOrder: emptyKanbanOrder(),
  organizationId: null,
  hydrated: false,
  loading: false,
  detailLoading: false,
  saving: false,
  deleting: false,
  error: null,
  search: "",
  statusFilter: "all",
  priorityFilter: "all",
  customerFilter: "",
  ownerFilter: "",
  dateFrom: "",
  dateTo: "",
  sortKey: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 9,
  viewMode: "cards",
  selectedId: null,
  detailTab: "overview",
  formOpen: false,
  formMode: "create",
  editingId: null,
  draft: emptyProjectDraft(),
  formErrors: [],
  deleteId: null,
  taskFormOpen: false,
  taskFormMode: "create",
  editingTaskId: null,
  taskDraft: emptyTaskDraft(),
  taskFormErrors: [],
  memberDraft: emptyMemberDraft(),
  memberErrors: [],
  noteDraft: emptyNoteDraft(),
  noteErrors: [],
  editingNoteId: null,
  uploading: false,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function commit(partial: Partial<ProjectStoreSnapshot>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof ProjectStoreSnapshot)[]) {
    if (partial[key] !== snapshot[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  snapshot = { ...snapshot, ...partial };
  emit();
}

async function reloadList(organizationId: string | null): Promise<void> {
  if (!organizationId) {
    commit({
      items: [],
      organizationId: null,
      hydrated: true,
      loading: false,
      error: null,
    });
    return;
  }
  commit({ loading: true, organizationId, error: null });
  try {
    const items = await projectManagementService.list(organizationId);
    commit({ items, loading: false, hydrated: true, error: null });
  } catch (error) {
    commit({
      loading: false,
      hydrated: true,
      error:
        error instanceof Error ? error.message : "Failed to load projects.",
    });
  }
}

async function reloadDetail(projectId: ProjectId | null): Promise<void> {
  if (!projectId) {
    commit({
      tasks: [],
      files: [],
      notes: [],
      activities: [],
      kanbanOrder: emptyKanbanOrder(),
      detailLoading: false,
    });
    return;
  }
  commit({ detailLoading: true });
  try {
    const [tasks, files, notes, activities, kanbanOrder] = await Promise.all([
      projectManagementService.listTasks(projectId),
      projectManagementService.listFiles(projectId),
      projectManagementService.listNotes(projectId),
      projectManagementService.listActivities(projectId),
      projectManagementService.getKanbanOrder(projectId),
    ]);
    commit({
      tasks,
      files,
      notes,
      activities,
      kanbanOrder,
      detailLoading: false,
    });
  } catch (error) {
    commit({
      detailLoading: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load project details.",
    });
  }
}

export const projectStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ProjectStoreSnapshot {
    return snapshot;
  },
  async hydrate(organizationId: string | null) {
    await reloadList(organizationId);
    if (snapshot.selectedId) {
      await reloadDetail(snapshot.selectedId);
    }
  },
  async openProject(projectId: ProjectId) {
    commit({ selectedId: projectId, detailTab: "overview", error: null });
    await reloadDetail(projectId);
  },
  clearSelection() {
    commit({
      selectedId: null,
      tasks: [],
      files: [],
      notes: [],
      activities: [],
      kanbanOrder: emptyKanbanOrder(),
    });
  },
  setDetailTab(detailTab: ProjectDetailTab) {
    commit({ detailTab });
  },
  setSearch(search: string) {
    commit({ search, page: 1 });
  },
  setStatusFilter(statusFilter: ProjectStatus | "all") {
    commit({ statusFilter, page: 1 });
  },
  setPriorityFilter(priorityFilter: ProjectPriority | "all") {
    commit({ priorityFilter, page: 1 });
  },
  setCustomerFilter(customerFilter: string) {
    commit({ customerFilter, page: 1 });
  },
  setOwnerFilter(ownerFilter: string) {
    commit({ ownerFilter, page: 1 });
  },
  setDateFrom(dateFrom: string) {
    commit({ dateFrom, page: 1 });
  },
  setDateTo(dateTo: string) {
    commit({ dateTo, page: 1 });
  },
  setSort(sortKey: ProjectSortKey) {
    if (snapshot.sortKey === sortKey) {
      commit({
        sortDirection: snapshot.sortDirection === "asc" ? "desc" : "asc",
      });
      return;
    }
    commit({ sortKey, sortDirection: "asc" });
  },
  setPage(page: number) {
    commit({ page: Math.max(1, page) });
  },
  setViewMode(viewMode: ProjectViewMode) {
    commit({ viewMode });
  },
  openCreate(defaults?: Partial<ProjectDraft>) {
    commit({
      formOpen: true,
      formMode: "create",
      editingId: null,
      draft: emptyProjectDraft(defaults),
      formErrors: [],
    });
  },
  openEdit(project: ProjectRecord) {
    commit({
      formOpen: true,
      formMode: "edit",
      editingId: project.id,
      draft: {
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
      },
      formErrors: [],
    });
  },
  closeForm() {
    commit({ formOpen: false, formErrors: [], editingId: null });
  },
  patchDraft(patch: Partial<ProjectDraft>) {
    commit({ draft: { ...snapshot.draft, ...patch } });
  },
  requestDelete(deleteId: ProjectId) {
    commit({ deleteId });
  },
  cancelDelete() {
    commit({ deleteId: null });
  },
  async save(): Promise<ProjectRecord | null> {
    const organizationId = snapshot.organizationId;
    if (!organizationId) {
      commit({
        formErrors: [{ field: "form", message: "Organization is required." }],
      });
      return null;
    }
    commit({ saving: true, formErrors: [], error: null });
    try {
      const project =
        snapshot.formMode === "edit" && snapshot.editingId
          ? await projectManagementService.updateFromDraft(
              snapshot.editingId,
              snapshot.draft,
            )
          : await projectManagementService.createFromDraft(
              snapshot.draft,
              organizationId,
            );
      const items = await projectManagementService.list(organizationId);
      commit({
        items,
        saving: false,
        formOpen: false,
        editingId: null,
        selectedId: project.id,
        formErrors: [],
      });
      if (snapshot.selectedId === project.id) {
        await reloadDetail(project.id);
      }
      return project;
    } catch (error) {
      if (error instanceof ProjectValidationError) {
        commit({ saving: false, formErrors: error.errors });
        return null;
      }
      commit({
        saving: false,
        formErrors: [
          {
            field: "form",
            message:
              error instanceof Error
                ? error.message
                : "Failed to save project.",
          },
        ],
      });
      return null;
    }
  },
  async confirmDelete(): Promise<ProjectRecord | null> {
    const id = snapshot.deleteId;
    const organizationId = snapshot.organizationId;
    if (!id || !organizationId) return null;
    const removed =
      snapshot.items.find((row) => row.id === id) ?? null;
    const clearing = snapshot.selectedId === id;

    // Instant UI: close dialog and drop the row before LocalStorage I/O.
    commit({
      items: snapshot.items.filter((row) => row.id !== id),
      deleting: false,
      deleteId: null,
      selectedId: clearing ? null : snapshot.selectedId,
      ...(clearing
        ? {
            tasks: [],
            files: [],
            notes: [],
            activities: [],
            kanbanOrder: emptyKanbanOrder(),
          }
        : {}),
    });

    try {
      await projectManagementService.deleteProject(id);
      return removed;
    } catch (error) {
      await reloadList(organizationId);
      commit({
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete project.",
      });
      return null;
    }
  },
  openTaskCreate(defaults?: Partial<TaskDraft>) {
    commit({
      taskFormOpen: true,
      taskFormMode: "create",
      editingTaskId: null,
      taskDraft: emptyTaskDraft(defaults),
      taskFormErrors: [],
    });
  },
  openTaskEdit(task: TaskRecord) {
    commit({
      taskFormOpen: true,
      taskFormMode: "edit",
      editingTaskId: task.id,
      taskDraft: {
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        progress: String(task.progress),
        labels: task.labels.join(", "),
      },
      taskFormErrors: [],
    });
  },
  closeTaskForm() {
    commit({ taskFormOpen: false, taskFormErrors: [], editingTaskId: null });
  },
  patchTaskDraft(patch: Partial<TaskDraft>) {
    commit({ taskDraft: { ...snapshot.taskDraft, ...patch } });
  },
  async saveTask(): Promise<TaskRecord | null> {
    const organizationId = snapshot.organizationId;
    const projectId = snapshot.selectedId;
    if (!organizationId || !projectId) {
      commit({
        taskFormErrors: [
          { field: "form", message: "Open a project before saving tasks." },
        ],
      });
      return null;
    }
    commit({ saving: true, taskFormErrors: [] });
    try {
      const task =
        snapshot.taskFormMode === "edit" && snapshot.editingTaskId
          ? await projectManagementService.updateTaskFromDraft(
              snapshot.editingTaskId,
              snapshot.taskDraft,
            )
          : await projectManagementService.createTaskFromDraft(
              snapshot.taskDraft,
              projectId,
              organizationId,
            );
      await reloadDetail(projectId);
      const items = await projectManagementService.list(organizationId);
      commit({
        items,
        saving: false,
        taskFormOpen: false,
        editingTaskId: null,
        taskFormErrors: [],
      });
      return task;
    } catch (error) {
      if (error instanceof TaskValidationError) {
        commit({ saving: false, taskFormErrors: error.errors });
        return null;
      }
      commit({
        saving: false,
        taskFormErrors: [
          {
            field: "form",
            message:
              error instanceof Error ? error.message : "Failed to save task.",
          },
        ],
      });
      return null;
    }
  },
  async completeTask(taskId: TaskId) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.completeTask(taskId);
    await reloadDetail(projectId);
    if (snapshot.organizationId) {
      const items = await projectManagementService.list(snapshot.organizationId);
      commit({ items });
    }
  },
  async deleteTask(taskId: TaskId) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.deleteTask(taskId);
    await reloadDetail(projectId);
    if (snapshot.organizationId) {
      const items = await projectManagementService.list(snapshot.organizationId);
      commit({ items });
    }
  },
  async moveTask(taskId: TaskId, toStatus: TaskStatus, toIndex: number) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.moveTask(
      projectId,
      taskId,
      toStatus,
      toIndex,
    );
    await reloadDetail(projectId);
    if (snapshot.organizationId) {
      const items = await projectManagementService.list(snapshot.organizationId);
      commit({ items });
    }
  },
  patchMemberDraft(patch: Partial<MemberDraft>) {
    commit({ memberDraft: { ...snapshot.memberDraft, ...patch } });
  },
  async addMember(): Promise<boolean> {
    const projectId = snapshot.selectedId;
    if (!projectId) return false;
    commit({ saving: true, memberErrors: [] });
    try {
      await projectManagementService.addMemberFromDraft(
        projectId,
        snapshot.memberDraft,
      );
      await reloadDetail(projectId);
      if (snapshot.organizationId) {
        const items = await projectManagementService.list(
          snapshot.organizationId,
        );
        commit({ items });
      }
      commit({
        saving: false,
        memberDraft: emptyMemberDraft(),
        memberErrors: [],
      });
      return true;
    } catch (error) {
      if (error instanceof MemberValidationError) {
        commit({ saving: false, memberErrors: error.errors });
        return false;
      }
      commit({
        saving: false,
        memberErrors: [
          {
            field: "form",
            message:
              error instanceof Error
                ? error.message
                : "Failed to add member.",
          },
        ],
      });
      return false;
    }
  },
  async removeMember(memberId: string) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.removeMember(projectId, memberId);
    await reloadDetail(projectId);
    if (snapshot.organizationId) {
      const items = await projectManagementService.list(snapshot.organizationId);
      commit({ items });
    }
  },
  patchNoteDraft(patch: Partial<NoteDraft>) {
    commit({ noteDraft: { ...snapshot.noteDraft, ...patch } });
  },
  editNote(note: ProjectNoteRecord) {
    commit({
      editingNoteId: note.id,
      noteDraft: {
        title: note.title,
        body: note.body,
        author: note.author,
      },
      noteErrors: [],
    });
  },
  cancelNoteEdit() {
    commit({
      editingNoteId: null,
      noteDraft: emptyNoteDraft(),
      noteErrors: [],
    });
  },
  async saveNote(): Promise<boolean> {
    const organizationId = snapshot.organizationId;
    const projectId = snapshot.selectedId;
    if (!organizationId || !projectId) return false;
    commit({ saving: true, noteErrors: [] });
    try {
      if (snapshot.editingNoteId) {
        await projectManagementService.updateNoteFromDraft(
          snapshot.editingNoteId,
          snapshot.noteDraft,
        );
      } else {
        await projectManagementService.createNoteFromDraft(
          snapshot.noteDraft,
          projectId,
          organizationId,
        );
      }
      await reloadDetail(projectId);
      commit({
        saving: false,
        editingNoteId: null,
        noteDraft: emptyNoteDraft(),
        noteErrors: [],
      });
      return true;
    } catch (error) {
      if (error instanceof NoteValidationError) {
        commit({ saving: false, noteErrors: error.errors });
        return false;
      }
      commit({
        saving: false,
        noteErrors: [
          {
            field: "form",
            message:
              error instanceof Error ? error.message : "Failed to save note.",
          },
        ],
      });
      return false;
    }
  },
  async deleteNote(noteId: string) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.deleteNote(noteId);
    await reloadDetail(projectId);
  },
  async uploadFiles(fileList: FileList | File[], uploadedBy: string) {
    const organizationId = snapshot.organizationId;
    const projectId = snapshot.selectedId;
    if (!organizationId || !projectId) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;
    commit({ uploading: true, error: null });
    try {
      for (const file of files) {
        await projectManagementService.uploadFile(
          projectId,
          organizationId,
          file,
          uploadedBy,
        );
      }
      await reloadDetail(projectId);
      commit({ uploading: false });
    } catch (error) {
      commit({
        uploading: false,
        error:
          error instanceof Error ? error.message : "Failed to upload file.",
      });
    }
  },
  async deleteFile(fileId: string) {
    const projectId = snapshot.selectedId;
    if (!projectId) return;
    await projectManagementService.deleteFile(fileId);
    await reloadDetail(projectId);
  },
  async updateProjectSettings(patch: Partial<ProjectRecord>) {
    const projectId = snapshot.selectedId;
    const organizationId = snapshot.organizationId;
    if (!projectId || !organizationId) return null;
    commit({ saving: true });
    try {
      const { projectRepository } = await import("./repository");
      const updated = await projectRepository.updateProject(projectId, patch);
      const items = await projectManagementService.list(organizationId);
      await reloadDetail(projectId);
      commit({ items, saving: false });
      return updated;
    } catch (error) {
      commit({
        saving: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update project settings.",
      });
      return null;
    }
  },
};

projectManagementService.subscribe(() => {
  const organizationId = snapshot.organizationId;
  if (
    !organizationId ||
    snapshot.loading ||
    snapshot.saving ||
    snapshot.deleting ||
    snapshot.uploading ||
    snapshot.detailLoading
  ) {
    return;
  }
  // Cheap identity check against in-memory repo cache — no LocalStorage read.
  const items = projectRepository
    .getDatabase()
    .projects.filter((row) => row.organizationId === organizationId);
  const same =
    items.length === snapshot.items.length &&
    items.every(
      (row, index) =>
        row.id === snapshot.items[index]?.id &&
        row.updatedAt === snapshot.items[index]?.updatedAt,
    );
  if (!same) commit({ items });
});
