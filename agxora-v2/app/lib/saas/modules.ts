/**
 * Workspace module registry — dashboard modules each workspace may enable.
 */

export type SaaSModuleKey =
  | "dashboard"
  | "customers"
  | "projects"
  | "invoices"
  | "finance"
  | "crm"
  | "creator"
  | "ai"
  | "analytics"
  | "automation"
  | "memory"
  | "settings"
  | "team";

export interface SaaSModuleDefinition {
  readonly key: SaaSModuleKey;
  readonly label: string;
  readonly href: string;
  readonly description: string;
}

export const SAAS_MODULES: readonly SaaSModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Command center and globe overview",
  },
  {
    key: "customers",
    label: "Customers",
    href: "/dashboard/customers",
    description: "Customer records and CRM",
  },
  {
    key: "projects",
    label: "Projects",
    href: "/dashboard/projects",
    description: "Project delivery and tracking",
  },
  {
    key: "invoices",
    label: "Invoices",
    href: "/dashboard/invoices",
    description: "Billing and invoices",
  },
  {
    key: "finance",
    label: "Finance & Tax",
    href: "/dashboard/finance",
    description: "AI accounting, banking, tax & financial intelligence",
  },
  {
    key: "crm",
    label: "AI CRM",
    href: "/dashboard/crm",
    description: "AI-native CRM and Creator Operating System",
  },
  {
    key: "creator",
    label: "AI Creator Studio",
    href: "/dashboard/creator",
    description: "AI content production and marketing OS",
  },
  {
    key: "ai",
    label: "AI",
    href: "/dashboard",
    description: "AGXORA AI operating assistant",
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/dashboard/analytics",
    description: "Business intelligence",
  },
  {
    key: "automation",
    label: "Automation",
    href: "/dashboard/automation",
    description: "Workflows and automations",
  },
  {
    key: "memory",
    label: "Memory",
    href: "/dashboard/memory",
    description: "Organization memory",
  },
  {
    key: "team",
    label: "Team",
    href: "/dashboard/team",
    description: "Members and invitations",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    description: "Workspace and AI settings",
  },
] as const;
