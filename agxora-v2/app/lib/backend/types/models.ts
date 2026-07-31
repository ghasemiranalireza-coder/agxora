/**
 * Enterprise domain models — database / API ready.
 * Compose with identity & organization branded IDs where applicable.
 */

export type EntityId = string;

export interface Timestamps {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface User {
  readonly id: EntityId;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly emailVerified: boolean;
  readonly organizationId?: EntityId;
  readonly role?: string;
  readonly timezone?: string;
  readonly language?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Organization {
  readonly id: EntityId;
  readonly name: string;
  readonly slug: string;
  readonly ownerUserId: EntityId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Workspace {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly status: "active" | "provisioning" | "archived";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Customer {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly email: string;
  readonly company?: string;
  readonly status: "active" | "prospect" | "churn_risk" | "archived";
  readonly ownerUserId?: EntityId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Project {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly workspaceId: EntityId;
  readonly name: string;
  readonly customerId?: EntityId;
  readonly status: "planning" | "active" | "blocked" | "done" | "archived";
  readonly ownerUserId?: EntityId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Invoice {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly number: string;
  readonly customerId?: EntityId;
  readonly company: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: "draft" | "open" | "paid" | "overdue" | "cancelled";
  readonly dueDate: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Document {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly fileType: string;
  readonly ownerUserId?: EntityId;
  readonly status: "draft" | "in_review" | "approved" | "archived";
  readonly folderId?: EntityId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Workflow {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AutomationRun {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly workflowId: EntityId;
  readonly workflowName: string;
  readonly status: "success" | "failed" | "running" | "pending" | "retried";
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly trigger: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TeamMember {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly workspaceId: EntityId;
  readonly userId: EntityId;
  readonly email: string;
  readonly displayName: string;
  readonly role: string;
  readonly status: "active" | "invited" | "revoked";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type NotificationTone = "success" | "warning" | "error" | "info";

export interface Notification {
  readonly id: EntityId;
  readonly organizationId?: EntityId;
  readonly userId?: EntityId;
  readonly title: string;
  readonly body: string;
  readonly tone: NotificationTone;
  readonly read: boolean;
  readonly href?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ActivityKind =
  | "customer_created"
  | "project_updated"
  | "invoice_paid"
  | "workflow_executed"
  | "document_uploaded"
  | "member_invited"
  | "generic";

export interface Activity {
  readonly id: EntityId;
  readonly organizationId?: EntityId;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly detail: string;
  readonly actorUserId?: EntityId;
  readonly entityId?: EntityId;
  readonly href?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuditEvent {
  readonly id: EntityId;
  readonly organizationId?: EntityId;
  readonly actorUserId?: EntityId;
  readonly action: string;
  readonly resource: string;
  readonly resourceId?: EntityId;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly createdAt: string;
}
