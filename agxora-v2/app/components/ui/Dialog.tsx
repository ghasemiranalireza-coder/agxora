"use client";

import { useEffect, type JSX, type ReactNode } from "react";

/**
 * Reusable modal dialog — Escape + backdrop close.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
}): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,16,0.62)" }}
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[24px] border p-5 shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
        style={{
          borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
          background:
            "linear-gradient(165deg, var(--agx-card-bg-from, rgba(18,24,38,0.98)), var(--agx-card-bg-to, rgba(10,14,24,0.98)))",
          backdropFilter: "var(--agx-card-blur, blur(22px))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--agx-text, #f8fafc)" }}
          >
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg border px-2.5 py-1 text-sm"
            style={{
              borderColor: "var(--agx-card-border, rgba(255,255,255,0.12))",
              color: "var(--agx-text-muted, #94a3b8)",
              background: "transparent",
            }}
          >
            Esc
          </button>
        </div>
        {children}
        {footer ? (
          <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
