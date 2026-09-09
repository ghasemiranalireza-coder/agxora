"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { useT } from "@/app/lib/i18n";

type RunResult = {
  readonly message?: string;
  readonly requiresApproval?: boolean;
  readonly understood?: readonly string[];
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

export function AgentCommandPanel(): JSX.Element {
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
    <section style={{ marginBottom: 24 }}>
      <h2 className="agx-ui-section-title">{t("businessAgent.commandCenter")}</h2>
      <p className="agx-ui-section-lead">{t("businessAgent.commandCenterLead")}</p>
      <p>{t("businessAgent.safeModeActive")}</p>
      <p>{t("businessAgent.agentExamples")}</p>
      <label>
        {t("businessAgent.goal")}
        <input
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          style={{ display: "block", width: "100%", margin: "8px 0" }}
        />
      </label>
      <button type="button" disabled={Boolean(busy) || !goal.trim()} onClick={() => void createRun()}>
        {t("businessAgent.createPlan")}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {runs.length === 0 ? <p>{t("businessAgent.noRuns")}</p> : null}
      <ul>
        {runs.map((run) => {
          const result = runResult(run);
          return (
            <li key={run.id} style={{ marginBottom: 12 }}>
              <div>
                {run.status} · {run.goal}
              </div>
              {result.understood && result.understood.length > 0 ? (
                <div>{result.understood.join(", ")}</div>
              ) : null}
              {result.message ? <div>{result.message}</div> : null}
              {run.status === "WAITING_APPROVAL" || result.requiresApproval ? (
                <div>{t("businessAgent.waitingApproval")}</div>
              ) : null}
              {run.status === "RUNNING" && result.phase === "PLAN_APPROVED" ? (
                <div>{t("businessAgent.planApproved")}</div>
              ) : null}
              {run.status === "WAITING_APPROVAL" ? (
                <div>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void mutateRun(run.id, "approve")}
                  >
                    {t("businessAgent.approvePlan")}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void mutateRun(run.id, "reject")}
                  >
                    {t("businessAgent.rejectPlan")}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
