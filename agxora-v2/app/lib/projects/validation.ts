/**
 * Project / task form validation — reusable, UI-agnostic.
 */

import type {
  MemberDraft,
  NoteDraft,
  ProjectCurrency,
  ProjectDraft,
  ProjectIcon,
  ProjectMember,
  ProjectPriority,
  ProjectStatus,
  TaskDraft,
  TaskPriority,
  TaskStatus,
} from "./types";
import {
  MEMBER_ROLES,
  PROJECT_CURRENCIES,
  PROJECT_ICONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  initialsFromName,
  parseTags,
} from "./types";

export type ProjectFieldError = {
  readonly field: keyof ProjectDraft | "form";
  readonly message: string;
};

export type TaskFieldError = {
  readonly field: keyof TaskDraft | "form";
  readonly message: string;
};

export type MemberFieldError = {
  readonly field: keyof MemberDraft | "form";
  readonly message: string;
};

export type NoteFieldError = {
  readonly field: keyof NoteDraft | "form";
  readonly message: string;
};

export type ValidatedProjectPayload = {
  readonly name: string;
  readonly description: string;
  readonly customer: string;
  readonly owner: string;
  readonly priority: ProjectPriority;
  readonly status: ProjectStatus;
  readonly budget: number;
  readonly currency: ProjectCurrency;
  readonly startDate: string;
  readonly dueDate: string;
  readonly color: string;
  readonly icon: ProjectIcon;
  readonly tags: readonly string[];
};

export type ValidatedTaskPayload = {
  readonly title: string;
  readonly description: string;
  readonly assignee: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly dueDate: string;
  readonly progress: number;
  readonly labels: readonly string[];
};

export type ProjectValidationResult =
  | { readonly ok: true; readonly value: ValidatedProjectPayload }
  | { readonly ok: false; readonly errors: readonly ProjectFieldError[] };

export type TaskValidationResult =
  | { readonly ok: true; readonly value: ValidatedTaskPayload }
  | { readonly ok: false; readonly errors: readonly TaskFieldError[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

export function validateProjectDraft(
  draft: ProjectDraft,
): ProjectValidationResult {
  const errors: ProjectFieldError[] = [];

  const name = draft.name.trim();
  const description = draft.description.trim();
  const customer = draft.customer.trim();
  const owner = draft.owner.trim();
  const priority = draft.priority;
  const status = draft.status;
  const currency = draft.currency;
  const startDate = draft.startDate.trim();
  const dueDate = draft.dueDate.trim();
  const color = draft.color.trim();
  const icon = draft.icon;
  const tags = parseTags(draft.tags);
  const budgetRaw = draft.budget.trim().replace(",", ".");
  const budget = budgetRaw === "" ? 0 : Number(budgetRaw);

  if (!name) {
    errors.push({ field: "name", message: "projects.validation.nameRequired" });
  } else if (name.length < 2) {
    errors.push({
      field: "name",
      message: "projects.validation.nameMin",
    });
  }
  if (!customer) {
    errors.push({ field: "customer", message: "projects.validation.customerRequired" });
  }
  if (!owner) {
    errors.push({ field: "owner", message: "projects.validation.ownerRequired" });
  }
  if (!PROJECT_PRIORITIES.includes(priority)) {
    errors.push({ field: "priority", message: "projects.validation.priorityInvalid" });
  }
  if (!PROJECT_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "projects.validation.statusInvalid" });
  }
  if (!PROJECT_CURRENCIES.includes(currency)) {
    errors.push({ field: "currency", message: "projects.validation.currencyInvalid" });
  }
  if (!Number.isFinite(budget) || budget < 0) {
    errors.push({
      field: "budget",
      message: "projects.validation.budgetInvalid",
    });
  }
  if (!startDate) {
    errors.push({ field: "startDate", message: "projects.validation.startDateRequired" });
  } else if (!isValidDate(startDate)) {
    errors.push({ field: "startDate", message: "projects.validation.startDateInvalid" });
  }
  if (dueDate && !isValidDate(dueDate)) {
    errors.push({ field: "dueDate", message: "projects.validation.dueDateInvalid" });
  }
  if (startDate && dueDate && isValidDate(startDate) && isValidDate(dueDate)) {
    if (dueDate < startDate) {
      errors.push({
        field: "dueDate",
        message: "projects.validation.dueDateOrder",
      });
    }
  }
  if (!HEX_COLOR_RE.test(color)) {
    errors.push({ field: "color", message: "projects.validation.colorInvalid" });
  }
  if (!PROJECT_ICONS.includes(icon)) {
    errors.push({ field: "icon", message: "projects.validation.iconInvalid" });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      description,
      customer,
      owner,
      priority,
      status,
      budget,
      currency,
      startDate,
      dueDate,
      color,
      icon,
      tags,
    },
  };
}

