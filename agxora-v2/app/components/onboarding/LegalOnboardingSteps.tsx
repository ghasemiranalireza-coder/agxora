"use client";

import { useEffect, useState, type JSX } from "react";
import { catalogCopy, useT } from "../../lib/i18n";

type LegalStep = 0 | 1 | 2 | 3;

export function LegalOnboardingSteps({
  onComplete,
}: {
  readonly onComplete: () => void;
}): JSX.Element | null {
  const t = useT();
  const [step, setStep] = useState<LegalStep | null>(null);
  const [acceptAgb, setAcceptAgb] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/legal/acceptances", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          agbAccepted?: boolean;
          privacyAcknowledged?: boolean;
          reacceptanceRequired?: boolean;
        };
      })
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          onComplete();
          return;
        }
        if (payload.agbAccepted && payload.privacyAcknowledged && !payload.reacceptanceRequired) {
          setStep(2);
          return;
        }
        setStep(0);
      })
      .catch(() => {
        if (!cancelled) onComplete();
      });
    return () => {
      cancelled = true;
    };
    // The acceptance check runs once. A new onComplete identity must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(authorizationType: "agb" | "privacy") {
    const response = await fetch("/api/v1/legal/acceptances", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationType }),
    });
    if (!response.ok) throw new Error("legal_acceptance_failed");
  }

  if (step === null || step === 3) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: "11px" }}>
        {step === 0
          ? catalogCopy(t, "onboarding.legal.agbTitle", "AGXORA AGB")
          : step === 1
            ? catalogCopy(t, "onboarding.legal.privacyTitle", "Datenschutz")
            : catalogCopy(t, "onboarding.legal.platformTitle", "Externe Plattform verbinden")}
      </p>
      {step === 0 ? (
        <label style={{ display: "flex", gap: "10px" }}>
          <input type="checkbox" checked={acceptAgb} onChange={(event) => setAcceptAgb(event.target.checked)} />
          <span>
            {catalogCopy(t, "onboarding.legal.agbCheckbox", "Ich akzeptiere die AGXORA AGB.")}{" "}
            <a href="/terms">{catalogCopy(t, "onboarding.legal.termsLink", "AGB")}</a>
          </span>
        </label>
      ) : null}
      {step === 1 ? (
        <label style={{ display: "flex", gap: "10px" }}>
          <input
            type="checkbox"
            checked={acknowledgePrivacy}
            onChange={(event) => setAcknowledgePrivacy(event.target.checked)}
          />
          <span>
            {catalogCopy(
              t,
              "onboarding.legal.privacyCheckbox",
              "Ich habe die Datenschutzinformationen zur Kenntnis genommen.",
            )}{" "}
            <a href="/privacy">{catalogCopy(t, "onboarding.legal.privacyLink", "Datenschutzerklärung")}</a>
          </span>
        </label>
      ) : null}
      {step === 2 ? (
        <p>
          {catalogCopy(
            t,
            "onboarding.legal.platformBody",
            "Connecting a platform is optional and is not included in AGB acceptance. Choose the account and permissions before OAuth starts.",
          )}{" "}
          <a href="/dashboard/settings#integrations">
            {catalogCopy(t, "onboarding.legal.platformLink", "Integrations")}
          </a>
        </p>
      ) : null}
      {error ? <p>{error}</p> : null}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        {step === 2 ? (
          <button type="button" onClick={onComplete}>
            {catalogCopy(t, "onboarding.legal.skip", "Skip")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || (step === 0 && !acceptAgb) || (step === 1 && !acknowledgePrivacy)}
          onClick={() => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                if (step === 0) {
                  await save("agb");
                  setStep(1);
                } else if (step === 1) {
                  await save("privacy");
                  setStep(2);
                } else {
                  onComplete();
                }
              } catch {
                setError(catalogCopy(t, "onboarding.legal.failed", "The confirmation could not be saved."));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {catalogCopy(t, "onboarding.legal.continue", "Continue")}
        </button>
      </div>
    </div>
  );
}
