/**
 * AGXORA Commercial SaaS — public types (Phase 24).
 */

export type CommercialPlanId =
  | "starter"
  | "professional"
  | "business"
  | "enterprise";

export type LicenseStatus =
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "lifetime";

export type BillingInterval = "monthly" | "yearly";

export type UsageMetricKey =
  | "ai_requests"
  | "projects"
  | "customers"
  | "documents"
  | "storage_mb"
  | "users"
  | "api_requests";

export type SaasModuleFeatureKey =
  | "crm"
  | "projects"
  | "finance"
  | "documents"
  | "ai"
  | "automation"
  | "analytics"
  | "api_access"
  | "sso"
  | "audit_export"
  | "priority_support"
  | "custom_branding";

export interface PlanLimits {
  readonly users: number;
  readonly projects: number;
  readonly customers: number;
  readonly documents: number;
  readonly storageMb: number;
  readonly aiRequestsPerMonth: number;
  readonly apiRequestsPerMonth: number;
}

export interface CommercialPlan {
  readonly id: CommercialPlanId;
  readonly name: string;
  readonly description: string;
  readonly priceMonthlyUsd: number | null;
  readonly priceYearlyUsd: number | null;
  readonly limits: PlanLimits;
  readonly features: readonly SaasModuleFeatureKey[];
  readonly highlighted?: boolean;
  /** null = contact sales */
  readonly public: boolean;
}

export interface LicenseRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly planId: CommercialPlanId;
  readonly status: LicenseStatus;
  readonly seats: number;
  readonly trialEndsAt?: string;
  readonly renewsAt?: string;
  readonly cancelledAt?: string;
  readonly suspendedAt?: string;
  readonly lifetime?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UsageSnapshot {
  readonly organizationId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metrics: Readonly<Record<UsageMetricKey, number>>;
  readonly updatedAt: string;
}

export interface QuotaCheckResult {
  readonly metric: UsageMetricKey;
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly exceeded: boolean;
  readonly softWarning: boolean;
}

export type PaymentProviderId = "stripe" | "paypal" | "bank_transfer" | "manual";

export type BillingInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible"
  | "refunded";

export interface BillingInvoice {
  readonly id: string;
  readonly organizationId: string;
  readonly number: string;
  readonly status: BillingInvoiceStatus;
  readonly amountUsd: number;
  readonly currency: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly paidAt?: string;
  readonly description: string;
  readonly planId?: CommercialPlanId;
}

export interface PaymentMethodRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly providerId: PaymentProviderId;
  readonly brand: string;
  readonly last4: string;
  readonly expMonth?: number;
  readonly expYear?: number;
  readonly isDefault: boolean;
  readonly createdAt: string;
}

export interface BillingTransaction {
  readonly id: string;
  readonly organizationId: string;
  readonly invoiceId?: string;
  readonly providerId: PaymentProviderId;
  readonly amountUsd: number;
  readonly currency: string;
  readonly status: "pending" | "succeeded" | "failed" | "refunded";
  readonly createdAt: string;
  readonly reference?: string;
}

export interface CouponRecord {
  readonly id: string;
  readonly code: string;
  readonly percentOff?: number;
  readonly amountOffUsd?: number;
  readonly active: boolean;
  readonly expiresAt?: string;
}

export interface BillingProfile {
  readonly organizationId: string;
  readonly companyName: string;
  readonly billingEmail: string;
  readonly addressLine1?: string;
  readonly city?: string;
  readonly country?: string;
  readonly vatId?: string;
  readonly taxId?: string;
  readonly updatedAt: string;
}

export type SaasNotificationKind =
  | "trial_ending"
  | "subscription_expiry"
  | "payment_failed"
  | "upgrade_available"
  | "quota_warning"
  | "invoice_ready";

export interface SaasNotification {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: SaasNotificationKind;
  readonly title: string;
  readonly body: string;
  readonly read: boolean;
  readonly createdAt: string;
  readonly href?: string;
}

export type SaasAuditAction =
  | "license.created"
  | "license.activated"
  | "license.cancelled"
  | "license.suspended"
  | "license.plan_changed"
  | "license.renewed"
  | "billing.invoice_created"
  | "billing.payment_succeeded"
  | "billing.payment_failed"
  | "billing.refund_placeholder"
  | "coupon.applied"
  | "portal.upgrade"
  | "portal.downgrade"
  | "portal.cancel"
  | "portal.renew"
  | "sales.inquiry";

export interface SaasAuditEvent {
  readonly id: string;
  readonly action: SaasAuditAction;
  readonly organizationId: string;
  readonly actorUserId?: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly createdAt: string;
}

export type EmailTemplateId =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "invoice"
  | "billing_notification"
  | "trial_ending"
  | "payment_failed";

export interface EmailMessage {
  readonly id: string;
  readonly templateId: EmailTemplateId;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly status: "queued" | "sent" | "failed" | "mock";
  readonly createdAt: string;
}
