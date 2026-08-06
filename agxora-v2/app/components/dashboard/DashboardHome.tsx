"use client";

import { useEffect, useMemo, type JSX } from "react";
import { ChatPanel } from "../ChatPanel";
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
        title: "Add your first customer",
        detail: "Build your CRM foundation with a company record.",
        href: "/dashboard/customers",
        tone: "action",
      });
    }
    if (projects.hydrated && projects.items.length === 0) {
      items.push({
        id: "projects",
        title: "Create a project",
        detail: "Track delivery work with owners, dates, and status.",
        href: "/dashboard/projects",
        tone: "action",
      });
    }
    if (activity.length === 0 && items.length < 3) {
      items.push({
        id: "explore",
        title: "Explore AI workspace",
        detail: "Ask AGXORA for summaries, drafts, or operational help.",
        href: "/dashboard/ai",
        tone: "info",
      });
    }
    if (items.length < 3) {
      items.push({
        id: "billing",
        title: "Review billing",
        detail: "Confirm plan, invoices, and usage for this workspace.",
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
    const name = organization?.name ?? "your workspace";
    return `${name}: ${customers.items.length} customers · ${projects.items.length} projects · ${today} updates today.`;
  }, [
    activity,
    customers.items.length,
    organization?.name,
    projects.items.length,
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
