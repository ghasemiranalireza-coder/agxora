"use client";

import { useState, type FormEvent, type JSX } from "react";
import { Button, Card, FormField, FormTextArea } from "@/app/components/ui";
import { localizeThrownError, useT } from "@/app/lib/i18n";
import { useAgentOperatingSystem } from "../hooks";
import { startBusinessGoal } from "../orchestration/goalService";
import { agentOsService } from "../services";
import type { AgentPlan, BusinessGoal, PlanStep } from "../types";

function companyName(plan: AgentPlan | undefined, fallback: string): string {
  const load = plan?.steps.find(
    (step) => step.presentationKey === "load" || step.presentationKey === "customer",
  );
  const result = load?.result;
  if (result && typeof result === "object" && result !== null && "customer" in result) {
    const customer = (result as { customer?: { companyName?: string } }).customer;
    if (customer?.companyName) return customer.companyName;
  }
  return fallback;
}

function stepLabel(step: PlanStep): string {
  if (step.status === "blocked" && step.approvalRequired) return "waiting_for_approval";
  if (step.status === "completed" && step.verification === "verified") return "verified";
  if (step.status === "completed" && step.capabilityId === "CRM_CREATE_NOTE") {
    return "succeeded";
  }
  if (step.status === "failed") return "failed";
  if (step.status === "cancelled") return "cancelled";
  if (step.status === "running") return "running";
  if (step.status === "completed") return "completed";
  return "pending";
}

function showMessage(
  t: (key: string, values?: Readonly<Record<string, string | number>>) => string,
  message: string | undefined,
): string | null {
  if (!message) return null;
  if (/^[a-z][a-zA-Z0-9_.-]*\.[a-zA-Z0-9_.-]+$/.test(message)) return t(message);
  return message;
}

