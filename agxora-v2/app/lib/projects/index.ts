export type {
  ProjectActivityKind,
  ProjectActivityRecord,
  ProjectCurrency,
  ProjectDetailTab,
  ProjectDraft,
  ProjectFileRecord,
  ProjectId,
  ProjectIcon,
  ProjectMember,
  ProjectMemberRole,
  ProjectMilestone,
  ProjectNoteRecord,
  ProjectPriority,
  ProjectRecord,
  ProjectSortKey,
  ProjectStatus,
  ProjectViewMode,
  SortDirection,
  TaskDraft,
  TaskId,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  MemberDraft,
  NoteDraft,
  KanbanColumnOrder,
} from "./types";

export {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_CURRENCIES,
  PROJECT_COLORS,
  PROJECT_ICONS,
  TASK_STATUSES,
  TASK_PRIORITIES,
  MEMBER_ROLES,
  emptyProjectDraft,
  emptyTaskDraft,
  emptyMemberDraft,
  emptyNoteDraft,
  draftFromProject,
  draftFromTask,
  parseTags,
  statusLabel,
  taskStatusLabel,
  priorityLabel,
  roleLabel,
} from "./types";

export {
  validateProjectDraft,
  validateTaskDraft,
  projectErrorMap,
  taskErrorMap,
  memberErrorMap,
  noteErrorMap,
} from "./validation";

export { projectRepository, PROJECTS_STORAGE_KEY } from "./repository";
export {
  projectManagementService,
  ProjectValidationError,
  TaskValidationError,
} from "./service";
export { projectStore } from "./store";
export type { ProjectStoreSnapshot } from "./store";
export {
  useProjectStore,
  useProjectStoreSelector,
  useFilteredProjects,
  useSelectedProject,
  useProjectAnalytics,
  useProjectTasks,
  useOrgTasks,
  shallowEqualRecord,
  selectProjectFormSlice,
  selectProjectDeleteSlice,
  selectProjectListChrome,
  selectProjectSortSlice,
  selectHydrated,
  selectItemsRevision,
  selectPortfolioCurrency,
} from "./hooks";
export { computeProjectAnalytics, formatMoney } from "./analytics";
export type { ProjectAnalytics } from "./analytics";
