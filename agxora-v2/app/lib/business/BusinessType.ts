/**
 * Universal business types for the AGXORA Operating System.
 * Templates specialize behavior; core engines stay industry-agnostic.
 */

export const BUSINESS_TYPES = [
  "hotel",
  "restaurant",
  "retail",
  "manufacturing",
  "laundry",
  "medical",
  "logistics",
  "real_estate",
  "saas",
  "agency",
  "legal",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

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
}

export const BUSINESS_TYPE_META: readonly BusinessTypeMeta[] = [
  {
    type: "hotel",
    label: "Hotel",
    description: "Hospitality, rooms, guests, and property operations",
    icon: "H",
  },
  {
    type: "restaurant",
    label: "Restaurant",
    description: "Dining, kitchen, reservations, and guest experience",
    icon: "R",
  },
  {
    type: "retail",
    label: "Retail",
    description: "Stores, inventory, merchandising, and customers",
    icon: "S",
  },
  {
    type: "manufacturing",
    label: "Manufacturing",
    description: "Production lines, quality, and supply operations",
    icon: "M",
  },
  {
    type: "laundry",
    label: "Laundry",
    description: "Wash, logistics, pickup, and delivery workflows",
    icon: "L",
  },
  {
    type: "medical",
    label: "Medical",
    description: "Clinics, patients, appointments, and care teams",
    icon: "C",
  },
  {
    type: "logistics",
    label: "Logistics",
    description: "Fleet, warehouses, routes, and fulfillment",
    icon: "G",
  },
  {
    type: "real_estate",
    label: "Real Estate",
    description: "Listings, clients, showings, and transactions",
    icon: "E",
  },
  {
    type: "saas",
    label: "SaaS",
    description: "Subscriptions, product usage, and customer success",
    icon: "A",
  },
  {
    type: "agency",
    label: "Agency",
    description: "Clients, campaigns, retainers, and delivery teams",
    icon: "Y",
  },
  {
    type: "legal",
    label: "Legal",
    description: "Matters, clients, billing, and compliance workflows",
    icon: "J",
  },
] as const;

export function getBusinessTypeMeta(type: BusinessType): BusinessTypeMeta {
  const meta = BUSINESS_TYPE_META.find((item) => item.type === type);
  if (!meta) {
    throw new Error(`Unknown business type: ${type}`);
  }
  return meta;
}
