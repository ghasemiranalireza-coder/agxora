/**
 * Commercial SaaS store — LocalStorage-backed, provider-swappable later.
 */

import type {
  BillingInvoice,
  BillingProfile,
  BillingTransaction,
  CouponRecord,
  LicenseRecord,
  PaymentMethodRecord,
  SaasAuditEvent,
  SaasNotification,
  UsageMetricKey,
  UsageSnapshot,
  EmailMessage,
  CommercialPlanId,
  LicenseStatus,
} from "../types";
import { getCommercialPlan } from "../plans";

const STORAGE_KEY = "agxora-saas-commercial-v1";

export interface SaasPersistedState {
  readonly version: 1;
  readonly licenses: LicenseRecord[];
  readonly usage: UsageSnapshot[];
  readonly invoices: BillingInvoice[];
  readonly payments: BillingTransaction[];
  readonly paymentMethods: PaymentMethodRecord[];
  readonly coupons: CouponRecord[];
  readonly profiles: BillingProfile[];
  readonly notifications: SaasNotification[];
  readonly audit: SaasAuditEvent[];
  readonly emails: EmailMessage[];
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: SaasPersistedState & { hydrated: boolean } = {
  version: 1,
  licenses: [],
  usage: [],
  invoices: [],
  payments: [],
  paymentMethods: [],
  coupons: [
    {
      id: "coup_launch",
      code: "LAUNCH20",
      percentOff: 20,
      active: true,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  profiles: [],
  notifications: [],
  audit: [],
  emails: [],
  hydrated: false,
};

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const { hydrated: _h, ...payload } = state;
    void _h;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultUsage(organizationId: string): UsageSnapshot {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return {
    organizationId,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    metrics: {
      ai_requests: 0,
      projects: 0,
      customers: 0,
      documents: 0,
      storage_mb: 0,
      users: 1,
      api_requests: 0,
    },
    updatedAt: nowIso(),
  };
}

export const saasCommercialStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return state;
  },

  hydrate(): void {
    if (state.hydrated || typeof window === "undefined") {
      if (!state.hydrated) {
        state = { ...state, hydrated: true };
        emit();
      }
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaasPersistedState>;
        state = {
          version: 1,
          licenses: parsed.licenses ?? [],
          usage: parsed.usage ?? [],
          invoices: parsed.invoices ?? [],
          payments: parsed.payments ?? [],
          paymentMethods: parsed.paymentMethods ?? [],
          coupons: parsed.coupons ?? state.coupons,
          profiles: parsed.profiles ?? [],
          notifications: parsed.notifications ?? [],
          audit: parsed.audit ?? [],
          emails: parsed.emails ?? [],
          hydrated: true,
        };
      } else {
        state = { ...state, hydrated: true };
      }
    } catch {
      state = { ...state, hydrated: true };
    }
    emit();
  },

  ensureOrganization(organizationId: string, planId: CommercialPlanId = "starter"): LicenseRecord {
    const existing = state.licenses.find((l) => l.organizationId === organizationId);
    if (existing) return existing;
    const now = nowIso();
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const plan = getCommercialPlan(planId);
    const license: LicenseRecord = {
      id: createId("lic"),
      organizationId,
      planId,
      status: "trial",
      seats: plan.limits.users,
      trialEndsAt: trialEnds,
      renewsAt: trialEnds,
      createdAt: now,
      updatedAt: now,
    };
    state = {
      ...state,
      licenses: [license, ...state.licenses],
      usage: [defaultUsage(organizationId), ...state.usage],
    };
    this.logAudit({
      action: "license.created",
      organizationId,
      metadata: { planId, status: "trial" },
    });
    persist();
    emit();
    return license;
  },

  getLicense(organizationId: string): LicenseRecord | null {
    return state.licenses.find((l) => l.organizationId === organizationId) ?? null;
  },

  listLicenses(): readonly LicenseRecord[] {
    return state.licenses;
  },

  updateLicense(
    organizationId: string,
    patch: Partial<
      Pick<
        LicenseRecord,
        | "planId"
        | "status"
        | "seats"
        | "trialEndsAt"
        | "renewsAt"
        | "cancelledAt"
        | "suspendedAt"
        | "lifetime"
      >
    >,
  ): LicenseRecord {
    let updated: LicenseRecord | null = null;
    state = {
      ...state,
      licenses: state.licenses.map((lic) => {
        if (lic.organizationId !== organizationId) return lic;
        updated = { ...lic, ...patch, updatedAt: nowIso() };
        return updated;
      }),
    };
    if (!updated) {
      throw new Error("License not found");
    }
    persist();
    emit();
    return updated;
  },

  getUsage(organizationId: string): UsageSnapshot {
    const hit = state.usage.find((u) => u.organizationId === organizationId);
    if (hit) return hit;
    const created = defaultUsage(organizationId);
    state = { ...state, usage: [created, ...state.usage] };
    persist();
    emit();
    return created;
  },

  recordUsage(
    organizationId: string,
    metric: UsageMetricKey,
    delta = 1,
  ): UsageSnapshot {
    this.ensureOrganization(organizationId);
    let next: UsageSnapshot | null = null;
    state = {
      ...state,
      usage: state.usage.map((row) => {
        if (row.organizationId !== organizationId) return row;
        next = {
          ...row,
          metrics: {
            ...row.metrics,
            [metric]: Math.max(0, row.metrics[metric] + delta),
          },
          updatedAt: nowIso(),
        };
        return next;
      }),
    };
    if (!next) {
      const created = defaultUsage(organizationId);
      next = {
        ...created,
        metrics: {
          ...created.metrics,
          [metric]: Math.max(0, created.metrics[metric] + delta),
        },
      };
      state = { ...state, usage: [next, ...state.usage] };
    }
    persist();
    emit();
    return next;
  },

