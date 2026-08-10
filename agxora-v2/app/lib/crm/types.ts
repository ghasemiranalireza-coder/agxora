/**
 * AGXORA AI CRM + Creator OS — domain types.
 * Foundation for Customer 360, Sales, Orders, Delivery, Documents,
 * Tasks, Communication Hub, Creator Studio, and Industry modules.
 */

export type PipelineStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_fulfillment"
  | "shipped"
  | "delivered"
  | "cancelled";

export type DeliveryKind = "delivery" | "pickup";
export type TrackingStatus =
  | "scheduled"
  | "en_route"
  | "arrived"
  | "completed"
  | "failed";

export type DocumentKind =
  | "quote"
  | "contract"
  | "invoice"
  | "lieferschein"
  | "purchase_order"
  | "receipt";

export type TaskKind = "task" | "meeting" | "reminder" | "follow_up";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export type IntegrationStatus = "planned" | "ready" | "connected" | "disabled";

export interface CrmKpiMetric {
  readonly id: string;
  readonly label: string;
  /**
   * Display value: raw number (format at render) or ready-made string
   * (counts / scores that are not locale money).
   */
  readonly value: string | number;
  readonly currency?: string;
  readonly caption: string;
  readonly delta?: {
    readonly value?: string;
    /** Raw money for locale-aware delta chips (formatted at render). */
    readonly amount?: number;
    readonly currency?: string;
    readonly compact?: boolean;
    readonly positive: boolean;
  };
}

export interface CrmContact {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly email: string;
  readonly phone: string;
}

export interface CrmCompany {
  readonly id: string;
  readonly name: string;
  readonly industry: string;
  readonly website: string;
  readonly city: string;
  readonly country: string;
}

export interface CrmActivity {
  readonly id: string;
  readonly at: string;
  readonly kind: string;
  readonly summary: string;
}

export interface CrmNote {
  readonly id: string;
  readonly at: string;
  readonly author: string;
  readonly body: string;
}

export interface CrmTimelineEvent {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly detail: string;
}

export interface CrmCommunication {
  readonly id: string;
  readonly at: string;
  readonly channel: string;
  readonly direction: "inbound" | "outbound";
  readonly subject: string;
  readonly preview: string;
}

export interface Customer360 {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly status: "active" | "prospect" | "churn_risk";
  readonly company: CrmCompany;
  readonly contacts: readonly CrmContact[];
  readonly orders: readonly string[];
  readonly invoices: readonly string[];
  readonly lieferscheine: readonly string[];
  readonly payments: readonly { readonly id: string; readonly amount: number; readonly at: string; readonly status: string }[];
  readonly documents: readonly string[];
  readonly timeline: readonly CrmTimelineEvent[];
  readonly activities: readonly CrmActivity[];
  readonly notes: readonly CrmNote[];
  readonly aiSummary: string;
  readonly communicationHistory: readonly CrmCommunication[];
  readonly healthScore: number;
}

export interface PipelineDeal {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  readonly value: number;
  readonly currency: string;
  readonly owner: string;
  readonly stage: PipelineStage;
  readonly probability: number;
  readonly closeDate: string;
}

export interface OrderLine {
  readonly id: string;
  readonly kind: "product" | "service";
  readonly name: string;
  readonly qty: number;
  readonly unitPrice: number;
  readonly discountPct: number;
  readonly taxPct: number;
}

export interface CrmOrder {
  readonly id: string;
  readonly number: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly status: OrderStatus;
  readonly currency: string;
  readonly createdAt: string;
  readonly lines: readonly OrderLine[];
}

export interface DeliveryNote {
  readonly id: string;
  readonly number: string;
  readonly orderNumber: string;
  readonly customerName: string;
  readonly kind: DeliveryKind;
  readonly driver: string;
  readonly vehicle: string;
  readonly trackingStatus: TrackingStatus;
  readonly scheduledAt: string;
  readonly signatureReady: boolean;
  readonly qrReady: boolean;
  readonly barcodeReady: boolean;
}

export interface CrmDocument {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly title: string;
  readonly customerName: string;
  readonly updatedAt: string;
  readonly status: string;
}

export interface CrmTask {
  readonly id: string;
  readonly title: string;
  readonly kind: TaskKind;
  readonly status: TaskStatus;
  readonly dueAt: string;
  readonly relatedTo: string;
  readonly owner: string;
}

export interface ChannelAdapterPlan {
  readonly id: string;
  readonly channel: string;
  readonly category: "messaging" | "social" | "voice" | "video" | "email";
  readonly status: IntegrationStatus;
  readonly adapter: string;
  readonly notes: string;
}

export interface CreatorPlatformPlan {
  readonly id: string;
  readonly platform: string;
  readonly status: IntegrationStatus;
  readonly capabilities: readonly string[];
  readonly adapter: string;
}

export interface AiCreatorCapability {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly status: IntegrationStatus;
}

export type IndustryKey =
  | "business"
  | "freelancer"
  | "creator"
  | "influencer"
  | "agency"
  | "retail"
  | "restaurant"
  | "hotel"
  | "laundry"
  | "healthcare"
  | "law_firm"
  | "accounting"
  | "construction"
  | "real_estate"
  | "education"
  | "manufacturing"
  | "logistics"
  | "ecommerce";

export interface IndustryModulePlan {
  readonly key: IndustryKey;
  readonly label: string;
  readonly description: string;
  readonly plannedModules: readonly string[];
  readonly status: IntegrationStatus;
}
