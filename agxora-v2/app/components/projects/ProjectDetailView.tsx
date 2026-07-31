"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useRef, type JSX } from "react";
import { formatDisplayDate, formatDisplayDateTime } from "../../lib/i18n";
import { useToast } from "../../lib/backend/hooks";
import {
  MEMBER_ROLES,
  formatMoney,
  memberErrorMap,
  noteErrorMap,
  projectStore,
  roleLabel,
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

const TABS: { id: ProjectDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
  { id: "team", label: "Team" },
  { id: "settings", label: "Settings" },
];

export function ProjectDetailView({
  projectId,
}: {
  readonly projectId: string;
}): JSX.Element {
  const router = useRouter();
  const state = useProjectStore();
  const project = useSelectedProject();

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
        title="Project not found"
        description="This project may have been deleted or is unavailable for the current organization."
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
              ← Back to projects
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
                  {project.customer} · Owner {project.owner}
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
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => projectStore.requestDelete(project.id)}
            >
              Delete
            </Button>
          </div>
        </div>
        <ProgressBar value={project.progress} color={project.color} />
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Project detail sections"
        >
          {TABS.map((tab) => (
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
  if (!project) {
    return (
      <EmptyState
        title="Missing project"
        description="Select a project to view its overview."
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
          Overview
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--agx-text-muted, #94a3b8)" }}
        >
          {project.description || "No description provided."}
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Meta label="Budget" value={formatMoney(project.budget, project.currency)} />
          <Meta
            label="Spent"
            value={formatMoney(project.spent, project.currency)}
          />
          <Meta
            label="Start"
            value={project.startDate ? formatDisplayDate(project.startDate) : "—"}
          />
          <Meta
            label="Due"
            value={project.dueDate ? formatDisplayDate(project.dueDate) : "—"}
          />
          <Meta label="Open tasks" value={String(openTasks)} />
          <Meta label="Completed tasks" value={String(doneTasks)} />
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Task management
        </h2>
        <Button
          size="sm"
          variant="primary"
          onClick={() => projectStore.openTaskCreate()}
        >
          New task
        </Button>
      </div>

      <KanbanBoard />

      <Card hover={false} padding="0" className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Actions</th>
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
                      Edit
                    </Button>
                    {task.status !== "done" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void projectStore.completeTask(task.id).then(() =>
                            toast.success("Task completed", task.title),
                          );
                        }}
                      >
                        Complete
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        void projectStore.deleteTask(task.id).then(() =>
                          toast.success("Task deleted", task.title),
                        );
                      }}
                    >
                      Delete
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
              title="No tasks yet"
              description="Create tasks, assign owners, and track progress on the board."
              actionLabel="Create task"
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            File manager
          </h2>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            Upload images, PDFs, and office documents. Metadata persists locally.
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
                  toast.success("Files uploaded", `${files.length} file(s)`),
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
            Upload
          </Button>
        </div>
      </div>

      {state.files.length === 0 ? (
        <EmptyState
          title="No files uploaded"
          description="Add project artifacts for the team to review and preview."
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
                    Preview
                  </Button>
                ) : (
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    Metadata only
                  </span>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    void projectStore.deleteFile(file.id).then(() =>
                      toast.success("File deleted", file.name),
                    );
                  }}
                >
                  Delete
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
  const errors = noteErrorMap(state.noteErrors);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {state.editingNoteId ? "Edit note" : "New note"}
        </h2>
        <FormField label="Title" error={errors.title}>
          <FormInput
            value={state.noteDraft.title}
            onChange={(e) => projectStore.patchNoteDraft({ title: e.target.value })}
          />
        </FormField>
        <FormField label="Author" error={errors.author}>
          <FormInput
            value={state.noteDraft.author}
            onChange={(e) =>
              projectStore.patchNoteDraft({ author: e.target.value })
            }
          />
        </FormField>
        <FormField label="Body" error={errors.body}>
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
              Cancel
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void projectStore.saveNote().then((ok) => {
                if (ok) toast.success("Note saved");
              });
            }}
          >
            Save note
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        {state.notes.length === 0 ? (
          <EmptyState
            title="No notes yet"
            description="Capture decisions, meeting outcomes, and delivery context."
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void projectStore.deleteNote(note.id)}
                  >
                    Delete
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
  return (
    <Card hover={false} className="space-y-3" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Activity feed
      </h2>
      {state.activities.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Project events will appear here as the team works."
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
  const errors = memberErrorMap(state.memberErrors);

  if (!project) {
    return (
      <EmptyState
        title="Missing project"
        description="Select a project to manage team members."
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
          Assign member
        </h2>
        <FormField label="Name" error={errors.name}>
          <FormInput
            value={state.memberDraft.name}
            onChange={(e) =>
              projectStore.patchMemberDraft({ name: e.target.value })
            }
          />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <FormInput
            type="email"
            value={state.memberDraft.email}
            onChange={(e) =>
              projectStore.patchMemberDraft({ email: e.target.value })
            }
          />
        </FormField>
        <FormField label="Role" error={errors.role}>
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
                {roleLabel(role)}
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
              if (ok) toast.success("Member added");
            });
          }}
        >
          Add member
        </Button>
      </Card>
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Team
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
                    {roleLabel(member.role)}
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
                  Remove
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
  const spent = useMemo(
    () => (project ? String(project.spent) : "0"),
    [project],
  );

  if (!project) {
    return (
      <EmptyState
        title="Missing project"
        description="Select a project to manage settings."
      />
    );
  }

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Project settings
      </h2>
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Update budget burn and archive status. Full field edits use the Edit
        dialog.
      </p>
      <FormField label="Spent amount">
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
                if (updated) toast.success("Settings saved", updated.name);
              });
          }}
        >
          Save spent
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void projectStore
              .updateProjectSettings({ status: "archived" })
              .then((updated) => {
                if (updated) toast.success("Project archived", updated.name);
              });
          }}
        >
          Archive project
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => projectStore.openEdit(project)}
        >
          Edit all fields
        </Button>
      </div>
    </Card>
  );
}
