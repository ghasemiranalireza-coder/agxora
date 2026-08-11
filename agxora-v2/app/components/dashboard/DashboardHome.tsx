"use client";

import { useEffect, useMemo, type JSX } from "react";
import { ChatPanel } from "../ChatPanel";
import { useLocale } from "../../lib/i18n";
import { useOrganization } from "../../lib/organization";
import { customerStore, useCustomerStore } from "../../lib/customers";
import { projectStore, useProjectStore } from "../../lib/projects";
import { useRecentActivity } from "../../lib/backend/hooks";
import { ActivityFeed } from "./ActivityFeed";
import { AttentionPanel, type AttentionItem } from "./AttentionPanel";
import { BusinessOverview } from "./BusinessOverview";
import { HeroSection } from "./HeroSection";
import { QuickActions } from "./QuickActions";
import "./dashboard.css";

const LOCAL_ORG_FALLBACK = "org_local_default";

/**
 * Dashboard home — premium command center.
 * Answers: what is happening, what needs attention, what changed, what next.
 */
export function DashboardHome(): JSX.Element {
  const { t } = useLocale();
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? LOCAL_ORG_FALLBACK;
  const customers = useCustomerStore();
  const projects = useProjectStore();
  const activity = useRecentActivity();

  useEffect(() => {
    void customerStore.hydrate(organizationId);
    void projectStore.hydrate(organizationId);
  }, [organizationId]);

  const attention = useMemo((): readonly AttentionItem[] => {
    const items: AttentionItem[] = [];
    if (customers.hydrated && customers.items.length === 0) {
      items.push({
        id: "customers",
        title: t("dashboard.attention.addCustomer.title"),
        detail: t("dashboard.attention.addCustomer.detail"),
        href: "/dashboard/customers",
        tone: "action",
      });
    }
    if (projects.hydrated && projects.items.length === 0) {
      items.push({
        id: "projects",
        title: t("dashboard.attention.createProject.title"),
        detail: t("dashboard.attention.createProject.detail"),
        href: "/dashboard/projects",
        tone: "action",
      });
    }
    if (activity.length === 0 && items.length < 3) {
      items.push({
        id: "explore",
        title: t("dashboard.attention.exploreAi.title"),
        detail: t("dashboard.attention.exploreAi.detail"),
        href: "/dashboard/ai",
        tone: "info",
      });
    }
    if (items.length < 3) {
      items.push({
        id: "billing",
        title: t("dashboard.attention.reviewBilling.title"),
        detail: t("dashboard.attention.reviewBilling.detail"),
        href: "/dashboard/billing",
        tone: "info",
      });
    }
    return items.slice(0, 3);
  }, [
    customers.hydrated,
    customers.items.length,
    projects.hydrated,
    projects.items.length,
    activity.length,
    t,
  ]);

  const summary = useMemo(() => {
    const today = activity.filter((row) => {
      const d = new Date(row.createdAt);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
    const name = organization?.name ?? t("dashboard.overview.fallbackName");
    return t("dashboard.summary", {
      name,
      customers: customers.items.length,
      projects: projects.items.length,
      updates: today,
    });
  }, [
    activity,
    customers.items.length,
    organization?.name,
    projects.items.length,
    t,
  ]);

  return (
    <div className="agx-dashboard-home agx-page-enter">
      <HeroSection />
      <AttentionPanel items={attention} summary={summary} />
      <QuickActions />
      <BusinessOverview />
      <div className="agx-bottom-grid" style={{ display: "grid", gap: "22px" }}>
        <ActivityFeed items={activity} />
        <ChatPanel />
      </div>
    </div>
  );
}
