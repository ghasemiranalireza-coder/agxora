"use client";

import { useCallback, useState, type DragEvent, type JSX } from "react";
import type { ProcessingStageStatus, UploadJob } from "../../lib/finance";
import { formatDate, stageLabel } from "../../lib/finance";
import { useLocale } from "../../lib/i18n";
import { FinanceBadge, FinanceButton, FinanceGlassCard } from "./FinancePrimitives";

function stageTone(
  status: ProcessingStageStatus,
): "default" | "positive" | "warning" | "critical" | "accent" {
  switch (status) {
    case "complete":
      return "positive";
    case "running":
      return "accent";
    case "failed":
      return "critical";
    case "pending":
      return "warning";
    default:
      return "default";
  }
}

const STAGE_KEYS = [
  ["ocr", "ocr"],
  ["extraction", "extraction"],
  ["categorization", "categorization"],
  ["duplicateDetection", "duplicateDetection"],
] as const;

export function AiInvoiceProcessing({
  jobs,
}: {
  readonly jobs: readonly UploadJob[];
}): JSX.Element {
  const { t } = useLocale();
  const [dragging, setDragging] = useState(false);
  const [localJobs, setLocalJobs] = useState<UploadJob[]>([...jobs]);
  const [messageKey, setMessageKey] = useState<
    "dropHint" | "filesStaged" | "emailReserved"
  >("dropHint");
  const [stagedCount, setStagedCount] = useState(0);

  const message =
    messageKey === "filesStaged"
      ? t("finance.processing.filesStaged", { count: stagedCount })
      : t(`finance.processing.${messageKey}`);

  const enqueueFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: UploadJob[] = Array.from(files).map((file, index) => {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      return {
        id: `local-${Date.now()}-${index}`,
        fileName: file.name,
        source: isPdf ? "pdf" : "image",
        ocr: "pending",
        extraction: "pending",
        categorization: "pending",
        duplicateDetection: "pending",
        uploadedAt: new Date().toISOString(),
      };
    });
    setLocalJobs((prev) => [...next, ...prev]);
    setStagedCount(next.length);
    setMessageKey("filesStaged");
  }, []);

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    enqueueFiles(event.dataTransfer.files);
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <FinanceGlassCard className="xl:col-span-2" padding="p-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition-colors"
          style={{
            borderColor: dragging
              ? "var(--agx-accent, #22d3ee)"
              : "var(--agx-card-border, rgba(255,255,255,0.16))",
            background: dragging
              ? "color-mix(in srgb, var(--agx-accent, #22d3ee) 10%, transparent)"
              : "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-base font-medium"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {t("finance.processing.dropTitle")}
          </p>
          <p
            className="mt-2 max-w-sm text-sm"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {t("finance.processing.dropFormats")}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <label className="cursor-pointer">
              <span
                className="inline-flex rounded-xl border px-3.5 py-2 text-sm font-medium"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--agx-accent, #22d3ee) 45%, transparent)",
                  background:
                    "color-mix(in srgb, var(--agx-accent, #22d3ee) 18%, transparent)",
                  color: "var(--agx-accent, #22d3ee)",
                }}
              >
                {t("finance.processing.uploadFiles")}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                className="hidden"
                onChange={(e) => enqueueFiles(e.target.files)}
              />
            </label>
            <FinanceButton onClick={() => setMessageKey("emailReserved")}>
              {t("finance.processing.emailImport")}
            </FinanceButton>
          </div>
          <p
            className="mt-4 text-xs"
            style={{ color: "var(--agx-text-muted, #94a3b8)" }}
          >
            {message}
          </p>
        </div>
      </FinanceGlassCard>

      <FinanceGlassCard className="xl:col-span-3" padding="p-5">
        <h3
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--agx-text, #f8fafc)" }}
        >
          {t("finance.processing.pipelineTitle")}
        </h3>
        <ul className="space-y-3">
          {localJobs.map((job) => (
            <li
              key={job.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "var(--agx-card-border, rgba(255,255,255,0.08))",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--agx-text, #f8fafc)" }}
                  >
                    {job.fileName}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {job.source.toUpperCase()} · {formatDate(job.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STAGE_KEYS.map(([labelKey, statusKey]) => (
                  <div key={labelKey} className="space-y-1">
                    <p
                      className="text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                    >
                      {t(`finance.processing.stages.${labelKey}`)}
                    </p>
                    <FinanceBadge tone={stageTone(job[statusKey])}>
                      {t(stageLabel(job[statusKey]))}
                    </FinanceBadge>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </FinanceGlassCard>
    </div>
  );
}
