import type { IndustryModulePlan } from "./types";

/**
 * Universal Business Platform — industry module registry.
 * Onboarding will later select an industry; each gets dedicated AI modules.
 * No industry-specific logic is hard-wired yet — architecture only.
 */
export const INDUSTRY_MODULES: readonly IndustryModulePlan[] = [
  {
    key: "business",
    label: "Business",
    description: "General B2B operating system",
    plannedModules: ["CRM", "Sales", "Finance", "Projects"],
    status: "ready",
  },
  {
    key: "freelancer",
    label: "Freelancer",
    description: "Solo operator CRM, invoices, and client pipeline",
    plannedModules: ["Clients", "Proposals", "Time Tracking", "Invoices"],
    status: "planned",
  },
  {
    key: "creator",
    label: "Creator",
    description: "Creator Studio + brand CRM",
    plannedModules: ["Creator Studio", "Brand Deals", "Content Calendar"],
    status: "planned",
  },
  {
    key: "influencer",
    label: "Influencer",
    description: "Sponsorship CRM and campaign OS",
    plannedModules: ["Sponsorships", "Audience Insights", "Campaigns"],
    status: "planned",
  },
  {
    key: "agency",
    label: "Agency",
    description: "Multi-client delivery and retainers",
    plannedModules: ["Client Portals", "Retainers", "Campaign Ops"],
    status: "planned",
  },
  {
    key: "retail",
    label: "Retail",
    description: "Store inventory, POS, and loyalty",
    plannedModules: ["Inventory", "POS", "Loyalty"],
    status: "planned",
  },
  {
    key: "restaurant",
    label: "Restaurant",
    description: "Reservations, kitchen, and delivery",
    plannedModules: ["Reservations", "Menu", "Kitchen Display"],
    status: "planned",
  },
  {
    key: "hotel",
    label: "Hotel",
    description: "Rooms, guests, and housekeeping",
    plannedModules: ["Reservations", "Housekeeping", "Guest CRM"],
    status: "planned",
  },
  {
    key: "laundry",
    label: "Laundry",
    description: "Pickup, tickets, and route logistics",
    plannedModules: ["Tickets", "Routes", "Lieferschein"],
    status: "planned",
  },
  {
    key: "healthcare",
    label: "Healthcare",
    description: "Patients, appointments, compliance",
    plannedModules: ["Patients", "Appointments", "Compliance"],
    status: "planned",
  },
  {
    key: "law_firm",
    label: "Law Firm",
    description: "Matters, billing, and document vault",
    plannedModules: ["Matters", "Billing", "Documents"],
    status: "planned",
  },
  {
    key: "accounting",
    label: "Accounting",
    description: "Client books and DATEV-ready exports",
    plannedModules: ["Client Books", "DATEV", "Tax Deadlines"],
    status: "planned",
  },
  {
    key: "construction",
    label: "Construction",
    description: "Sites, crews, and progress billing",
    plannedModules: ["Sites", "Crews", "Progress Billing"],
    status: "planned",
  },
  {
    key: "real_estate",
    label: "Real Estate",
    description: "Listings, viewings, and closings",
    plannedModules: ["Listings", "Viewings", "Closings"],
    status: "planned",
  },
  {
    key: "education",
    label: "Education",
    description: "Students, courses, and enrollment",
    plannedModules: ["Students", "Courses", "Enrollment"],
    status: "planned",
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    description: "BOM, production, and QC",
    plannedModules: ["BOM", "Production", "QC"],
    status: "planned",
  },
  {
    key: "logistics",
    label: "Logistics",
    description: "Fleet, tracking, and delivery notes",
    plannedModules: ["Fleet", "Tracking", "Lieferschein"],
    status: "planned",
  },
  {
    key: "ecommerce",
    label: "E-commerce",
    description: "Catalog, carts, and omnichannel orders",
    plannedModules: ["Catalog", "Orders", "Fulfillment"],
    status: "planned",
  },
] as const;
