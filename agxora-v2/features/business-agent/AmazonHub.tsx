"use client";

import { useEffect, useState, type JSX } from "react";
import { ModulePanel } from "@/app/components/ModulePanel";
import { useT } from "@/app/lib/i18n";

type AmazonIntegration = {
  readonly connected: boolean;
  readonly accountLabel: string | null;
  readonly permissions: { readonly canRead: boolean };
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
  const [amazon, setAmazon] = useState<AmazonIntegration | null>(null);
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
        : null;

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/integrations", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/v1/agent-policy", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([integrationsRes, policyRes]) => {
        const amazonRow = (integrationsRes.integrations ?? []).find(
          (row: { provider: string }) => row.provider === "amazon_seller",
        );
        setAmazon(amazonRow ?? null);
        setSafeMode(policyRes.policy?.mode ?? "SAFE");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("businessAgent.loadFailed"));
      });
  }, [t]);

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

  return (
    <ModulePanel
      title={t("businessAgent.amazonHubTitle")}
      description={t("businessAgent.amazonHubLead")}
    >
      {error || callbackNotice ? (
        <p role="alert">{error || callbackNotice}</p>
      ) : null}
      <p>{t("businessAgent.amazonReadOnly")}</p>
      <p>{t("businessAgent.amazonAdsOutOfScope")}</p>
      <p>
        {t("businessAgent.autonomyMode")}: <strong>{safeMode}</strong>
        {safeMode === "SAFE" ? ` · ${t("businessAgent.amazonSafeMode")}` : ""}
      </p>
      <p>
        {amazon?.connected
          ? `${t("businessAgent.connected")}${amazon.accountLabel ? ` · ${amazon.accountLabel}` : ""}`
          : t("businessAgent.amazonNotConnected")}
      </p>
      <p>{t("businessAgent.amazonExamples")}</p>
      <button
        type="button"
        disabled={busy || !amazon?.connected || !amazon.permissions.canRead}
        onClick={() => void analyze()}
      >
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
