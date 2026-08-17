"use client";

import type { JSX } from "react";
import { useToasts, useToast } from "@/app/lib/backend/hooks";
import type { ToastTone } from "@/app/lib/backend/notifications";
import { OVERLAY_Z } from "@/app/components/ui/overlayStack";
import { useT } from "@/app/lib/i18n";

const TONE_KEYS: Record<ToastTone, string> = {
  success: "backend.toast.success",
  warning: "backend.toast.warning",
  error: "backend.toast.error",
  info: "backend.toast.info",
};

const TONE_BORDER: Record<ToastTone, string> = {
  success: "color-mix(in srgb, var(--agx-ds-success, #34d399) 45%, transparent)",
  warning: "color-mix(in srgb, var(--agx-ds-warning, #fbbf24) 45%, transparent)",
  error: "color-mix(in srgb, var(--agx-ds-danger, #fb7185) 50%, transparent)",
  info: "color-mix(in srgb, var(--agx-ds-accent) 45%, transparent)",
};

/**
 * Global toast host — fixed overlay, does not alter module layouts.
 * Empty queue renders a stable empty region (SSR/client identical).
 */
export function ToastHost(): JSX.Element {
  const t = useT();
  const toasts = useToasts();
  const { dismiss } = useToast();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 flex flex-col items-end gap-2 p-4 sm:p-6"
      style={{ zIndex: OVERLAY_Z.toast }}
      aria-live="polite"
      aria-relevant="additions text"
      data-toast-count={toasts.length}
    >
      {toasts.map((toast) => {
        const border = TONE_BORDER[toast.tone];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg"
            style={{
              background: "var(--agx-ds-elevated)",
              borderColor: border,
              color: "var(--agx-ds-text)",
              boxShadow: "var(--agx-ds-shadow-md)",
            }}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-atomic="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--agx-ds-text-muted)" }}
                >
                  {t(TONE_KEYS[toast.tone])}
                </p>
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description ? (
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--agx-ds-text-muted)" }}
                  >
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs opacity-70 hover:opacity-100"
                onClick={() => dismiss(toast.id)}
                aria-label={t("backend.toast.dismiss")}
              >
                {t("backend.toast.close")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
