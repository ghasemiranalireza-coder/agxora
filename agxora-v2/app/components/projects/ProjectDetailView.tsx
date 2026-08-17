"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useRef, type JSX } from "react";
import { formatDisplayDate, formatDisplayDateTime, useT } from "../../lib/i18n";
import { useToast } from "../../lib/backend/hooks";
import {
  MEMBER_ROLES,
  formatMoney,
  memberErrorMap,
  noteErrorMap,
  projectStore,
  useProjectStore,
  useSelectedProject,
  type ProjectDetailTab,
} from "../../lib/projects";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  FormInput,
  FormSelect,
  FormTextArea,
  Skeleton,
  SkeletonCard,
} from "../ui";
import {
  ProgressBar,
  ProjectPriorityBadge,
  ProjectStatusBadge,
  TaskStatusBadge,
} from "./ProjectBadges";
import { TaskFormDialog } from "./TaskFormDialog";

const KanbanBoard = dynamic(
  () => import("./KanbanBoard").then((mod) => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
  },
);

const TimelineView = dynamic(
  () => import("./TimelineView").then((mod) => mod.TimelineView),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
  },
);

const TAB_IDS: readonly ProjectDetailTab[] = [
  "overview",
  "tasks",
  "files",
  "notes",
  "activity",
  "team",
  "settings",
];

