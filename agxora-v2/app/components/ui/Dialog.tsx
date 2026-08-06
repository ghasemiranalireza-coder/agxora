"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type JSX,
  type ReactNode,
} from "react";

/**
 * Reusable modal dialog — Escape, backdrop close, focus trap, restore focus.
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const focusFirst = useCallback((): void => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const target = focusable[0] ?? panel;
    target.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
    const frame = window.requestAnimationFrame(() => focusFirst());

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, focusFirst]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,16,0.62)" }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`max-h-[90vh] w-full overflow-y-auto border outline-none ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          padding: "var(--agx-ds-space-5)",
          borderColor: "var(--agx-ds-border)",
          background:
            "linear-gradient(165deg, var(--agx-card-bg-from, rgba(18,24,38,0.98)), var(--agx-card-bg-to, rgba(10,14,24,0.98)))",
          backdropFilter: "var(--agx-card-blur, blur(22px))",
          boxShadow: "var(--agx-ds-shadow-lg)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3
            id={titleId}
            className="text-lg font-semibold"
            style={{ color: "var(--agx-ds-text)" }}
          >
            {title}
          </h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: "var(--agx-ds-border)",
              color: "var(--agx-ds-text-muted)",
              background: "transparent",
              outlineColor: "var(--agx-ds-accent)",
              minHeight: "var(--agx-ds-control-h-sm)",
            }}
          >
            Esc
          </button>
        </div>
        {children}
        {footer ? (
          <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
