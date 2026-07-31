"use client";

import type { JSX } from "react";
import { useToasts, useToast } from "@/app/lib/backend/hooks";
import type { ToastTone } from "@/app/lib/backend/notifications";

const TONE_STYLE: Record<
  ToastTone,
  { readonly border: string; readonly label: string }
> = {
  success: { border: "rgba(52, 211, 153, 0.45)", label: "Success" },
  warning: { border: "rgba(251, 191, 36, 0.45)", label: "Warning" },
  error: { border: "rgba(248, 113, 113, 0.5)", label: "Error" },
  info: { border: "rgba(56, 189, 248, 0.45)", label: "Info" },
};

/**
 * Global toast host — fixed overlay, does not alter module layouts.
 * Empty queue renders a stable empty region (SSR/client identical).
 */
export function ToastHost(): JSX.Element {
  const toasts = useToasts();
  const { dismiss } = useToast();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-end gap-2 p-4 sm:p-6"
      aria-live="polite"
      aria-relevant="additions"
      data-toast-count={toasts.length}
    >
      {toasts.map((toast) => {
        const tone = TONE_STYLE[toast.tone];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md"
            style={{
              background:
                "color-mix(in srgb, var(--agx-panel-bg, #0f172a) 92%, transparent)",
              borderColor: tone.border,
              color: "var(--agx-text, #f8fafc)",
            }}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                >
                  {tone.label}
                </p>
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description ? (
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--agx-text-muted, #94a3b8)" }}
                  >
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 text-xs opacity-70 hover:opacity-100"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
