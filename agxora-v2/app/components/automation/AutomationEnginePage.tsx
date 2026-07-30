"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AUTOMATION_INTEGRATIONS,
  AUTOMATION_KPIS,
  DEFAULT_WORKFLOW,
  WORKFLOW_RUNS,
  WORKFLOW_TEMPLATES,
  type WorkflowDefinition,
} from "../../lib/automation";
import { Card, Section, Skeleton } from "../ui";
import { AiWorkflowAssistant } from "./AiWorkflowAssistant";
import { AutomationKpiOverview } from "./AutomationKpiOverview";
import { WorkflowBuilder } from "./WorkflowBuilder";

const WorkflowHistory = dynamic(
  () => import("./WorkflowHistory").then((m) => m.WorkflowHistory),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Loading workflow history…" />,
  },
);

const WorkflowTemplates = dynamic(
  () => import("./WorkflowTemplates").then((m) => m.WorkflowTemplates),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Loading template library…" />,
  },
);

const AutomationIntegrations = dynamic(
  () => import("./AutomationIntegrations").then((m) => m.AutomationIntegrations),
  {
    ssr: false,
    loading: () => <SectionSkeleton label="Loading integration center…" />,
  },
);

function SectionSkeleton({ label }: { readonly label: string }): JSX.Element {
  return (
    <Card padding="20px" hover={false}>
      <p className="mb-4 text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {label}
      </p>
      <div className="space-y-3">
        <Skeleton height={40} width="100%" />
        <Skeleton height={96} width="100%" />
        <Skeleton height={96} width="66%" />
      </div>
    </Card>
  );
}

/**
 * AI Workflow & Automation Engine — enterprise polish layer.
 * Additive module; does not modify Hero, Finance, CRM, or Creator Studio.
 */
export function AutomationEnginePage(): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(DEFAULT_WORKFLOW);
  const [builderKey, setBuilderKey] = useState(DEFAULT_WORKFLOW.id);
  const [assistantOpen, setAssistantOpen] = useState(true);

  const onWorkflowChange = useCallback((next: WorkflowDefinition) => {
    setWorkflow(next);
  }, []);

  const onUseTemplate = useCallback((next: WorkflowDefinition) => {
    setWorkflow(next);
    setBuilderKey(next.id);
    document.getElementById("workflow-builder")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

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
        subtitle="Node-based canvas with snap-to-grid, smooth zoom & pan, connection hover, and empty-state guidance."
        delay={0.06}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <WorkflowBuilder
            key={builderKey}
            initial={workflow}
            onWorkflowChange={onWorkflowChange}
          />
          {assistantOpen ? (
            <div className="xl:sticky xl:top-4 xl:self-start">
              <AiWorkflowAssistant
                workflow={workflow}
                onClose={() => setAssistantOpen(false)}
              />
            </div>
          ) : (
            <Card
              className="flex items-center justify-center"
              padding="20px"
              hover={false}
            >
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  outlineColor: "var(--agx-accent, #22d3ee)",
                  borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
                  color: "var(--agx-text, #f8fafc)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                Open AI Workflow Assistant
              </button>
            </Card>
          )}
        </div>
      </Section>

      <Section
        id="workflow-history"
        title="Workflow History"
        subtitle="Execution log with colored status, clickable rows, and a full execution inspector."
        delay={0.08}
      >
        <WorkflowHistory runs={WORKFLOW_RUNS} />
      </Section>

      <Section
        id="workflow-templates"
        title="Templates"
        subtitle="Preview before load — node counts, difficulty, runtime, and recommended use cases."
        delay={0.1}
      >
        <WorkflowTemplates
          templates={WORKFLOW_TEMPLATES}
          onUseTemplate={onUseTemplate}
        />
      </Section>

      <Section
        id="automation-integrations"
        title="Integration Center"
        subtitle="Adapter registry only — Connected, Beta, Planned, Coming Soon, Disabled. No live APIs."
        delay={0.12}
      >
        <AutomationIntegrations integrations={AUTOMATION_INTEGRATIONS} />
      </Section>
    </div>
  );
}
