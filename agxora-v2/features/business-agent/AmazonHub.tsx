"use client";

import { useEffect, useState, type JSX } from "react";
import { ModulePanel } from "@/app/components/ModulePanel";
import { useT } from "@/app/lib/i18n";

type AmazonCapability = {
  readonly planAccess?: boolean;
  readonly connected?: boolean;
  readonly canRead?: boolean;
  readonly configured?: boolean;
  readonly environment?: string;
  readonly canAnalyze?: boolean;
  readonly missingSteps?: readonly { readonly code: string; readonly message: string }[];
};

type AnalyzeResult = {
  readonly source?: string;
  readonly marketplaceCount?: number;
  readonly listingCount?: number;
  readonly lowInventory?: readonly { readonly sellerSku?: string; readonly totalQuantity?: number }[];
  readonly listingsNeedingAttention?: readonly { readonly sku?: string; readonly itemName?: string }[];
  readonly sales?: readonly { readonly orderCount?: number; readonly unitCount?: number }[];
  readonly errors?: readonly string[];
  readonly kind?: string;
  readonly reason?: string;
};

export function AmazonHub(): JSX.Element {
  const t = useT();
  const [capability, setCapability] = useState<AmazonCapability | null>(null);
  const [safeMode, setSafeMode] = useState("SAFE");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amazonQuery] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("amazon");
  });

  const callbackNotice =
    amazonQuery === "denied"
      ? t("businessAgent.amazonDenied")
      : amazonQuery === "error"
        ? t("businessAgent.amazonError")
        : amazonQuery === "connected"
          ? t("businessAgent.amazonConnected")
          : null;

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/integrations/amazon_seller/status", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([statusRes, policyRes]) => {
        if (/access_token|refresh_token|Atza\||Atzr\|/i.test(JSON.stringify(statusRes))) {
          throw new Error(t("businessAgent.loadFailed"));
        }
        setCapability(statusRes.ok === false ? null : statusRes);
        if (statusRes.ok === false) {
          setError(statusRes.message || t("businessAgent.loadFailed"));
        }
        setSafeMode(policyRes.policy?.mode ?? "SAFE");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
      });
  }, [t]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/amazon_seller/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectPath: "/dashboard/amazon" }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        authorizationUrl?: string;
        message?: string;
      };
      if (/access_token|refresh_token|Atza\||Atzr\|/i.test(JSON.stringify(body))) {
        throw new Error(t("businessAgent.loadFailed"));
      }
      if (!response.ok || body.ok === false || !body.authorizationUrl) {
        throw new Error(body.message || t("businessAgent.connectFailed"));
      }
      window.location.assign(body.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.connectFailed"));
      setBusy(false);
    }
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/integrations/amazon_seller/analyze", {
        credentials: "include",
      });
      const body = (await response.json()) as AnalyzeResult & { ok?: boolean; message?: string };
      if (/access_token|refresh_token|Atza\||Atzr\|/i.test(JSON.stringify(body))) {
        throw new Error(t("businessAgent.loadFailed"));
      }
      if (!response.ok || body.ok === false || body.kind === "failed" || body.kind === "unsupported") {
        throw new Error(body.message || body.reason || t("businessAgent.loadFailed"));
      }
      setAnalysis(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const canConnect =
    Boolean(capability?.planAccess) &&
    Boolean(capability?.configured) &&
    !capability?.connected;
  const canAnalyze = Boolean(capability?.canAnalyze);

  return (
    <ModulePanel
      title={t("businessAgent.amazonHubTitle")}
      description={t("businessAgent.amazonHubLead")}
    >
      {error || callbackNotice ? (
        <p role="alert">{error || callbackNotice}</p>
      ) : null}
      <p>{t("businessAgent.amazonReadOnly")}</p>
      <p>{t("businessAgent.amazonHumanVerification")}</p>
      <p>{t("businessAgent.amazonAdsOutOfScope")}</p>
      <p>
        {t("businessAgent.autonomyMode")}: <strong>{safeMode}</strong>
        {safeMode === "SAFE" ? ` · ${t("businessAgent.amazonSafeMode")}` : ""}
      </p>
      {capability?.environment === "sandbox" ? (
        <p>{t("businessAgent.amazonSandboxMode")}</p>
      ) : null}
      <p>
        {capability?.connected
          ? t("businessAgent.amazonReadyConnected")
          : t("businessAgent.amazonNotConnected")}
      </p>
      {capability?.missingSteps?.map((step) => (
        <p key={step.code}>{step.message}</p>
      ))}
      <p>{t("businessAgent.amazonExamples")}</p>
      {canConnect ? (
        <button type="button" disabled={busy} onClick={() => void connect()}>
          {t("businessAgent.amazonConnectCta")}
        </button>
      ) : null}
      <button type="button" disabled={busy || !canAnalyze} onClick={() => void analyze()}>
        {t("businessAgent.analyzeAmazon")}
      </button>
      {!analysis ? <p>{t("businessAgent.noAmazonData")}</p> : null}
      {analysis ? (
        <div>
          <p>
            {t("businessAgent.amazonListings")}: {analysis.listingCount ?? 0}
          </p>
          <p>
            {t("businessAgent.amazonMarketplaces")}: {analysis.marketplaceCount ?? 0}
          </p>
          <p>
            {t("businessAgent.amazonLowInventory")}: {analysis.lowInventory?.length ?? 0}
          </p>
          <p>
            {t("businessAgent.amazonNeedsAttention")}: {analysis.listingsNeedingAttention?.length ?? 0}
          </p>
          {analysis.errors && analysis.errors.length > 0 ? (
            <p>{analysis.errors.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
    </ModulePanel>
  );
}