export function validateTaskDraft(draft: TaskDraft): TaskValidationResult {
  const errors: TaskFieldError[] = [];

  const title = draft.title.trim();
  const description = draft.description.trim();
  const assignee = draft.assignee.trim();
  const priority = draft.priority;
  const status = draft.status;
  const dueDate = draft.dueDate.trim();
  const labels = parseTags(draft.labels);
  const progressRaw = draft.progress.trim();
  const progress = progressRaw === "" ? 0 : Number(progressRaw);

  if (!title) {
    errors.push({ field: "title", message: "projects.validation.taskTitleRequired" });
  }
  if (!TASK_PRIORITIES.includes(priority)) {
    errors.push({ field: "priority", message: "projects.validation.priorityInvalid" });
  }
  if (!TASK_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "projects.validation.statusInvalid" });
  }
  if (dueDate && !isValidDate(dueDate)) {
    errors.push({ field: "dueDate", message: "projects.validation.dueDateInvalid" });
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    errors.push({
      field: "progress",
      message: "projects.validation.progressRange",
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      description,
      assignee,
      priority,
      status,
      dueDate,
      progress: Math.round(progress),
      labels,
    },
  };
}

export function validateMemberDraft(draft: MemberDraft):
  | { readonly ok: true; readonly value: ProjectMember }
  | { readonly ok: false; readonly errors: readonly MemberFieldError[] } {
  const errors: MemberFieldError[] = [];
  const name = draft.name.trim();
  const email = draft.email.trim().toLowerCase();
  const role = draft.role;

  if (!name) {
    errors.push({ field: "name", message: "projects.validation.memberNameRequired" });
  }
  if (!email) {
    errors.push({ field: "email", message: "projects.validation.emailRequired" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "projects.validation.emailInvalid" });
  }
  if (!MEMBER_ROLES.includes(role)) {
    errors.push({ field: "role", message: "projects.validation.roleInvalid" });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      id: "",
      name,
      email,
      role,
      avatarInitials: initialsFromName(name),
    },
  };
}

export function validateNoteDraft(draft: NoteDraft):
  | {
      readonly ok: true;
      readonly value: { title: string; body: string; author: string };
    }
  | { readonly ok: false; readonly errors: readonly NoteFieldError[] } {
  const errors: NoteFieldError[] = [];
  const title = draft.title.trim();
  const body = draft.body.trim();
  const author = draft.author.trim();

  if (!title) {
    errors.push({ field: "title", message: "projects.validation.noteTitleRequired" });
  }
  if (!body) {
    errors.push({ field: "body", message: "projects.validation.noteBodyRequired" });
  }
  if (!author) {
    errors.push({ field: "author", message: "projects.validation.authorRequired" });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title, body, author } };
}

export function projectErrorMap(
  errors: readonly ProjectFieldError[],
): Partial<Record<keyof ProjectDraft | "form", string>> {
  const map: Partial<Record<keyof ProjectDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}

export function taskErrorMap(
  errors: readonly TaskFieldError[],
): Partial<Record<keyof TaskDraft | "form", string>> {
  const map: Partial<Record<keyof TaskDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}

export function memberErrorMap(
  errors: readonly MemberFieldError[],
): Partial<Record<keyof MemberDraft | "form", string>> {
  const map: Partial<Record<keyof MemberDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}

export function noteErrorMap(
  errors: readonly NoteFieldError[],
): Partial<Record<keyof NoteDraft | "form", string>> {
  const map: Partial<Record<keyof NoteDraft | "form", string>> = {};
  for (const error of errors) {
    if (!map[error.field]) map[error.field] = error.message;
  }
  return map;
}
