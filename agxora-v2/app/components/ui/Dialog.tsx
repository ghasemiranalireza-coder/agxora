"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type JSX,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  isTopOverlay,
  lockBodyScroll,
  OVERLAY_Z,
  pushOverlay,
} from "./overlayStack";

/**
 * AGXORA Dialog — single modal primitive.
 * Portals to document.body (outside dashboard isolation / page-enter opacity).
 * Owns Escape only when topmost; locks body scroll; focus traps; solid panel
 * (no backdrop-filter) so native selects paint above the panel.
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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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

    const close = (): void => onCloseRef.current();
    const pop = pushOverlay(close);
    const unlock = lockBodyScroll();
    const frame = window.requestAnimationFrame(() => focusFirst());

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (!isTopOverlay(close)) return;
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      if (!isTopOverlay(close)) return;
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

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      pop();
      unlock();
      previouslyFocused.current?.focus?.();
    };
  }, [open, focusFirst]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="agx-ui-overlay fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: OVERLAY_Z.modal,
        background: "var(--agx-ds-scrim)",
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`agx-ui-dialog-panel max-h-[90vh] w-full overflow-y-auto border outline-none ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
        style={{
          borderRadius: "var(--agx-ds-radius-xl)",
          padding: "var(--agx-ds-space-5)",
          borderColor: "var(--agx-ds-border)",
          background: "var(--agx-ds-elevated)",
          boxShadow: "var(--agx-ds-shadow-lg)",
          color: "var(--agx-ds-text)",
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
              background: "var(--agx-ds-surface)",
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
    </div>,
    document.body,
  );
}