export function ProjectDetailView({
  projectId,
}: {
  readonly projectId: string;
}): JSX.Element {
  const router = useRouter();
  const state = useProjectStore();
  const project = useSelectedProject();
  const t = useT();

  const tabs = useMemo(
    () =>
      TAB_IDS.map((id) => ({
        id,
        label: t(`projects.detail.tabs.${id}`),
      })),
    [t],
  );

  const ready = state.hydrated && state.selectedId === projectId;

  if (!state.hydrated || state.detailLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (ready && !project) {
    return (
      <ErrorState
        title={t("projects.detail.notFoundTitle")}
        description={t("projects.detail.notFoundDescription")}
        onRetry={() => router.push("/dashboard/projects")}
      />
    );
  }

  if (!project) {
    return (
      <div className="space-y-3">
        <Skeleton height={28} width="45%" />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card hover={false} className="space-y-4" padding="22px">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                projectStore.clearSelection();
                router.push("/dashboard/projects");
              }}
            >
              {t("projects.detail.backToProjects")}
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold"
                style={{
                  background: `${project.color}22`,
                  color: project.color,
                  border: `1px solid ${project.color}55`,
                }}
                aria-hidden="true"
              >
                {project.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h1
                  className="text-2xl font-semibold tracking-tight"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {project.name}
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {t("projects.detail.ownerMeta", {
                    customer: project.customer,
                    owner: project.owner,
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProjectStatusBadge status={project.status} />
            <ProjectPriorityBadge priority={project.priority} />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => projectStore.openEdit(project)}
            >
              {t("projects.detail.edit")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => projectStore.requestDelete(project.id)}
            >
              {t("projects.detail.delete")}
            </Button>
          </div>
        </div>
        <ProgressBar value={project.progress} color={project.color} />
        <nav
          className="flex flex-wrap gap-2"
          aria-label={t("projects.detail.sectionsAria")}
        >
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={state.detailTab === tab.id ? "primary" : "ghost"}
              aria-current={state.detailTab === tab.id ? "page" : undefined}
              onClick={() => projectStore.setDetailTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </nav>
      </Card>

      {state.detailTab === "overview" ? <OverviewTab /> : null}
      {state.detailTab === "tasks" ? <TasksTab /> : null}
      {state.detailTab === "files" ? <FilesTab /> : null}
      {state.detailTab === "notes" ? <NotesTab /> : null}
      {state.detailTab === "activity" ? <ActivityTab /> : null}
      {state.detailTab === "team" ? <TeamTab /> : null}
      {state.detailTab === "settings" ? <SettingsTab /> : null}

      <TaskFormDialog />
    </div>
  );
}

function OverviewTab(): JSX.Element {
  const project = useSelectedProject();
  const state = useProjectStore();
  const t = useT();

  if (!project) {
    return (
      <EmptyState
        title={t("projects.overview.missingTitle")}
        description={t("projects.overview.missingDescription")}
      />
    );
  }

  const openTasks = state.tasks.filter((task) => task.status !== "done").length;
  const doneTasks = state.tasks.filter((task) => task.status === "done").length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.overview.title")}
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {project.description || t("projects.overview.noDescription")}
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Meta
            label={t("projects.overview.budget")}
            value={formatMoney(project.budget, project.currency)}
          />
          <Meta
            label={t("projects.overview.spent")}
            value={formatMoney(project.spent, project.currency)}
          />
          <Meta
            label={t("projects.overview.start")}
            value={project.startDate ? formatDisplayDate(project.startDate) : "—"}
          />
          <Meta
            label={t("projects.overview.due")}
            value={project.dueDate ? formatDisplayDate(project.dueDate) : "—"}
          />
          <Meta label={t("projects.overview.openTasks")} value={String(openTasks)} />
          <Meta
            label={t("projects.overview.completedTasks")}
            value={String(doneTasks)}
          />
        </dl>
        {project.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border px-2.5 py-0.5 text-[11px]"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  color: "var(--agx-text-muted, #94a3b8)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </Card>
      <TimelineView />
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): JSX.Element {
  return (
    <div>
      <dt
        className="text-[11px] uppercase tracking-[0.12em]"
        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
      >
        {label}
      </dt>
      <dd style={{ color: "var(--agx-text, #f8fafc)" }}>{value}</dd>
    </div>
  );
}

function TasksTab(): JSX.Element {
  const state = useProjectStore();
  const toast = useToast();
  const t = useT();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.tasks.title")}
        </h2>
        <Button
          size="sm"
          variant="primary"
          onClick={() => projectStore.openTaskCreate()}
        >
          {t("projects.tasks.newTask")}
        </Button>
      </div>

      <KanbanBoard />

      <Card hover={false} padding="0" className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              <th className="px-4 py-3">{t("projects.tasks.tableTitle")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tableAssignee")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tablePriority")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tableStatus")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tableDue")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tableProgress")}</th>
              <th className="px-4 py-3">{t("projects.tasks.tableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {state.tasks.map((task) => (
              <tr
                key={task.id}
                style={{
                  borderTop:
                    "1px solid var(--agx-card-border, rgba(255,255,255,0.06))",
                  color: "var(--agx-text, #f8fafc)",
                }}
              >
                <td className="px-4 py-3 font-medium">{task.title}</td>
                <td className="px-4 py-3">{task.assignee || "—"}</td>
                <td className="px-4 py-3">
                  <ProjectPriorityBadge priority={task.priority} />
                </td>
                <td className="px-4 py-3">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  {task.dueDate ? formatDisplayDate(task.dueDate) : "—"}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <ProgressBar value={task.progress} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => projectStore.openTaskEdit(task)}
                    >
                      {t("projects.tasks.edit")}
                    </Button>
                    {task.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void projectStore.completeTask(task.id).then(() =>
                            toast.success(
                              t("projects.toasts.taskCompleted"),
                              task.title,
                            ),
                          );
                        }}
                      >
                        {t("projects.tasks.complete")}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        void projectStore.deleteTask(task.id).then(() =>
                          toast.success(
                            t("projects.toasts.taskDeleted"),
                            task.title,
                          ),
                        );
                      }}
                    >
                      {t("projects.tasks.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {state.tasks.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t("projects.tasks.emptyTitle")}
              description={t("projects.tasks.emptyDescription")}
              actionLabel={t("projects.tasks.createTask")}
              onAction={() => projectStore.openTaskCreate()}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function FilesTab(): JSX.Element {
  const state = useProjectStore();
  const project = useSelectedProject();
  const toast = useToast();
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("projects.files.title")}
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("projects.files.description")}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(event) => {
              const files = event.target.files;
              if (!files?.length) return;
              void projectStore
                .uploadFiles(files, project?.owner ?? "System")
                .then(() =>
                  toast.success(
                    t("projects.toasts.filesUploaded"),
                    t("projects.toasts.filesUploadedDetail", {
                      count: files.length,
                    }),
                  ),
                );
              event.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="primary"
            loading={state.uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("projects.files.upload")}
          </Button>
        </div>
      </div>

      {state.files.length === 0 ? (
        <EmptyState
          title={t("projects.files.emptyTitle")}
          description={t("projects.files.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {state.files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
              }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {file.name}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {file.mimeType} · {(file.size / 1024).toFixed(1)} KB ·{" "}
                  {formatDisplayDateTime(file.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                {file.dataUrl ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(file.dataUrl, "_blank", "noopener,noreferrer")}
                  >
                    {t("projects.files.preview")}
                  </Button>
                ) : (
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {t("projects.files.metadataOnly")}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    void projectStore.deleteFile(file.id).then(() =>
                      toast.success(t("projects.toasts.fileDeleted"), file.name),
                    );
                  }}
                >
                  {t("projects.files.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotesTab(): JSX.Element {
  const state = useProjectStore();
  const toast = useToast();
  const t = useT();
  const errors = noteErrorMap(state.noteErrors);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {state.editingNoteId
            ? t("projects.notes.editTitle")
            : t("projects.notes.newTitle")}
        </h2>
        <FormField label={t("projects.notes.title")} error={errors.title}>
          <FormInput
            value={state.noteDraft.title}
            onChange={(e) => projectStore.patchNoteDraft({ title: e.target.value })}
          />
        </FormField>
        <FormField label={t("projects.notes.author")} error={errors.author}>
          <FormInput
            value={state.noteDraft.author}
            onChange={(e) =>
              projectStore.patchNoteDraft({ author: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("projects.notes.body")} error={errors.body}>
          <FormTextArea
            rows={8}
            value={state.noteDraft.body}
            onChange={(e) => projectStore.patchNoteDraft({ body: e.target.value })}
          />
        </FormField>
        <div className="flex gap-2">
          {state.editingNoteId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => projectStore.cancelNoteEdit()}
            >
              {t("projects.notes.cancel")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void projectStore.saveNote().then((ok) => {
                if (ok) toast.success(t("projects.toasts.noteSaved"));
              });
            }}
          >
            {t("projects.notes.saveNote")}
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        {state.notes.length === 0 ? (
          <EmptyState
            title={t("projects.notes.emptyTitle")}
            description={t("projects.notes.emptyDescription")}
          />
        ) : (
          state.notes.map((note) => (
            <Card key={note.id} hover={false} className="space-y-2" padding="16px">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {note.title}
                  </h3>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {note.author} · {formatDisplayDateTime(note.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => projectStore.editNote(note)}
                  >
                    {t("projects.notes.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void projectStore.deleteNote(note.id)}
                  >
                    {t("projects.notes.delete")}
                  </Button>
                </div>
              </div>
              <p
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {note.body}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function ActivityTab(): JSX.Element {
  const state = useProjectStore();
  const t = useT();

  return (
    <Card hover={false} className="space-y-3" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("projects.activity.title")}
      </h2>
      {state.activities.length === 0 ? (
        <EmptyState
          title={t("projects.activity.emptyTitle")}
          description={t("projects.activity.emptyDescription")}
        />
      ) : (
        <ol className="space-y-2">
          {state.activities.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border px-3 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--agx-text, #f8fafc)" }}
                >
                  {item.title}
                </p>
                <time
                  className="text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  dateTime={item.createdAt}
                >
                  {formatDisplayDateTime(item.createdAt)}
                </time>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {item.detail} · {item.actor}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function TeamTab(): JSX.Element {
  const state = useProjectStore();
  const project = useSelectedProject();
  const toast = useToast();
  const t = useT();
  const errors = memberErrorMap(state.memberErrors);

  if (!project) {
    return (
      <EmptyState
        title={t("projects.team.missingTitle")}
        description={t("projects.team.missingDescription")}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.team.assignTitle")}
        </h2>
        <FormField label={t("projects.team.name")} error={errors.name}>
          <FormInput
            value={state.memberDraft.name}
            onChange={(e) =>
              projectStore.patchMemberDraft({ name: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("projects.team.email")} error={errors.email}>
          <FormInput
            type="email"
            value={state.memberDraft.email}
            onChange={(e) =>
              projectStore.patchMemberDraft({ email: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("projects.team.role")} error={errors.role}>
          <FormSelect
            value={state.memberDraft.role}
            onChange={(e) =>
              projectStore.patchMemberDraft({
                role: e.target.value as typeof state.memberDraft.role,
              })
            }
          >
            {MEMBER_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`projects.role.${role}`)}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <Button
          size="sm"
          variant="primary"
          loading={state.saving}
          onClick={() => {
            void projectStore.addMember().then((ok) => {
              if (ok) toast.success(t("projects.toasts.memberAdded"));
            });
          }}
        >
          {t("projects.team.addMember")}
        </Button>
      </Card>
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("projects.team.teamTitle")}
        </h2>
        <ul className="space-y-2">
          {project.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(34,211,238,0.12)",
                    color: "var(--agx-accent, #22d3ee)",
                  }}
                >
                  {member.avatarInitials}
                </span>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {member.name}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {t(`projects.role.${member.role}`)}
                    {member.email ? ` · ${member.email}` : ""}
                  </p>
                </div>
              </div>
              {member.role !== "owner" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void projectStore.removeMember(member.id)}
                >
                  {t("projects.team.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SettingsTab(): JSX.Element {
  const project = useSelectedProject();
  const state = useProjectStore();
  const toast = useToast();
  const t = useT();
  const spent = useMemo(
    () => (project ? String(project.spent) : "0"),
    [project],
  );

  if (!project) {
    return (
      <EmptyState
        title={t("projects.settings.missingTitle")}
        description={t("projects.settings.missingDescription")}
      />
    );
  }

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("projects.settings.title")}
      </h2>
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("projects.settings.description")}
      </p>
      <FormField label={t("projects.settings.spentAmount")}>
        <FormInput
          defaultValue={spent}
          inputMode="decimal"
          id="project-spent"
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={state.saving}
          onClick={() => {
            const input = document.getElementById(
              "project-spent",
            ) as HTMLInputElement | null;
            const value = Number(input?.value ?? "0");
            void projectStore
              .updateProjectSettings({
                spent: Number.isFinite(value) ? value : 0,
              })
              .then((updated) => {
                if (updated)
                  toast.success(t("projects.toasts.settingsSaved"), updated.name);
              });
          }}
        >
          {t("projects.settings.saveSpent")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void projectStore
              .updateProjectSettings({ status: "archived" })
              .then((updated) => {
                if (updated)
                  toast.success(t("projects.toasts.projectArchived"), updated.name);
              });
          }}
        >
          {t("projects.settings.archiveProject")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => projectStore.openEdit(project)}
        >
          {t("projects.settings.editAllFields")}
        </Button>
      </div>
    </Card>
  );
}
