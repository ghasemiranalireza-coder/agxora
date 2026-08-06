"use client";

import { useRef, type JSX } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate, formatDisplayDateTime } from "../../../lib/i18n";
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

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts" },
  { id: "projects", label: "Projects" },
  { id: "documents", label: "Documents" },
  { id: "invoices", label: "Invoices" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
  { id: "settings", label: "Settings" },
] as const;

export function CrmCustomerProfile({
  customerId,
}: {
  readonly customerId: string;
}): JSX.Element {
  const router = useRouter();
  const state = useCrmStore();
  const customer = useSelectedCrmCustomer();
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
        title="Customer not found"
        description="This customer may have been deleted."
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
              ← Back to CRM
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
              {customer.contactName} · {customer.industry} · Owner{" "}
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
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => crmStore.requestDelete(customer.id)}
            >
              Delete
            </Button>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Customer profile">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={state.profileTab === tab.id ? "primary" : "ghost"}
              aria-current={state.profileTab === tab.id ? "page" : undefined}
              onClick={() => crmStore.setProfileTab(tab.id)}
            >
              {tab.label}
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
            title="No invoices yet"
            description="Invoices for this customer appear here when linked from Finance."
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
  if (!customer) {
    return (
      <EmptyState
        title="Missing customer"
        description="Select a customer to view the overview."
      />
    );
  }
  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Overview
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <Meta label="Email" value={customer.email} />
        <Meta label="Phone" value={customer.phone || "—"} />
        <Meta label="Website" value={customer.website || "—"} />
        <Meta label="Tax number" value={customer.taxNumber || "—"} />
        <Meta
          label="Location"
          value={[customer.city, customer.country].filter(Boolean).join(", ") || "—"}
        />
        <Meta label="Address" value={customer.address || "—"} />
        <Meta label="Created" value={formatDisplayDate(customer.createdAt)} />
        <Meta label="Updated" value={formatDisplayDateTime(customer.updatedAt)} />
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
  const errors = contactErrorMap(state.contactErrors);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {state.editingContactId ? "Edit contact" : "Add contact"}
        </h2>
        <FormField label="Name" error={errors.name}>
          <FormInput
            value={state.contactDraft.name}
            onChange={(e) =>
              crmStore.patchContactDraft({ name: e.target.value })
            }
          />
        </FormField>
        <FormField label="Role" error={errors.role}>
          <FormInput
            value={state.contactDraft.role}
            onChange={(e) =>
              crmStore.patchContactDraft({ role: e.target.value })
            }
          />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <FormInput
            type="email"
            value={state.contactDraft.email}
            onChange={(e) =>
              crmStore.patchContactDraft({ email: e.target.value })
            }
          />
        </FormField>
        <FormField label="Phone" error={errors.phone}>
          <FormInput
            value={state.contactDraft.phone}
            onChange={(e) =>
              crmStore.patchContactDraft({ phone: e.target.value })
            }
          />
        </FormField>
        <FormField label="Mobile" error={errors.mobile}>
          <FormInput
            value={state.contactDraft.mobile}
            onChange={(e) =>
              crmStore.patchContactDraft({ mobile: e.target.value })
            }
          />
        </FormField>
        <FormField label="Notes" error={errors.notes}>
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
              Cancel
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void crmStore.saveContact().then((ok) => {
                if (ok) toast.success("Contact saved");
              });
            }}
          >
            Save contact
          </Button>
        </div>
      </Card>
      <Card hover={false} className="space-y-3" padding="18px">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          Contacts
        </h2>
        {state.contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description="Add stakeholders with role, email, and phone details."
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
                      {contact.role || "Contact"}
                      {contact.email ? ` · ${contact.email}` : ""}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                      {contact.mobile ? ` · Mobile ${contact.mobile}` : ""}
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
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void crmStore.deleteContact(contact.id)}
                    >
                      Delete
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

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No linked projects"
        description="Projects whose customer name matches this company appear here. Data is read from the Projects module — nothing is duplicated."
        actionLabel="Open Projects"
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
        Projects
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

  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            Documents
          </h2>
          <p
            className="text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            Images, PDFs, and office documents — metadata only in Local Storage.
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
                .uploadDocuments(files, customer?.owner ?? "System")
                .then(() =>
                  toast.success("Documents attached", `${files.length} file(s)`),
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
            Attach files
          </Button>
        </div>
      </div>
      {state.documents.length === 0 ? (
        <EmptyState
          title="No documents"
          description="Attach customer files for the account team."
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
                Delete
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
  return (
    <Card hover={false} className="space-y-3" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Activity
      </h2>
      {state.activities.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Creates, updates, notes, and documents appear here newest first."
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
            onChange={(e) =>
              crmStore.patchNoteDraft({ title: e.target.value })
            }
          />
        </FormField>
        <FormField label="Author" error={errors.author}>
          <FormInput
            value={state.noteDraft.author}
            onChange={(e) =>
              crmStore.patchNoteDraft({ author: e.target.value })
            }
          />
        </FormField>
        <FormField label="Body" error={errors.body}>
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
              Cancel
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="primary"
            loading={state.saving}
            onClick={() => {
              void crmStore.saveNote().then((ok) => {
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
            description="Capture account context with author and timestamps."
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void crmStore.deleteNote(note.id)}
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

function SettingsTab(): JSX.Element {
  const customer = useSelectedCrmCustomer();
  if (!customer) {
    return (
      <EmptyState
        title="Missing customer"
        description="Select a customer to manage settings."
      />
    );
  }
  return (
    <Card hover={false} className="space-y-4" padding="18px">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--agx-text, #f8fafc)" }}
      >
        Settings
      </h2>
      <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        Edit all profile fields or archive this account. Deletion uses the
        confirmation dialog.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => crmStore.openEdit(customer)}
        >
          Edit all fields
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            crmStore.openEdit({ ...customer, status: "archived" })
          }
        >
          Prepare archive
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => crmStore.requestDelete(customer.id)}
        >
          Delete customer
        </Button>
      </div>
    </Card>
  );
}
