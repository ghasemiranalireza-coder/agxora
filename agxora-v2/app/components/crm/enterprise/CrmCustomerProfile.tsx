"use client";

import { useRef, type JSX } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate, formatDisplayDateTime, useLocale } from "../../../lib/i18n";
import { translateCrmMessage, translateActivityTitle } from "../../../lib/crm/i18n-helpers";
import { useToast } from "../../../lib/backend/hooks";
import {
  contactErrorMap,
  crmStore,
  noteErrorMap,
  useCrmStore,
  useCustomerProjects,
  useSelectedCrmCustomer,
} from "../../../lib/crm/directory";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  FormInput,
  FormTextArea,
  Skeleton,
  SkeletonCard,
} from "../../ui";
import { CrmStatusBadge, CrmTagChips } from "./CrmBadges";

const TAB_IDS = [
  "overview",
  "contacts",
  "projects",
  "documents",
  "invoices",
  "activity",
  "notes",
  "settings",
] as const;

export function CrmCustomerProfile({
  customerId,
}: {
  readonly customerId: string;
}): JSX.Element {
  const router = useRouter();
  const state = useCrmStore();
  const customer = useSelectedCrmCustomer();
  const { t } = useLocale();
  const ready = state.hydrated && state.selectedId === customerId;

  if (!state.hydrated || state.detailLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (ready && !customer) {
    return (
      <ErrorState
        title={t("crm.profile.notFoundTitle")}
        description={t("crm.profile.notFoundDescription")}
        onRetry={() => router.push("/dashboard/crm")}
      />
    );
  }

  if (!customer) {
    return (
      <div className="space-y-3">
        <Skeleton height={28} width="40%" />
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
                crmStore.clearSelection();
                router.push("/dashboard/crm");
              }}
            >
              {t("crm.profile.backToCrm")}
            </Button>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--agx-text, #f8fafc)" }}
            >
              {customer.companyName}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--agx-text-muted, #94a3b8)" }}
            >
              {customer.contactName} · {customer.industry} · {t("crm.profile.ownerLabel")}{" "}
              {customer.owner}
            </p>
            <CrmTagChips tags={customer.tags} />
          </div>
          <div className="flex flex-wrap gap-2">
            <CrmStatusBadge status={customer.status} />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => crmStore.openEdit(customer)}
            >
              {t("common.edit")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => crmStore.requestDelete(customer.id)}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label={t("crm.profile.ariaProfileNav")}>
          {TAB_IDS.map((tabId) => (
            <Button
              key={tabId}
              size="sm"
              variant={state.profileTab === tabId ? "primary" : "ghost"}
              aria-current={state.profileTab === tabId ? "page" : undefined}
              onClick={() => crmStore.setProfileTab(tabId)}
            >
              {t(`crm.profile.tabs.${tabId}`)}
            </Button>
          ))}
        </nav>
      </Card>

      {state.profileTab === "overview" ? <OverviewTab /> : null}
      {state.profileTab === "contacts" ? <ContactsTab /> : null}
      {state.profileTab === "projects" ? <ProjectsTab /> : null}
      {state.profileTab === "documents" ? <DocumentsTab /> : null}
      {state.profileTab === "invoices" ? (
        <Card hover={false} padding="18px">
          <EmptyState
            title={t("crm.profile.invoices.emptyTitle")}
            description={t("crm.profile.invoices.emptyDescription")}
          />
        </Card>
      ) : null}
      {state.profileTab === "activity" ? <ActivityTab /> : null}
      {state.profileTab === "notes" ? <NotesTab /> : null}
      {state.profileTab === "settings" ? <SettingsTab /> : null}
    </div>
  );
}

function OverviewTab(): JSX.Element {
  const customer = useSelectedCrmCustomer();
  const { t } = useLocale();
  const empty = t("crm.profile.overview.emptyValue");
  if (!customer) {
    return (
      <EmptyState
        title={t("crm.profile.missingCustomerTitle")}
        description={t("crm.profile.missingOverviewDescription")}
      />
    );
  }
  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("crm.profile.overview.title")}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <Meta label={t("crm.profile.overview.email")} value={customer.email} />
        <Meta label={t("crm.profile.overview.phone")} value={customer.phone || empty} />
        <Meta label={t("crm.profile.overview.website")} value={customer.website || empty} />
        <Meta label={t("crm.profile.overview.taxNumber")} value={customer.taxNumber || empty} />
        <Meta
          label={t("crm.profile.overview.location")}
          value={[customer.city, customer.country].filter(Boolean).join(", ") || empty}
        />
        <Meta label={t("crm.profile.overview.address")} value={customer.address || empty} />
        <Meta label={t("crm.profile.overview.created")} value={formatDisplayDate(customer.createdAt)} />
        <Meta label={t("crm.profile.overview.updated")} value={formatDisplayDateTime(customer.updatedAt)} />
      </dl>
    </Card>
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

