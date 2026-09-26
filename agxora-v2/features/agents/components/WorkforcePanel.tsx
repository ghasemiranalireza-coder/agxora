"use client";

import { useState, type JSX } from "react";
import { Button, Card } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";
import { useAgentOperatingSystem } from "../hooks";
import { isAgentOsServerMode } from "@/app/lib/agents/persistence/mode";
import { agentsStore } from "../store";
import { capabilitySummary, createWorker, updateWorker } from "../workforce/workers";
import type { WorkerStatus } from "../types";

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER_COMMUNICATION: "Customer Communication",
  SALES: "Sales",
  MARKETING: "Marketing",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  EXECUTIVE: "Executive",
};

export function WorkforcePanel(): JSX.Element {
  const t = useT();
  const aos = useAgentOperatingSystem();
  const [error, setError] = useState<string | null>(null);
  const workers = aos.workers ?? [];
  const goals = aos.businessGoals;

  const addCommunication = () => {
    if (!aos.organizationId) return;
    setError(null);
    if (isAgentOsServerMode()) {
      void (async () => {
        try {
          const response = await fetch("/api/v1/agents/workforce/communication", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: "{}",
          });
          if (!response.ok) throw new Error("agents.workforce.createFailed");
          await agentsStore.flushPersistence();
          await agentsStore.hydrateAsync({
            force: true,
            forceOrgSwitch: true,
            organizationId: aos.organizationId,
          });
        } catch {
          setError(t("agents.workforce.createFailed"));
        }
      })();
      return;
    }
    try {
      createWorker({
        organizationId: aos.organizationId,
        actorId: aos.userId ?? "signed-in-user",
        role: "CUSTOMER_COMMUNICATION",
        name: "Customer Communication Worker",
        status: "ACTIVE",
      });
    } catch {
      setError(t("agents.workforce.createFailed"));
    }
  };

  const setStatus = (workerId: string, status: WorkerStatus) => {
    if (!aos.organizationId) return;
    updateWorker({
      organizationId: aos.organizationId,
      actorId: aos.userId ?? "signed-in-user",
      workerId,
      status,
    });
  };

  return (
    <Card className="space-y-3" padding="20px" hover={false}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("agents.workforce.title")}
        </h2>
        <p className="text-sm" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.workforce.subtitle")}
        </p>
      </div>
      {workers.length === 0 ? (
        <Button size="sm" variant="secondary" onClick={addCommunication} data-testid="workforce-add-communication">
          {t("agents.workforce.addCommunication")}
        </Button>
      ) : null}
      <ul className="space-y-3" data-testid="workforce-list">
        {workers.map((worker) => {
          const assigned = goals.filter((goal) => goal.workerId === worker.id);
          const active = assigned.filter((goal) => goal.status === "active").length;
          const completed = assigned.filter((goal) => goal.status === "completed").length;
          return (
            <li key={worker.id} className="space-y-1 rounded-md border px-3 py-2" data-testid="workforce-worker" data-worker-status={worker.status} data-worker-role={worker.role}>
              <p className="text-sm" style={{ color: "var(--agx-text, #f8fafc)" }}>{worker.name}</p>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Role: {ROLE_LABEL[worker.role] ?? worker.role}
                {" · "}
                Status: {worker.status}
              </p>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Capabilities: {capabilitySummary(worker).join(", ") || "None"}
              </p>
              <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
                Goals: {active} active, {completed} completed
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {worker.status !== "ACTIVE" ? (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(worker.id, "ACTIVE")}>Activate</Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(worker.id, "PAUSED")}>Pause</Button>
                )}
                {worker.status !== "DISABLED" ? (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(worker.id, "DISABLED")}>Disable</Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>{error}</p> : null}
    </Card>
  );
}
