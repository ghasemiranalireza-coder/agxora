"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AI_CREATOR_CAPABILITIES,
  COMMUNICATION_CHANNELS,
  CREATOR_PLATFORMS,
  CRM_DOCUMENTS,
  CRM_KPI_METRICS,
  CRM_ORDERS,
  CRM_TASKS,
  CUSTOMER_360,
  DELIVERY_NOTES,
  INDUSTRY_MODULES,
  PIPELINE_DEALS,
} from "../../lib/crm";
import { useLocale } from "../../lib/i18n";
import { AiCreatorPanel } from "./AiCreatorPanel";
import { CommunicationHub } from "./CommunicationHub";
import { CreatorStudio } from "./CreatorStudio";
import { CrmKpiOverview } from "./CrmKpiOverview";
import { CrmSection } from "./CrmPrimitives";
import { Customer360Panel } from "./Customer360Panel";
import { DeliveryModule } from "./DeliveryModule";
import { DocumentsModule } from "./DocumentsModule";
import { IndustryPlatform } from "./IndustryPlatform";
import { OrdersModule } from "./OrdersModule";
import { SalesPipeline } from "./SalesPipeline";
import { TasksModule } from "./TasksModule";

/**
 * AI CRM + Creator OS — enterprise module shell.
 * Additive only; never imports or mutates Hero / Globe.
 */
export function CrmPage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  // Keep render-time formatters in sync with UI locale.
  const { t } = useLocale();

  return (
    <div className="agx-ui-module-page agx-page-enter">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="agx-ui-section-title">{t("crm.page.brandOs")}</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          {t("crm.page.title")}
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("crm.page.subtitle")}
        </p>
      </motion.header>

      <CrmSection id="crm-kpis" title={t("crm.sections.crmDashboard.title")} delay={0.04}>
        <CrmKpiOverview metrics={CRM_KPI_METRICS} />
      </CrmSection>

      <CrmSection
        id="customer-360"
        title={t("crm.sections.customer360.title")}
        subtitle={t("crm.sections.customer360.subtitle")}
        delay={0.06}
      >
        <Customer360Panel customer={CUSTOMER_360} />
      </CrmSection>

      <CrmSection
        id="sales-pipeline"
        title={t("crm.sections.salesPipeline.title")}
        subtitle={t("crm.sections.salesPipeline.subtitle")}
        delay={0.08}
      >
        <SalesPipeline initialDeals={PIPELINE_DEALS} />
      </CrmSection>

      <CrmSection id="orders" title={t("crm.sections.ordersModule.title")} delay={0.1}>
        <OrdersModule orders={CRM_ORDERS} />
      </CrmSection>

      <CrmSection
        id="delivery"
        title={t("crm.sections.deliveryModule.title")}
        subtitle={t("crm.sections.deliveryModule.subtitle")}
        delay={0.12}
      >
        <DeliveryModule notes={DELIVERY_NOTES} />
      </CrmSection>

      <CrmSection
        id="documents"
        title={t("crm.sections.documentsModule.title")}
        subtitle={t("crm.sections.documentsModule.subtitle")}
        delay={0.14}
      >
        <DocumentsModule documents={CRM_DOCUMENTS} />
      </CrmSection>

      <CrmSection id="tasks" title={t("crm.sections.tasksModule.title")} delay={0.16}>
        <TasksModule tasks={CRM_TASKS} />
      </CrmSection>

      <CrmSection
        id="communication-hub"
        title={t("crm.sections.communicationHub.title")}
        subtitle={t("crm.sections.communicationHub.subtitle")}
        delay={0.18}
      >
        <CommunicationHub channels={COMMUNICATION_CHANNELS} />
      </CrmSection>

      <CrmSection
        id="creator-studio"
        title={t("crm.sections.creatorStudio.title")}
        subtitle={t("crm.sections.creatorStudio.subtitle")}
        delay={0.2}
      >
        <CreatorStudio platforms={CREATOR_PLATFORMS} />
      </CrmSection>

      <CrmSection
        id="ai-creator"
        title={t("crm.sections.aiCreator.title")}
        subtitle={t("crm.sections.aiCreator.subtitle")}
        delay={0.22}
      >
        <AiCreatorPanel capabilities={AI_CREATOR_CAPABILITIES} />
      </CrmSection>

      <CrmSection
        id="industry-platform"
        title={t("crm.sections.industryPlatform.title")}
        subtitle={t("crm.sections.industryPlatform.subtitle")}
        delay={0.24}
      >
        <IndustryPlatform industries={INDUSTRY_MODULES} />
      </CrmSection>
    </div>
  );
}
