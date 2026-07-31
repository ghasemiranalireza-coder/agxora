import type { CrmCustomerRecord } from "./types";

export type CrmAnalytics = {
  readonly total: number;
  readonly active: number;
  readonly vip: number;
  readonly leads: number;
  readonly prospects: number;
  readonly newThisMonth: number;
  readonly conversionPlaceholder: number;
  readonly growthByMonth: readonly {
    readonly label: string;
    readonly count: number;
  }[];
  readonly statusBreakdown: readonly {
    readonly status: string;
    readonly count: number;
    readonly percent: number;
  }[];
};

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function computeCrmAnalytics(
  customers: readonly CrmCustomerRecord[],
): CrmAnalytics {
  const total = customers.length;
  const active = customers.filter((row) => row.status === "active").length;
  const vip = customers.filter((row) => row.status === "vip").length;
  const leads = customers.filter((row) => row.status === "lead").length;
  const prospects = customers.filter((row) => row.status === "prospect").length;

  const now = new Date();
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const newThisMonth = customers.filter((row) =>
    row.createdAt.startsWith(monthPrefix),
  ).length;

  const converted = customers.filter(
    (row) => row.status === "active" || row.status === "vip",
  ).length;
  const funnel = leads + prospects + converted;
  const conversionPlaceholder =
    funnel === 0 ? 0 : Math.round((converted / funnel) * 100);

  const months: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    months.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }

  const growthByMonth = months.map((label) => ({
    label,
    count: customers.filter((row) => monthKey(row.createdAt) === label).length,
  }));

  const statuses = [
    "lead",
    "prospect",
    "active",
    "inactive",
    "vip",
    "archived",
  ] as const;
  const statusBreakdown = statuses.map((status) => {
    const count = customers.filter((row) => row.status === status).length;
    return {
      status,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });

  return {
    total,
    active,
    vip,
    leads,
    prospects,
    newThisMonth,
    conversionPlaceholder,
    growthByMonth,
    statusBreakdown,
  };
}
