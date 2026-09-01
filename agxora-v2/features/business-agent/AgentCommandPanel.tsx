"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { useT } from "@/app/lib/i18n";

type Run = {
  readonly id: string;
  readonly goal: string;
  readonly status: string;
  readonly createdAt: string;
};

export function AgentCommandPanel(): JSX.Element {
  const t = useT();
  const [goal, setGoal] = useState("");
  const [runs, setRuns] = useState<readonly Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const response = await fetch("/api/v1/agent-runs", { credentials: "include" });
    const body = await response.json();
    if (!body.ok) {
      throw new Error(body.message || t("businessAgent.loadFailed"));
    }
    setRuns(body.runs ?? []);
  }, [t]);

  useEffect(() => {
    void reload().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
    });
  }, [reload, t]);

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

  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="agx-ui-section-title">{t("businessAgent.commandCenter")}</h2>
      <p className="agx-ui-section-lead">{t("businessAgent.commandCenterLead")}</p>
      <label>
        {t("businessAgent.goal")}
        <input
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          style={{ display: "block", width: "100%", margin: "8px 0" }}
        />
      </label>
      <button type="button" disabled={busy || !goal.trim()} onClick={() => void createRun()}>
        {t("businessAgent.createPlan")}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {runs.map((run) => (
          <li key={run.id}>
            {run.status} · {run.goal}
          </li>
        ))}
      </ul>
    </section>
  );
}
