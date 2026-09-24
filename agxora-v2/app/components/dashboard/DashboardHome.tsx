"use client";

import { useEffect, useMemo, type JSX } from "react";
import { ChatPanel } from "../ChatPanel";
import { useLocale } from "../../lib/i18n";
import { useOrganization } from "../../lib/organization";
import { crmStore, useCrmStore } from "../../lib/crm/directory";
import { useRecentActivity } from "../../lib/backend/hooks";
import {
  FIRST_CUSTOMER_AGENTS_HREF,
  FIRST_CUSTOMER_CUSTOMER_HREF,
  FIRST_CUSTOMER_FINANCE_HREF,
} from "../../lib/workspace/firstCustomerSurface";
import { ActivityFeed } from "./ActivityFeed";
import { AttentionPanel, type AttentionItem } from "./AttentionPanel";
import { BusinessOverview } from "./BusinessOverview";
import { CommandCenter } from "./CommandCenter";
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
  const crm = useCrmStore();
  const activity = useRecentActivity();

  useEffect(() => {
    void crmStore.hydrate(organizationId);
  }, [organizationId]);

  const attention = useMemo((): readonly AttentionItem[] => {
    const items: AttentionItem[] = [];
    if (crm.hydrated && crm.items.length === 0) {
      items.push({
        id: "customers",
        title: t("dashboard.attention.addCustomer.title"),
        detail: t("dashboard.attention.addCustomer.detail"),
        href: FIRST_CUSTOMER_CUSTOMER_HREF,
        tone: "action",
      });
    }
    if (items.length < 3) {
      items.push({
        id: "finance",
        title: t("dashboard.quickActions.finance.label"),
        detail: t("dashboard.quickActions.finance.description"),
        href: FIRST_CUSTOMER_FINANCE_HREF,
        tone: "action",
      });
    }
    if (activity.length === 0 && items.length < 3) {
      items.push({
        id: "explore",
        title: t("dashboard.attention.exploreAi.title"),
        detail: t("dashboard.attention.exploreAi.detail"),
        href: FIRST_CUSTOMER_AGENTS_HREF,
        tone: "info",
      });
    }
    return items.slice(0, 3);
  }, [activity.length, crm.hydrated, crm.items.length, t]);

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
      customers: crm.items.length,
      projects: 0,
      updates: today,
    });
  }, [activity, crm.items.length, organization?.name, t]);

  return (
    <div className="agx-dashboard-home">
      <HeroSection />
      <CommandCenter />
      <AttentionPanel items={attention} summary={summary} />
      <BusinessOverview />
      <QuickActions />
      <div className="agx-bottom-grid" style={{ display: "grid", gap: "22px" }}>
        <ActivityFeed items={activity} />
        <ChatPanel />
      </div>
    </div>
  );
}
