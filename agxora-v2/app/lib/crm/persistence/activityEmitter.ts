/**
 * Activity payload builders — mirror LocalStorage pushActivity() semantics.
 * Phase 50 — server-internal append only (no public POST).
 */

import type {
  CrmContactRecord,
  CrmCustomerRecord,
  CrmDocumentRecord,
  CrmNoteRecord,
} from "../directory/types";

export type ActivityPayload = {
  readonly kind: string;
  readonly title: string;
  readonly detail: string;
  readonly actor: string;
};

function actorOrSystem(value?: string): string {
  return value?.trim() || "System";
}

export function customerCreatedActivity(customer: CrmCustomerRecord): ActivityPayload {
  return {
    kind: "customer_created",
    title: "Customer Created",
    detail: customer.companyName,
    actor: customer.owner,
  };
}

export function customerUpdatedActivity(customer: CrmCustomerRecord): ActivityPayload {
  return {
    kind: "customer_updated",
    title: "Customer Updated",
    detail: customer.companyName,
    actor: customer.owner,
  };
}

export function contactAddedActivity(contact: CrmContactRecord): ActivityPayload {
  return {
    kind: "contact_added",
    title: "Contact Added",
    detail: contact.name,
    actor: actorOrSystem(),
  };
}

export function contactUpdatedActivity(contact: CrmContactRecord): ActivityPayload {
  return {
    kind: "contact_updated",
    title: "Contact Updated",
    detail: contact.name,
    actor: actorOrSystem(),
  };
}

export function contactDeletedActivity(contact: Pick<CrmContactRecord, "name">): ActivityPayload {
  return {
    kind: "contact_deleted",
    title: "Contact Deleted",
    detail: contact.name,
    actor: actorOrSystem(),
  };
}

export function noteAddedActivity(note: CrmNoteRecord): ActivityPayload {
  return {
    kind: "note_added",
    title: "Note Added",
    detail: note.title,
    actor: note.author,
  };
}

export function noteUpdatedActivity(note: CrmNoteRecord): ActivityPayload {
  return {
    kind: "note_updated",
    title: "Note Updated",
    detail: note.title,
    actor: note.author,
  };
}

export function noteDeletedActivity(note: Pick<CrmNoteRecord, "title" | "author">): ActivityPayload {
  return {
    kind: "note_deleted",
    title: "Note Deleted",
    detail: note.title,
    actor: note.author,
  };
}

export function documentAddedActivity(document: CrmDocumentRecord): ActivityPayload {
  return {
    kind: "document_added",
    title: "Document Added",
    detail: document.name,
    actor: document.uploadedBy,
  };
}

export function documentDeletedActivity(
  document: Pick<CrmDocumentRecord, "name">,
): ActivityPayload {
  return {
    kind: "document_deleted",
    title: "Document Deleted",
    detail: document.name,
    actor: actorOrSystem(),
  };
}