export function BusinessGoalPanel(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const goal: BusinessGoal | undefined = aos.businessGoals[0];
  const plan = goal
    ? aos.plans.find((item) => item.id === goal.planId)
    : undefined;
  const company = companyName(plan, t("agents.businessGoal.thisCustomer"));
  const emailPlan = Boolean(
    plan?.steps.some((step) => step.capabilityId === "COMMUNICATION_SEND_EMAIL"),
  );
  const draftStep = plan?.steps.find((step) => step.capabilityId === "COMMUNICATION_PREPARE_EMAIL");
  const draftRecord =
    draftStep?.result && typeof draftStep.result === "object" && draftStep.result !== null
      ? (draftStep.result as { draft?: { to?: string; subject?: string; body?: string } }).draft
      : undefined;
  const approval = goal
    ? aos.approvals.find(
        (item) => item.taskId === goal.taskId && item.state === "REQUIRES_APPROVAL",
      )
    : undefined;
  const remaining =
    plan?.steps.filter(
      (step) => step.status === "pending" || step.status === "blocked" || step.status === "running",
    ).length ?? 0;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const runtime = aos.runtimes.find((item) => item.agentId === "crm_assistant");
    if (!runtime) {
      setFormError(t("agents.businessGoal.errors.noCrm"));
      return;
    }
    setBusy(true);
    try {
      await startBusinessGoal({
        organizationId: aos.organizationId,
        agentInstanceId: runtime.instanceId,
        statement,
      });
      setFormError(null);
      setStatement("");
    } catch (error) {
      setFormError(localizeThrownError(t, error, "agents.businessGoal.errors.unsupported"));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (state: "APPROVED" | "REJECTED") => {
    if (!approval) return;
    setBusy(true);
    try {
      await agentOsService.resolveApproval({
        approvalId: approval.id,
        state,
        decidedBy: aos.userId ?? "signed-in-user",
      });
      setFormError(null);
    } catch (error) {
      setFormError(localizeThrownError(t, error, "agents.notice.taskFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4" padding="20px" hover={false}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("agents.businessGoal.title")}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.businessGoal.subtitle")}
        </p>
      </div>
      <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <FormField label={t("agents.businessGoal.fieldLabel")}>
          <FormTextArea
            rows={3}
            value={statement}
            placeholder={t("agents.businessGoal.placeholder")}
            onChange={(event) => setStatement(event.target.value)}
            data-testid="business-goal-input"
          />
        </FormField>
        <Button type="submit" size="sm" disabled={busy || statement.trim().length === 0}>
          {t("agents.businessGoal.submit")}
        </Button>
      </form>
      {formError ? (
        <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }} role="alert">
          {formError}
        </p>
      ) : null}
      {goal && plan ? (
        <div className="space-y-3" data-testid="business-goal-panel" data-goal-status={goal.status}>
          <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
            {goal.statement}
          </p>
          {plan.plannerContext ? (
            <ul className="space-y-1" data-testid="business-goal-context">
              {plan.plannerContext.facts.map((fact) => (
                <li
                  key={`${fact.provenance}:${fact.key}`}
                  className="text-xs"
                  data-provenance={fact.provenance}
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {fact.provenance}: {fact.text}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }} data-plan-status={plan.status ?? "ready"}>
            {t(`agents.businessGoal.goalStatus.${goal.status}`)}
            {" · "}
            {t("agents.businessGoal.remains", { count: remaining })}
          </p>
          <ol className="space-y-2">
            {plan.steps.map((step, index) => {
              const label = stepLabel(step);
              return (
                <li
                  key={step.id}
                  className="rounded-md border px-3 py-2"
                  style={{ borderColor: "var(--agx-border, rgba(255,255,255,0.08))" }}
                  data-step={step.presentationKey ?? step.id}
                  data-step-status={label}
                  data-depends-on={step.dependsOn.join(",")}
                >
                  <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                    {index + 1}.{" "}
                    {step.presentationKey
                      ? t(`agents.businessGoal.steps.${step.presentationKey}.title`, { company })
                      : step.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {step.presentationKey
                      ? t(`agents.businessGoal.steps.${step.presentationKey}.reason`, { company })
                      : null}
                  </p>
                  <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.businessGoal.approvalLabel")}
                    {": "}
                    {step.approvalRequired
                      ? t("agents.businessGoal.approvalYes")
                      : t("agents.businessGoal.approvalNo")}
                    {" · "}
                    {t(`agents.businessGoal.stepStatus.${label}`)}
                  </p>
                  {label === "waiting_for_approval" ? (
                    <p className="text-xs" data-waiting-reason="approval" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                      {step.capabilityId === "COMMUNICATION_SEND_EMAIL"
                        ? "Waiting for approval before sending email."
                        : "Waiting for approval before the protected change."}
                    </p>
                  ) : null}
                  {step.error ? (
                    <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>
                      {showMessage(t, step.error)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {approval ? (
            <div className="space-y-2 rounded-md border px-3 py-3" data-testid="business-goal-approval">
              <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>
                {emailPlan
                  ? t("agents.businessGoal.email.wants", { company })
                  : t("agents.businessGoal.wants", { company })}
              </p>
              {emailPlan && draftRecord ? (
                <div className="space-y-1 text-xs" data-testid="business-goal-email-draft">
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.businessGoal.email.to")}: {draftRecord.to}
                  </p>
                  <p style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                    {t("agents.businessGoal.email.subject")}: {draftRecord.subject}
                  </p>
                  <p style={{ color: "var(--agx-text, #f8fafc)", whiteSpace: "pre-wrap" }}>
                    {draftRecord.body}
                  </p>
                </div>
              ) : null}
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {emailPlan
                  ? t("agents.businessGoal.email.because")
                  : t("agents.businessGoal.because", { company })}
              </p>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                {emailPlan
                  ? t("agents.businessGoal.email.change", { company })
                  : t("agents.businessGoal.change", { company })}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => void decide("APPROVED")}>
                  {t("agents.actions.approve")}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void decide("REJECTED")}>
                  {t("agents.actions.reject")}
                </Button>
              </div>
            </div>
          ) : null}
          <p
            className="text-sm"
            data-result={
              goal.status === "completed"
                ? "verified"
                : goal.status === "failed"
                  ? "failed"
                  : goal.status === "cancelled"
                    ? "cancelled"
                    : approval
                      ? "waiting"
                      : "working"
            }
            style={{
              color:
                goal.status === "failed"
                  ? "var(--agx-danger, #f87171)"
                  : "var(--agx-text, #f8fafc)",
            }}
          >
            {goal.status === "completed"
              ? emailPlan
                ? t("agents.businessGoal.result.emailQueued", {
                    recipient: draftRecord?.to ?? company,
                  })
                : t("agents.businessGoal.result.verified", { company })
              : goal.status === "failed"
                ? showMessage(t, goal.error) ?? t("agents.businessGoal.result.failed")
                : goal.status === "cancelled"
                  ? t("agents.businessGoal.result.cancelled")
                    : approval
                      ? t(
                          emailPlan
                            ? "agents.businessGoal.result.emailWaiting"
                            : "agents.businessGoal.result.waiting",
                        )
                      : t("agents.businessGoal.result.working")}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