  listInvoices(organizationId?: string): readonly BillingInvoice[] {
    if (!organizationId) return state.invoices;
    return state.invoices.filter((i) => i.organizationId === organizationId);
  },

  addInvoice(invoice: Omit<BillingInvoice, "id"> & { id?: string }): BillingInvoice {
    const row: BillingInvoice = { ...invoice, id: invoice.id ?? createId("inv") };
    state = { ...state, invoices: [row, ...state.invoices] };
    this.logAudit({
      action: "billing.invoice_created",
      organizationId: row.organizationId,
      metadata: { invoiceId: row.id, number: row.number },
    });
    persist();
    emit();
    return row;
  },

  listPayments(organizationId?: string): readonly BillingTransaction[] {
    if (!organizationId) return state.payments;
    return state.payments.filter((p) => p.organizationId === organizationId);
  },

  addPayment(
    payment: Omit<BillingTransaction, "id"> & { id?: string },
  ): BillingTransaction {
    const row: BillingTransaction = {
      ...payment,
      id: payment.id ?? createId("txn"),
    };
    state = { ...state, payments: [row, ...state.payments] };
    this.logAudit({
      action:
        row.status === "succeeded"
          ? "billing.payment_succeeded"
          : row.status === "failed"
            ? "billing.payment_failed"
            : "billing.payment_succeeded",
      organizationId: row.organizationId,
      metadata: { paymentId: row.id, status: row.status },
    });
    persist();
    emit();
    return row;
  },

  listPaymentMethods(organizationId: string): readonly PaymentMethodRecord[] {
    return state.paymentMethods.filter((m) => m.organizationId === organizationId);
  },

  upsertPaymentMethod(
    method: Omit<PaymentMethodRecord, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ): PaymentMethodRecord {
    const row: PaymentMethodRecord = {
      id: method.id ?? createId("pm"),
      createdAt: method.createdAt ?? nowIso(),
      organizationId: method.organizationId,
      providerId: method.providerId,
      brand: method.brand,
      last4: method.last4,
      expMonth: method.expMonth,
      expYear: method.expYear,
      isDefault: method.isDefault,
    };
    let methods = state.paymentMethods.filter(
      (m) =>
        !(m.organizationId === row.organizationId && m.id === row.id),
    );
    if (row.isDefault) {
      methods = methods.map((m) =>
        m.organizationId === row.organizationId ? { ...m, isDefault: false } : m,
      );
    }
    state = { ...state, paymentMethods: [row, ...methods] };
    persist();
    emit();
    return row;
  },

  getProfile(organizationId: string): BillingProfile | null {
    return state.profiles.find((p) => p.organizationId === organizationId) ?? null;
  },

  upsertProfile(profile: BillingProfile): BillingProfile {
    const others = state.profiles.filter(
      (p) => p.organizationId !== profile.organizationId,
    );
    state = { ...state, profiles: [profile, ...others] };
    persist();
    emit();
    return profile;
  },

  listCoupons(): readonly CouponRecord[] {
    return state.coupons;
  },

  listNotifications(organizationId: string): readonly SaasNotification[] {
    return state.notifications.filter((n) => n.organizationId === organizationId);
  },

  pushNotification(
    input: Omit<SaasNotification, "id" | "createdAt" | "read">,
  ): SaasNotification {
    const row: SaasNotification = {
      ...input,
      id: createId("ntf"),
      read: false,
      createdAt: nowIso(),
    };
    state = { ...state, notifications: [row, ...state.notifications].slice(0, 100) };
    persist();
    emit();
    return row;
  },

  markNotificationRead(id: string): void {
    state = {
      ...state,
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    };
    persist();
    emit();
  },

  logAudit(input: {
    action: SaasAuditEvent["action"];
    organizationId: string;
    actorUserId?: string;
    metadata?: Readonly<Record<string, string>>;
  }): SaasAuditEvent {
    const row: SaasAuditEvent = {
      id: createId("saudit"),
      action: input.action,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      metadata: input.metadata,
      createdAt: nowIso(),
    };
    state = { ...state, audit: [row, ...state.audit].slice(0, 300) };
    persist();
    emit();
    return row;
  },

  listAudit(organizationId?: string): readonly SaasAuditEvent[] {
    if (!organizationId) return state.audit;
    return state.audit.filter((a) => a.organizationId === organizationId);
  },

  queueEmail(message: Omit<EmailMessage, "id" | "createdAt" | "status"> & {
    status?: EmailMessage["status"];
  }): EmailMessage {
    const row: EmailMessage = {
      id: createId("mail"),
      createdAt: nowIso(),
      status: message.status ?? "mock",
      templateId: message.templateId,
      to: message.to,
      subject: message.subject,
      body: message.body,
    };
    state = { ...state, emails: [row, ...state.emails].slice(0, 200) };
    persist();
    emit();
    return row;
  },

  listEmails(): readonly EmailMessage[] {
    return state.emails;
  },

  setLicenseStatus(organizationId: string, status: LicenseStatus): LicenseRecord {
    return this.updateLicense(organizationId, { status });
  },
};
