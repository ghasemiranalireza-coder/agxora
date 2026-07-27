/**
 * Universal BusinessType taxonomy for the AGXORA AI Business Operating System.
 *
 * Templates and the Business Brain specialize behavior by type.
 * Core engines remain industry-agnostic.
 */

export const BUSINESS_TYPES = [
  "hotel",
  "restaurant",
  "cleaning",
  "laundry",
  "construction",
  "healthcare",
  "medical",
  "manufacturing",
  "retail",
  "legal",
  "accounting",
  "consulting",
  "real_estate",
  "education",
  "automotive",
  "beauty",
  "fitness",
  "agriculture",
  "transport",
  "logistics",
  "warehouse",
  "insurance",
  "finance",
  "financial_services",
  "technology",
  "saas",
  "ecommerce",
  "agency",
  "freelancer",
  "government",
  "nonprofit",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type BusinessSize =
  | "solo"
  | "micro"
  | "small"
  | "medium"
  | "large"
  | "enterprise";

export function isBusinessType(value: unknown): value is BusinessType {
  return (
    typeof value === "string" &&
    (BUSINESS_TYPES as readonly string[]).includes(value)
  );
}

export interface BusinessTypeMeta {
  readonly type: BusinessType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly industryFamily: string;
}

export const BUSINESS_TYPE_META: readonly BusinessTypeMeta[] = [
  { type: "hotel", label: "Hotel", description: "Hospitality, rooms, guests, and property operations", icon: "H", industryFamily: "hospitality" },
  { type: "restaurant", label: "Restaurant", description: "Dining, kitchen, reservations, and guest experience", icon: "R", industryFamily: "hospitality" },
  { type: "cleaning", label: "Cleaning", description: "Commercial and residential cleaning operations", icon: "K", industryFamily: "services" },
  { type: "laundry", label: "Laundry", description: "Wash plants, pickup routes, and textile care", icon: "L", industryFamily: "services" },
  { type: "construction", label: "Construction", description: "Jobsites, crews, materials, and project delivery", icon: "B", industryFamily: "industrial" },
  { type: "healthcare", label: "Healthcare", description: "Care networks, patients, and clinical operations", icon: "H+", industryFamily: "health" },
  { type: "medical", label: "Medical", description: "Clinics, appointments, and care teams", icon: "C", industryFamily: "health" },
  { type: "manufacturing", label: "Manufacturing", description: "Production lines, quality, and supply operations", icon: "M", industryFamily: "industrial" },
  { type: "retail", label: "Retail", description: "Stores, inventory, merchandising, and customers", icon: "S", industryFamily: "commerce" },
  { type: "legal", label: "Law Firm", description: "Matters, clients, deadlines, and billing", icon: "J", industryFamily: "professional" },
  { type: "accounting", label: "Accounting", description: "Books, clients, filings, and advisory work", icon: "A$", industryFamily: "professional" },
  { type: "consulting", label: "Consulting", description: "Engagements, deliverables, and client outcomes", icon: "Q", industryFamily: "professional" },
  { type: "real_estate", label: "Real Estate", description: "Listings, clients, showings, and transactions", icon: "E", industryFamily: "commerce" },
  { type: "education", label: "Education", description: "Programs, students, faculty, and enrollment", icon: "U", industryFamily: "public" },
  { type: "automotive", label: "Automotive", description: "Dealerships, service bays, and vehicle inventory", icon: "V", industryFamily: "commerce" },
  { type: "beauty", label: "Beauty Salon", description: "Appointments, stylists, retail, and memberships", icon: "Y", industryFamily: "services" },
  { type: "fitness", label: "Gym / Fitness", description: "Memberships, classes, trainers, and retention", icon: "F", industryFamily: "services" },
  { type: "agriculture", label: "Agriculture", description: "Crops, livestock, yields, and supply chains", icon: "G", industryFamily: "industrial" },
  { type: "transport", label: "Transport", description: "Fleet movement, routes, and passenger/cargo ops", icon: "T", industryFamily: "logistics" },
  { type: "logistics", label: "Logistics", description: "Fleet, warehouses, routes, and fulfillment", icon: "Z", industryFamily: "logistics" },
  { type: "warehouse", label: "Warehouse", description: "Storage, picking, packing, and inventory turns", icon: "W", industryFamily: "logistics" },
  { type: "insurance", label: "Insurance", description: "Policies, claims, underwriting, and retention", icon: "I", industryFamily: "finance" },
  { type: "finance", label: "Finance", description: "Capital, portfolios, and financial operations", icon: "$", industryFamily: "finance" },
  { type: "financial_services", label: "Financial Services", description: "Advisory, products, compliance, and clients", icon: "P", industryFamily: "finance" },
  { type: "technology", label: "Technology", description: "Product, engineering, and go-to-market teams", icon: "X", industryFamily: "technology" },
  { type: "saas", label: "Software / SaaS", description: "Subscriptions, usage, and customer success", icon: "A", industryFamily: "technology" },
  { type: "ecommerce", label: "E-Commerce", description: "Online catalog, carts, fulfillment, and LTV", icon: "O", industryFamily: "commerce" },
  { type: "agency", label: "Marketing Agency", description: "Clients, campaigns, retainers, and delivery", icon: "N", industryFamily: "professional" },
  { type: "freelancer", label: "Freelancer", description: "Solo practice, clients, pipeline, and cashflow", icon: "1", industryFamily: "professional" },
  { type: "government", label: "Government", description: "Public services, programs, and constituents", icon: "D", industryFamily: "public" },
  { type: "nonprofit", label: "Non-Profit", description: "Missions, donors, programs, and impact", icon: "+", industryFamily: "public" },
] as const;

export function getBusinessTypeMeta(type: BusinessType): BusinessTypeMeta {
  const meta = BUSINESS_TYPE_META.find((item) => item.type === type);
  if (!meta) {
    throw new Error(`Unknown business type: ${type}`);
  }
  return meta;
}

export function listBusinessTypesByFamily(
  family: string,
): readonly BusinessTypeMeta[] {
  return BUSINESS_TYPE_META.filter((item) => item.industryFamily === family);
}
