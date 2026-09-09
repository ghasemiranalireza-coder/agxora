"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { AGCommandInput } from "@/app/components/ag/AGCommandInput";
import { AGStatus } from "@/app/components/ag/AGStatus";
import { Button } from "@/app/components/ui/Button";
import { useT } from "@/app/lib/i18n";

type RunResult = {
  readonly message?: string;
  readonly requiresApproval?: boolean;
  readonly phase?: string;
};

type Run = {
  readonly id: string;
  readonly goal: string;
  readonly status: string;
  readonly createdAt: string;
  readonly result?: RunResult | null;
};

function runResult(run: Run): RunResult {
  const result = run.result;
  if (!result || typeof result !== "object") return {};
  return result;
}

function statusKey(status: string): string {
  switch (status) {
    case "WAITING_APPROVAL":
      return "waiting";
    case "RUNNING":
      return "running";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    default:
      return "running";
  }
}

export function AgentCommandPanel({
  compact = false,
}: {
  readonly compact?: boolean;
}): JSX.Element {
  const t = useT();
  const [goal, setGoal] = useState("");
  const [runs, setRuns] = useState<readonly Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | boolean>(false);

  const reload = useCallback(async () => {
    const response = await fetch("/api/v1/agent-runs", { credentials: "include" });
    const body = await response.json();
    if (!body.ok) {
      throw new Error(body.message || t("businessAgent.loadFailed"));
    }
    setRuns(body.runs ?? []);
  }, [t]);

  useEffect(() => {
    void fetch("/api/v1/agent-runs", { credentials: "include" })
      .then((r) => r.json())
      .then((body) => {
        if (!body.ok) {
          setError(body.message || t("businessAgent.loadFailed"));
          return;
        }
        setRuns(body.runs ?? []);
      })
      .catch(() => setError(t("businessAgent.loadFailed")));
  }, [t]);

  async function createRun() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/agent-runs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const body = await response.json();
      if (!body.ok) {
        throw new Error(body.message || t("businessAgent.runFailed"));
      }
      setGoal("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.runFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function mutateRun(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/v1/agent-runs/${id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!body.ok) {
        throw new Error(body.message || t("businessAgent.approveFailed"));
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.approveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="agx-agent-panel" aria-label={t("businessAgent.commandCenter")}>
      {compact ? null : (
        <>
          <h2 className="agx-ui-section-title">{t("businessAgent.commandCenter")}</h2>
          <p className="agx-ui-section-lead">{t("businessAgent.commandCenterLead")}</p>
        </>
      )}
      <p className="agx-agent-panel__safe">{t("businessAgent.safeModeActive")}</p>
      <p className="agx-agent-panel__examples">{t("businessAgent.agentExamples")}</p>
      <AGCommandInput
        id="agx-agent-goal"
        label={t("businessAgent.goal")}
        value={goal}
        onChange={setGoal}
        placeholder={t("businessAgent.goalPlaceholder")}
        disabled={Boolean(busy)}
        submitLabel={t("businessAgent.createPlan")}
        onSubmit={() => void createRun()}
      />
      <div className="agx-agent-panel__chips">
        {(
          [
            "exampleSummarize",
            "exampleYoutube",
            "exampleLinkedin",
            "exampleAnalyze",
          ] as const
        ).map((key) => (
          <button
            key={key}
            type="button"
            className="agx-agent-panel__chip"
            disabled={Boolean(busy)}
            onClick={() => setGoal(t(`businessAgent.${key}`))}
          >
            {t(`businessAgent.${key}`)}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="agx-agent-panel__error">
          {error}
        </p>
      ) : null}
      {runs.length === 0 ? (
        <p className="agx-agent-panel__empty">{t("businessAgent.noRuns")}</p>
      ) : null}
      <ul className="agx-agent-panel__runs">
        {runs.map((run) => {
          const result = runResult(run);
          const visual = statusKey(run.status);
          return (
            <li key={run.id} className="agx-agent-panel__run">
              <div className="agx-agent-panel__run-head">
                <AGStatus status={visual}>
                  {t(`businessAgent.runStatus.${visual}`)}
                </AGStatus>
                <span className="agx-agent-panel__goal">{run.goal}</span>
              </div>
              {result.message ? (
                <p className="agx-agent-panel__message">{result.message}</p>
              ) : null}
              {run.status === "WAITING_APPROVAL" || result.requiresApproval ? (
                <p className="agx-agent-panel__note">{t("businessAgent.waitingApproval")}</p>
              ) : null}
              {run.status === "RUNNING" && result.phase === "PLAN_APPROVED" ? (
                <p className="agx-agent-panel__note">{t("businessAgent.planApproved")}</p>
              ) : null}
              {run.status === "WAITING_APPROVAL" ? (
                <div className="agx-agent-panel__actions">
                  <Button
                    variant="premium"
                    disabled={Boolean(busy)}
                    onClick={() => void mutateRun(run.id, "approve")}
                  >
                    {t("businessAgent.approvePlan")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() => void mutateRun(run.id, "reject")}
                  >
                    {t("businessAgent.rejectPlan")}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
