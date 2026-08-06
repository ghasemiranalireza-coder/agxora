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

  return (
    <div className="agx-ui-module-page agx-page-enter">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="agx-ui-section-title">AGXORA Business OS</p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          AI CRM
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          AI-native CRM and Creator Operating System — customers, pipeline, orders, delivery,
          documents, communications, and creator architecture for every industry.
        </p>
      </motion.header>

      <CrmSection id="crm-kpis" title="CRM Dashboard" delay={0.04}>
        <CrmKpiOverview metrics={CRM_KPI_METRICS} />
      </CrmSection>

      <CrmSection
        id="customer-360"
        title="Customer 360°"
        subtitle="Profile, company, contacts, orders, invoices, Lieferscheine, payments, documents, timeline, activities, notes, AI summary, and communication history."
        delay={0.06}
      >
        <Customer360Panel customer={CUSTOMER_360} />
      </CrmSection>

      <CrmSection
        id="sales-pipeline"
        title="Sales Pipeline"
        subtitle="Kanban stages with drag & drop — Lead, Qualified, Proposal, Negotiation, Won, Lost."
        delay={0.08}
      >
        <SalesPipeline initialDeals={PIPELINE_DEALS} />
      </CrmSection>

      <CrmSection id="orders" title="Orders Module" delay={0.1}>
        <OrdersModule orders={CRM_ORDERS} />
      </CrmSection>

      <CrmSection
        id="delivery"
        title="Delivery Module"
        subtitle="Professional Lieferschein system with tracking, signature, QR, and barcode readiness."
        delay={0.12}
      >
        <DeliveryModule notes={DELIVERY_NOTES} />
      </CrmSection>

      <CrmSection
        id="documents"
        title="Documents"
        subtitle="Quotes, contracts, invoices, Lieferschein, purchase orders, receipts — with AI search."
        delay={0.14}
      >
        <DocumentsModule documents={CRM_DOCUMENTS} />
      </CrmSection>

      <CrmSection id="tasks" title="Tasks" delay={0.16}>
        <TasksModule tasks={CRM_TASKS} />
      </CrmSection>

      <CrmSection
        id="communication-hub"
        title="Communication Hub"
        subtitle="Adapter registry for messaging, social, email, voice, and videos only."
        delay={0.18}
      >
        <CommunicationHub channels={COMMUNICATION_CHANNELS} />
      </CrmSection>

      <CrmSection
        id="creator-studio"
        title="Creator Studio Foundation"
        subtitle="Platform adapters ready for official integrations later."
        delay={0.2}
      >
        <CreatorStudio platforms={CREATOR_PLATFORMS} />
      </CrmSection>

      <CrmSection
        id="ai-creator"
        title="AI Creator"
        subtitle="Enterprise capability map for content, calendar, generation, and publishing."
        delay={0.22}
      >
        <AiCreatorPanel capabilities={AI_CREATOR_CAPABILITIES} />
      </CrmSection>

      <CrmSection
        id="industry-platform"
        title="Universal Business Platform"
        subtitle="Modular industry registry — every vertical can receive dedicated AI modules."
        delay={0.24}
      >
        <IndustryPlatform industries={INDUSTRY_MODULES} />
      </CrmSection>
    </div>
  );
}