function ContactsTab(): JSX.Element {
  const state = useCrmStore();
  const toast = useToast();
  const { t } = useLocale();
  const errors = contactErrorMap(state.contactErrors);
  const tx = (msg: string | undefined) => translateCrmMessage(t, msg);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {state.editingContactId
            ? t("crm.profile.contacts.editTitle")
            : t("crm.profile.contacts.addTitle")}
        </h2>
        <FormField label={t("crm.profile.contacts.name")} error={tx(errors.name)}>
          <FormInput
            value={state.contactDraft.name}
            onChange={(e) =>
              crmStore.patchContactDraft({ name: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.contacts.role")} error={tx(errors.role)}>
          <FormInput
            value={state.contactDraft.role}
            onChange={(e) =>
              crmStore.patchContactDraft({ role: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.contacts.email")} error={tx(errors.email)}>
          <FormInput
            type="email"
            value={state.contactDraft.email}
            onChange={(e) =>
              crmStore.patchContactDraft({ email: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.contacts.phone")} error={tx(errors.phone)}>
          <FormInput
            value={state.contactDraft.phone}
            onChange={(e) =>
              crmStore.patchContactDraft({ phone: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.contacts.mobile")} error={tx(errors.mobile)}>
          <FormInput
            value={state.contactDraft.mobile}
            onChange={(e) =>
              crmStore.patchContactDraft({ mobile: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.contacts.notes")} error={tx(errors.notes)}>
          <FormTextArea
            rows={3}
            value={state.contactDraft.notes}
            onChange={(e) =>
              crmStore.patchContactDraft({ notes: e.target.value })
            }
          />
        </FormField>
        <div className="flex gap-2">
          {state.editingContactId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => crmStore.cancelContactEdit()}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void crmStore.saveContact().then((ok) => {
                if (ok) toast.success(t("crm.toasts.contactSaved"));
              });
            }}
          >
            {t("crm.profile.contacts.saveContact")}
          </Button>
        </div>
      </Card>
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("crm.profile.contacts.listTitle")}
        </h2>
        {state.contacts.length === 0 ? (
          <EmptyState
            title={t("crm.profile.contacts.emptyTitle")}
            description={t("crm.profile.contacts.emptyDescription")}
          />
        ) : (
          <ul className="space-y-2">
            {state.contacts.map((contact) => (
              <li
                key={contact.id}
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--agx-text, #f8fafc)" }}
                    >
                      {contact.name}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      {contact.role || t("crm.profile.contacts.defaultRole")}
                      {contact.email ? ` · ${contact.email}` : ""}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                      {contact.mobile
                        ? ` · ${t("crm.profile.contacts.mobilePrefix")} ${contact.mobile}`
                        : ""}
                    </p>
                    {contact.notes ? (
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                      >
                        {contact.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => crmStore.editContact(contact)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void crmStore.deleteContact(contact.id)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProjectsTab(): JSX.Element {
  const customer = useSelectedCrmCustomer();
  const state = useCrmStore();
  const projects = useCustomerProjects(
    customer?.companyName,
    state.organizationId,
  );
  const router = useRouter();
  const { t } = useLocale();

  if (projects.length === 0) {
    return (
      <EmptyState
        title={t("crm.profile.projects.emptyTitle")}
        description={t("crm.profile.projects.emptyDescription")}
        actionLabel={t("crm.profile.projects.openProjects")}
        onAction={() => router.push("/dashboard/projects")}
      />
    );
  }

  return (
    <Card hover={false} className="space-y-3" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("crm.profile.projects.title")}
      </h2>
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.1))",
                color: "var(--agx-text, #f8fafc)",
              }}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              <span className="text-sm font-medium">{project.name}</span>
              <span
                className="text-[11px]"
                style={{ color: "var(--agx-text-muted, #94a3b8)" }}
              >
                {project.status} · {project.progress}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DocumentsTab(): JSX.Element {
  const state = useCrmStore();
  const customer = useSelectedCrmCustomer();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocale();

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("crm.profile.documents.title")}
          </h2>
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("crm.profile.documents.subtitle")}
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={(event) => {
              const files = event.target.files;
              if (!files?.length) return;
              void crmStore
                .uploadDocuments(
                  files,
                  customer?.owner ?? t("crm.profile.documents.systemUploader"),
                )
                .then(() =>
                  toast.success(
                    t("crm.toasts.documentsAttached"),
                    t("crm.toasts.documentsAttachedDetail", {
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
            onClick={() => inputRef.current?.click()}
          >
            {t("crm.profile.documents.attachFiles")}
          </Button>
        </div>
      </div>
      {state.documents.length === 0 ? (
        <EmptyState
          title={t("crm.profile.documents.emptyTitle")}
          description={t("crm.profile.documents.emptyDescription")}
        />
      ) : (
        <ul className="space-y-2">
          {state.documents.map((doc) => (
            <li
              key={doc.id}
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
                  {doc.name}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {doc.mimeType} · {(doc.size / 1024).toFixed(1)} KB ·{" "}
                  {formatDisplayDateTime(doc.createdAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void crmStore.deleteDocument(doc.id)}
              >
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ActivityTab(): JSX.Element {
  const state = useCrmStore();
  const { t } = useLocale();
  return (
    <Card hover={false} className="space-y-3" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("crm.profile.activity.title")}
      </h2>
      {state.activities.length === 0 ? (
        <EmptyState
          title={t("crm.profile.activity.emptyTitle")}
          description={t("crm.profile.activity.emptyDescription")}
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
                  {translateActivityTitle(t, item.kind, item.title)}
                </p>
                <time
                  className="text-[11px]"
                  dateTime={item.createdAt}
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
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

function NotesTab(): JSX.Element {
  const state = useCrmStore();
  const toast = useToast();
  const { t } = useLocale();
  const errors = noteErrorMap(state.noteErrors);
  const tx = (msg: string | undefined) => translateCrmMessage(t, msg);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {state.editingNoteId
            ? t("crm.profile.notes.editTitle")
            : t("crm.profile.notes.newTitle")}
        </h2>
        <FormField label={t("crm.profile.notes.title")} error={tx(errors.title)}>
          <FormInput
            value={state.noteDraft.title}
            onChange={(e) =>
              crmStore.patchNoteDraft({ title: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.notes.author")} error={tx(errors.author)}>
          <FormInput
            value={state.noteDraft.author}
            onChange={(e) =>
              crmStore.patchNoteDraft({ author: e.target.value })
            }
          />
        </FormField>
        <FormField label={t("crm.profile.notes.body")} error={tx(errors.body)}>
          <FormTextArea
            rows={8}
            value={state.noteDraft.body}
            onChange={(e) => crmStore.patchNoteDraft({ body: e.target.value })}
          />
        </FormField>
        <div className="flex gap-2">
          {state.editingNoteId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => crmStore.cancelNoteEdit()}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void crmStore.saveNote().then((ok) => {
                if (ok) toast.success(t("crm.toasts.noteSaved"));
              });
            }}
          >
            {t("crm.profile.notes.saveNote")}
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        {state.notes.length === 0 ? (
          <EmptyState
            title={t("crm.profile.notes.emptyTitle")}
            description={t("crm.profile.notes.emptyDescription")}
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
                    onClick={() => crmStore.editNote(note)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void crmStore.deleteNote(note.id)}
                  >
                    {t("common.delete")}
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

function SettingsTab(): JSX.Element {
  const customer = useSelectedCrmCustomer();
  const { t } = useLocale();
  if (!customer) {
    return (
      <EmptyState
        title={t("crm.profile.missingCustomerTitle")}
        description={t("crm.profile.missingSettingsDescription")}
      />
    );
  }
  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        {t("crm.profile.settings.title")}
      </h2>
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("crm.profile.settings.description")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => crmStore.openEdit(customer)}
        >
          {t("crm.profile.settings.editAllFields")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            crmStore.openEdit({ ...customer, status: "archived" })
          }
        >
          {t("crm.profile.settings.prepareArchive")}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => crmStore.requestDelete(customer.id)}
        >
          {t("crm.profile.settings.deleteCustomer")}
        </Button>
      </div>
    </Card>
  );
}
