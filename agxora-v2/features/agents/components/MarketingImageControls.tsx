"use client";

import { useEffect, useState, type JSX } from "react";
import { Button } from "@/app/components/ui";
import { useT } from "@/app/lib/i18n";

interface ImageItem {
  readonly day: number;
  readonly theme: string;
}

interface ImageResult {
  readonly executionId?: string;
  readonly status?: string;
  readonly approval?: string;
  readonly previewPath?: string;
  readonly replayed?: boolean;
  readonly published?: boolean;
}

export function MarketingImageControls(props: {
  readonly goalId: string;
  readonly planId: string;
  readonly planRecordId: string;
  readonly items: readonly ImageItem[];
}): JSX.Element {
  const t = useT();
  const [day, setDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function loadPreview(path: string): Promise<void> {
    const response = await fetch(path, { credentials: "include" });
    if (!response.ok) {
      setError(t("agents.businessGoal.marketing.image.previewFailed"));
      return;
    }
    const blob = await response.blob();
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
  }

  async function post(path: string, body: Record<string, unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
        replayed?: boolean;
        ambiguous?: boolean;
        result?: ImageResult;
      } | null;
      if (!response.ok || !payload?.ok || !payload.result) {
        if (payload?.ambiguous) setResult({ status: "AMBIGUOUS" });
        setError(payload?.error || payload?.message || t("agents.businessGoal.marketing.image.failed"));
        return;
      }
      const next = { ...payload.result, replayed: payload.replayed === true || payload.result.replayed === true };
      setResult(next);
      if (next.status === "COMPLETED" && next.previewPath && next.approval !== "rejected") {
        await loadPreview(next.previewPath);
      }
      if (next.approval === "rejected") {
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
      }
    } catch {
      setError(t("agents.businessGoal.marketing.image.failed"));
    } finally {
      setBusy(false);
    }
  }

  const selected = props.items.find((item) => item.day === day);
  const base = {
    goalId: props.goalId,
    planId: props.planId,
    planRecordId: props.planRecordId,
    day,
  };

  return (
    <div className="space-y-2" data-testid="marketing-image-controls">
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("agents.businessGoal.marketing.image.generateSpend")}
      </p>
      <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("agents.businessGoal.marketing.image.approvalHuman")}
      </p>
      <div className="flex flex-wrap gap-2">
        {props.items.map((item) => (
          <Button
            key={item.day}
            size="sm"
            variant={day === item.day ? "secondary" : "ghost"}
            disabled={busy}
            onClick={() => {
              setDay(item.day);
              setResult(null);
              setError(null);
              setPreviewUrl((current) => {
                if (current) URL.revokeObjectURL(current);
                return null;
              });
            }}
          >
            {t("agents.businessGoal.marketing.day", { day: item.day })}
          </Button>
        ))}
      </div>
      {selected ? (
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {selected.theme}
        </p>
      ) : (
        <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.businessGoal.marketing.image.select")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || day === null || Boolean(result?.executionId)}
          onClick={() => {
            if (day === null) return;
            void post("/api/v1/agents/marketing/image/generate", { ...base, day, action: "generate" });
          }}
        >
          {t("agents.businessGoal.marketing.image.generate")}
        </Button>
        {result?.executionId && result.status === "COMPLETED" && result.approval !== "approved" && result.approval !== "rejected" ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void post("/api/v1/agents/marketing/image/approve", { executionId: result.executionId })}
            >
              {t("agents.businessGoal.marketing.image.approve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void post("/api/v1/agents/marketing/image/reject", { executionId: result.executionId })}
            >
              {t("agents.businessGoal.marketing.image.reject")}
            </Button>
          </>
        ) : null}
        {result?.executionId ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || day === null}
            onClick={() => {
              if (day === null || !result.executionId) return;
              void post("/api/v1/agents/marketing/image/regenerate", {
                ...base,
                day,
                action: "regenerate",
                priorExecutionId: result.executionId,
              });
            }}
          >
            {t("agents.businessGoal.marketing.image.regenerate")}
          </Button>
        ) : null}
      </div>
      <p className="text-xs" data-testid="marketing-image-regenerate-note" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("agents.businessGoal.marketing.image.regenerateNote")}
      </p>
      <p className="text-xs" data-testid="marketing-image-reject-note" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
        {t("agents.businessGoal.marketing.image.rejectNote")}
      </p>
      {result?.status === "FAILED" ? (
        <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>
          {t("agents.businessGoal.marketing.image.failed")}
        </p>
      ) : null}
      {result?.status === "AMBIGUOUS" ? (
        <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>
          {t("agents.businessGoal.marketing.image.ambiguous")}
        </p>
      ) : null}
      {previewUrl ? (
        <div className="space-y-1" data-testid="marketing-image-preview">
          {/* Session blob preview. The bytes are not a remote image Next can optimize. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={t("agents.businessGoal.marketing.image.preview")} className="max-w-full rounded-md" />
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.businessGoal.marketing.image.preview")}
          </p>
          <p className="text-xs" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
            {t("agents.businessGoal.marketing.image.noPerformance")}
          </p>
        </div>
      ) : null}
      {result?.approval === "approved" ? (
        <p className="text-xs" data-testid="marketing-image-approved" style={{ color: "var(--agx-text, #f8fafc)" }}>
          {t("agents.businessGoal.marketing.image.approved")}
        </p>
      ) : null}
      {result?.approval === "rejected" ? (
        <p className="text-xs" data-testid="marketing-image-rejected" style={{ color: "var(--agx-text-muted, #94a3b8)" }}>
          {t("agents.businessGoal.marketing.image.rejected")}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs" style={{ color: "var(--agx-danger, #f87171)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
