"use client";

import { useEffect, useState, type JSX } from "react";
import type { MarketingPlanDocument } from "../marketing/planSchema";
import { agentsStore } from "../store";

interface AttentionClaim {
  readonly text: string;
  readonly reason: string;
  readonly action: string;
}

interface ClaimGateView {
  readonly result: "PASS" | "BLOCKED" | "EDIT_REQUIRED";
  readonly customerMessage: string;
  readonly claims: readonly AttentionClaim[];
}

export function marketingDraftFingerprint(plan: Pick<MarketingPlanDocument, "strategy" | "audience" | "offer" | "contentThemes" | "contentItems">): string {
  return JSON.stringify({
    strategy: plan.strategy,
    audience: plan.audience,
    offer: plan.offer,
    contentThemes: plan.contentThemes,
    contentItems: plan.contentItems,
  });
}

export function MarketingClaimNotice({
  plan,
  planId,
  onResult,
}: {
  readonly plan: MarketingPlanDocument;
  readonly planId: string;
  readonly onResult?: (result: "PASS" | "BLOCKED" | "EDIT_REQUIRED" | "UNCHECKED", fingerprint: string) => void;
}): JSX.Element {
  const [view, setView] = useState<ClaimGateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fingerprint = marketingDraftFingerprint(plan);

  useEffect(() => {
    let cancelled = false;
    void agentsStore.flushPersistence().then(() => fetch("/api/v1/agents/marketing/claim-gate", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId, plan }),
    }))
      .then(async (response) => {
        const body = (await response.json()) as { ok?: boolean; error?: string; claimGate?: ClaimGateView };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.claimGate) {
          setError(body.error ?? "Claims could not be checked.");
          setView(null);
          onResult?.("UNCHECKED", fingerprint);
          return;
        }
        setError(null);
        setView(body.claimGate);
        onResult?.(body.claimGate.result, fingerprint);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Claims could not be checked.");
        setView(null);
        onResult?.("UNCHECKED", fingerprint);
      });
    return () => {
      cancelled = true;
    };
  }, [fingerprint, onResult, plan, planId]);

  return (
    <div className="space-y-2" data-testid="marketing-claim-gate">
      {error ? <p className="text-sm">{error}</p> : null}
      {view ? (
        <div className="space-y-2">
          <p className="text-sm" data-claim-result={view.result}>{view.customerMessage}</p>
          {view.claims.map((claim) => (
            <div key={claim.text} className="space-y-1 rounded-md border p-2" style={{ borderColor: "var(--agx-border, #334155)" }}>
              <p className="text-sm">Claim: {claim.text}</p>
              <p className="text-sm">Reason: {claim.reason}</p>
              <p className="text-sm">{claim.action}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
