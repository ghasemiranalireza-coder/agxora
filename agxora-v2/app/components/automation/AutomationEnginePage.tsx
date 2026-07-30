"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AUTOMATION_INTEGRATIONS,
  AUTOMATION_KPIS,
  DEFAULT_WORKFLOW,
  WORKFLOW_RUNS,
  WORKFLOW_TEMPLATES,
} from "../../lib/automation";
import { Section } from "../ui";
import { AutomationIntegrations } from "./AutomationIntegrations";
import { AutomationKpiOverview } from "./AutomationKpiOverview";
import { WorkflowBuilder } from "./WorkflowBuilder";
import { WorkflowHistory } from "./WorkflowHistory";
import { WorkflowTemplates } from "./WorkflowTemplates";

/**
 * AI Workflow & Automation Engine — enterprise foundation.
 * Additive module; does not modify Hero, Finance, CRM, or Creator Studio.
 */
export function AutomationEnginePage(): JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <motion.header
        className="space-y-2"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--agx-accent, #22d3ee)" }}
        >
          AGXORA Automation OS
        </p>
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--agx-text, #f8fafc)", letterSpacing: "-0.03em" }}
        >
          Automation
        </h1>
        <p className="max-w-2xl text-sm sm:text-base" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          Enterprise AI Workflow & Automation Engine — the connective tissue for CRM, Finance,
          Creator Studio, and every future AGXORA module.
        </p>
      </motion.header>

      <Section id="automation-kpis" title="Dashboard" delay={0.04}>
        <AutomationKpiOverview metrics={AUTOMATION_KPIS} />
      </Section>

      <Section
        id="workflow-builder"
        title="Workflow Builder"
        subtitle="Node-based canvas with drag & drop, connections, zoom, pan, mini map, undo / redo, and auto save."
        delay={0.06}
      >
        <WorkflowBuilder initial={DEFAULT_WORKFLOW} />
      </Section>

      <Section
        id="workflow-history"
        title="Workflow History"
        subtitle="Execution log with status, duration, success, failed, retry, and details."
        delay={0.08}
      >
        <WorkflowHistory runs={WORKFLOW_RUNS} />
      </Section>

      <Section
        id="workflow-templates"
        title="Templates"
        subtitle="Customer Onboarding, Invoice Reminder, Lead Follow-up, Welcome Email, Sales Pipeline, Recruitment, Content Publishing, Approval Process."
        delay={0.1}
      >
        <WorkflowTemplates templates={WORKFLOW_TEMPLATES} />
      </Section>

      <Section
        id="automation-integrations"
        title="Future Integrations"
        subtitle="Adapter registry only — no fake live connections."
        delay={0.12}
      >
        <AutomationIntegrations integrations={AUTOMATION_INTEGRATIONS} />
      </Section>
    </div>
  );
}
